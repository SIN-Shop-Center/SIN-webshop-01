package orders

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) ListOrdersByUser(ctx context.Context, userID string, limit, offset int) ([]Order, error) {
	const query = `
select id::text, status, currency, total_amount, total, payment_status,
       tracking_number, tracking_url, created_at, updated_at
from shop.orders
where user_id = $1
order by created_at desc
limit $2 offset $3
`

	rows, err := s.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Order, 0, limit)
	for rows.Next() {
		var o Order
		if err := rows.Scan(
			&o.ID,
			&o.Status,
			&o.Currency,
			&o.TotalAmount,
			&o.Total,
			&o.PaymentStatus,
			&o.TrackingNumber,
			&o.TrackingURL,
			&o.CreatedAt,
			&o.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, o)
	}
	return items, rows.Err()
}

func (s *Store) GetOrderByUser(ctx context.Context, userID, orderID string) (*Order, error) {
	const orderQuery = `
select id::text, status, currency, total_amount, total, payment_status,
       tracking_number, tracking_url, created_at, updated_at
from shop.orders
where id::text = $1 and user_id = $2
limit 1
`

	var o Order
	err := s.pool.QueryRow(ctx, orderQuery, orderID, userID).Scan(
		&o.ID,
		&o.Status,
		&o.Currency,
		&o.TotalAmount,
		&o.Total,
		&o.PaymentStatus,
		&o.TrackingNumber,
		&o.TrackingURL,
		&o.CreatedAt,
		&o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	const itemQuery = `
select id::text, product_id::text, sku, title, variant, quantity, price, unit_price_amount
from shop.order_items
where order_id::text = $1
order by created_at asc
`
	rows, err := s.pool.Query(ctx, itemQuery, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]OrderItem, 0, 8)
	for rows.Next() {
		var item OrderItem
		if err := rows.Scan(
			&item.ID,
			&item.ProductID,
			&item.SKU,
			&item.Title,
			&item.Variant,
			&item.Quantity,
			&item.Price,
			&item.UnitPriceAmount,
		); err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	o.Items = list
	return &o, nil
}

func IsNotFound(err error) bool {
	return err == pgx.ErrNoRows
}
