package account

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

func (s *Store) PatchByUserID(ctx context.Context, userID string, in UpdateInput) (*Profile, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const updateProfileQuery = `
update shop.profiles
set
  first_name = coalesce($2, first_name),
  last_name = coalesce($3, last_name),
  updated_at = now()
where id = $1
`
	if _, err := tx.Exec(ctx, updateProfileQuery, userID, in.FirstName, in.LastName); err != nil {
		return nil, err
	}

	metadataPatch := map[string]string{}
	if in.CompanyName != nil {
		metadataPatch["company_name"] = *in.CompanyName
	}
	if in.VATID != nil {
		metadataPatch["vat_id"] = *in.VATID
	}
	if in.PurchaseOrderRef != nil {
		metadataPatch["purchase_order_ref"] = *in.PurchaseOrderRef
	}
	metadataRaw, err := json.Marshal(metadataPatch)
	if err != nil {
		return nil, err
	}

	const updateCustomerQuery = `
update shop.customers
set
  name = coalesce($2, name),
  phone = coalesce($3, phone),
  metadata = metadata || $4::jsonb,
  updated_at = now()
where auth_user_id = $1
`
	result, err := tx.Exec(ctx, updateCustomerQuery, userID, in.Name, in.Phone, string(metadataRaw))
	if err != nil {
		return nil, err
	}

	if result.RowsAffected() == 0 {
		if err := s.insertCustomerFallback(ctx, tx, userID, in, string(metadataRaw)); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetByUserID(ctx, userID)
}

func (s *Store) insertCustomerFallback(ctx context.Context, tx pgx.Tx, userID string, in UpdateInput, metadataRaw string) error {
	const emailQuery = `select email from shop.profiles where id = $1 limit 1`
	var email string
	if err := tx.QueryRow(ctx, emailQuery, userID).Scan(&email); err != nil {
		return err
	}

	const insertQuery = `
insert into shop.customers (auth_user_id, email, name, phone, metadata)
values ($1, $2, $3, $4, $5::jsonb)
`
	_, err := tx.Exec(ctx, insertQuery, userID, email, in.Name, in.Phone, metadataRaw)
	return err
}
