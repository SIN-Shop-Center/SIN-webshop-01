package storefront

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) CreateSession(ctx context.Context, tokenHash string) (*SessionRecord, error) {
	const query = `
insert into shop.store_sessions (session_token_hash)
values ($1)
returning id::text, coalesce(email, '')
`
	var out SessionRecord
	if err := s.pool.QueryRow(ctx, query, tokenHash).Scan(&out.ID, &out.Email); err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *Store) GetSessionByTokenHash(ctx context.Context, tokenHash string) (*SessionRecord, error) {
	const query = `
select id::text, coalesce(email, '')
from shop.store_sessions
where session_token_hash = $1
`
	var out SessionRecord
	err := s.pool.QueryRow(ctx, query, tokenHash).Scan(&out.ID, &out.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &out, nil
}

func (s *Store) TouchSession(ctx context.Context, sessionID, email string) error {
	const query = `
update shop.store_sessions
set last_seen_at = now(),
    email = case
      when nullif($2, '') is null then email
      else $2
    end,
    updated_at = now()
where id = $1::uuid
`
	_, err := s.pool.Exec(ctx, query, sessionID, strings.TrimSpace(email))
	return err
}

func (s *Store) UpsertCartItem(ctx context.Context, sessionID, sku string, quantity int) error {
	const query = `
insert into shop.store_cart_items (session_id, product_id, sku, quantity)
select
  $1::uuid,
  p.id,
  coalesce(nullif(p.sku, ''), $2),
  $3
from shop.products p
where p.is_active = true
  and coalesce(nullif(p.sku, ''), '') = $2
on conflict (session_id, sku)
do update set
  product_id = excluded.product_id,
  quantity = excluded.quantity,
  updated_at = now()
`
	res, err := s.pool.Exec(ctx, query, sessionID, strings.TrimSpace(sku), quantity)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s *Store) DeleteCartItem(ctx context.Context, sessionID, sku string) error {
	const query = `delete from shop.store_cart_items where session_id = $1::uuid and sku = $2`
	_, err := s.pool.Exec(ctx, query, sessionID, strings.TrimSpace(sku))
	return err
}

func (s *Store) ClearCart(ctx context.Context, sessionID string) error {
	_, err := s.pool.Exec(ctx, `delete from shop.store_cart_items where session_id = $1::uuid`, sessionID)
	return err
}

func (s *Store) LoadCart(ctx context.Context, sessionID string) ([]CartItem, error) {
	const query = `
select
  p.id::text,
  coalesce(nullif(p.sku, ''), sci.sku) as sku,
  coalesce(nullif(p.slug, ''), '') as slug,
  coalesce(p.name, '') as title,
  coalesce(c.name, '') as category,
  coalesce(
    nullif(p.images->>0, ''),
    ''
  ) as image_url,
  least(greatest(sci.quantity, 1), greatest(p.stock, 1)) as quantity,
  round(p.price * 100)::int as unit_price_amount,
  least(greatest(sci.quantity, 1), greatest(p.stock, 1)) * round(p.price * 100)::int as line_total_amount,
  greatest(p.stock, 0) as stock
from shop.store_cart_items sci
join shop.products p on p.id = sci.product_id
left join shop.categories c on c.id = p.category_id
where sci.session_id = $1::uuid
  and p.is_active = true
order by sci.updated_at desc, sci.created_at desc
`
	rows, err := s.pool.Query(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]CartItem, 0)
	for rows.Next() {
		var item CartItem
		if err := rows.Scan(
			&item.ProductID,
			&item.SKU,
			&item.Slug,
			&item.Title,
			&item.Category,
			&item.ImageURL,
			&item.Quantity,
			&item.UnitPriceAmount,
			&item.LineTotalAmount,
			&item.Stock,
		); err != nil {
			return nil, err
		}
		if item.Stock <= 0 {
			continue
		}
		item.MaxQuantity = minInt(maxInt(item.Stock, 1), 20)
		item.Quantity = minInt(maxInt(item.Quantity, 1), item.MaxQuantity)
		item.LineTotalAmount = item.Quantity * item.UnitPriceAmount
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Store) AttachOrderToSession(ctx context.Context, orderID, sessionID, paymentMethod string) error {
	const query = `
update shop.orders
set storefront_session_id = $2::uuid,
    payment_method = nullif($3, ''),
    updated_at = now()
where id = $1::uuid
`
	_, err := s.pool.Exec(ctx, query, orderID, sessionID, strings.TrimSpace(paymentMethod))
	return err
}

func (s *Store) LoadOrderForStorefront(ctx context.Context, orderID, stripeSessionID string) (*OrderLookupResponse, error) {
	const orderQuery = `
select
  o.id::text,
  o.status,
  o.payment_status,
  coalesce(o.payment_method, ''),
  o.email,
  o.currency,
  o.created_at,
  coalesce(o.subtotal_amount, round(coalesce(o.subtotal, 0) * 100)::int),
  coalesce(o.shipping_amount, round(coalesce(o.shipping_cost, 0) * 100)::int),
  coalesce(o.total_amount, round(coalesce(o.total, 0) * 100)::int),
  o.shipping_method,
  coalesce(o.shipping_address, '{}'::jsonb)
from shop.checkout_sessions cs
join shop.orders o on o.id = cs.order_id
where o.id = $1::uuid
  and cs.stripe_session_id = $2
limit 1
`

	var out OrderLookupResponse
	var shippingRaw []byte
	err := s.pool.QueryRow(ctx, orderQuery, orderID, stripeSessionID).Scan(
		&out.OrderID,
		&out.Status,
		&out.PaymentStatus,
		&out.PaymentMethod,
		&out.Email,
		&out.Currency,
		&out.CreatedAt,
		&out.SubtotalAmount,
		&out.ShippingAmount,
		&out.TotalAmount,
		&out.ShippingMethod,
		&shippingRaw,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if len(shippingRaw) > 0 {
		_ = json.Unmarshal(shippingRaw, &out.ShippingAddress)
	}

	const itemQuery = `
select
  coalesce(oi.product_id::text, ''),
  coalesce(oi.sku, ''),
  coalesce(nullif(p.slug, ''), ''),
  coalesce(oi.title, p.name, ''),
  coalesce(c.name, ''),
  coalesce(nullif(oi.image_url, ''), nullif(p.images->>0, ''), ''),
  greatest(oi.quantity, 1),
  coalesce(oi.unit_price_amount, round(coalesce(oi.price, 0) * 100)::int)
from shop.order_items oi
left join shop.products p on p.id = oi.product_id
left join shop.categories c on c.id = p.category_id
where oi.order_id = $1::uuid
order by oi.created_at asc
`
	rows, err := s.pool.Query(ctx, itemQuery, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]CartItem, 0)
	for rows.Next() {
		var item CartItem
		if err := rows.Scan(
			&item.ProductID,
			&item.SKU,
			&item.Slug,
			&item.Title,
			&item.Category,
			&item.ImageURL,
			&item.Quantity,
			&item.UnitPriceAmount,
		); err != nil {
			return nil, err
		}
		item.LineTotalAmount = item.Quantity * item.UnitPriceAmount
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out.Items = items
	return &out, nil
}

func (s *Store) CreateAccessRequest(ctx context.Context, in AccessRequestInput) (string, error) {
	const query = `
with linked_customer as (
  select id, auth_user_id
  from shop.customers
  where lower(email) = lower($1)
  order by updated_at desc nulls last, created_at desc
  limit 1
)
insert into shop.store_access_requests (email, requested_role, note, customer_id, auth_user_id)
select
  $1,
  $2,
  nullif($3, ''),
  linked_customer.id,
  linked_customer.auth_user_id
from linked_customer
union all
select
  $1,
  $2,
  nullif($3, ''),
  null,
  null
where not exists (select 1 from linked_customer)
returning id::text
`
	var id string
	if err := s.pool.QueryRow(ctx, query, strings.TrimSpace(in.Email), strings.TrimSpace(in.Role), strings.TrimSpace(in.Note)).Scan(&id); err != nil {
		return "", err
	}
	return id, nil
}

func orderIDFromSessionSeed(seed string) string {
	namespace := uuid.MustParse("bb083f0e-9320-46e3-a508-081dcb2e99ba")
	return uuid.NewSHA1(namespace, []byte(seed)).String()
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
