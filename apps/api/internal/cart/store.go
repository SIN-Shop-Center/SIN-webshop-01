package cart

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

func (s *Store) UpsertItem(ctx context.Context, userID string, in AddItemInput) (*Item, error) {
	const query = `
insert into shop.cart_items (user_id, sku, variant_name, quantity, unit_price_amount, image_url)
values ($1, $2, $3, $4, $5, $6)
on conflict (user_id, sku)
do update set
  quantity = shop.cart_items.quantity + excluded.quantity,
  variant_name = excluded.variant_name,
  unit_price_amount = excluded.unit_price_amount,
  image_url = excluded.image_url,
  updated_at = now()
returning id::text, user_id::text, sku, variant_name, quantity, unit_price_amount, image_url, created_at, updated_at
`

	var out Item
	err := s.pool.QueryRow(ctx, query, userID, in.SKU, in.VariantName, in.Quantity, in.UnitPriceAmount, in.ImageURL).Scan(
		&out.ID,
		&out.UserID,
		&out.SKU,
		&out.VariantName,
		&out.Quantity,
		&out.UnitPriceAmount,
		&out.ImageURL,
		&out.CreatedAt,
		&out.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *Store) PatchItem(ctx context.Context, userID, sku string, quantity int) (*Item, error) {
	const query = `
update shop.cart_items
set quantity = $3, updated_at = now()
where user_id = $1 and sku = $2
returning id::text, user_id::text, sku, variant_name, quantity, unit_price_amount, image_url, created_at, updated_at
`

	var out Item
	err := s.pool.QueryRow(ctx, query, userID, sku, quantity).Scan(
		&out.ID,
		&out.UserID,
		&out.SKU,
		&out.VariantName,
		&out.Quantity,
		&out.UnitPriceAmount,
		&out.ImageURL,
		&out.CreatedAt,
		&out.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *Store) DeleteItem(ctx context.Context, userID, sku string) error {
	const query = `delete from shop.cart_items where user_id = $1 and sku = $2`
	_, err := s.pool.Exec(ctx, query, userID, sku)
	return err
}

func IsNotFound(err error) bool {
	return err == pgx.ErrNoRows
}
