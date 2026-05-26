package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) CreateCustomer(ctx context.Context, body map[string]any) (map[string]any, error) {
	email := asString(body["email"])
	name := asString(body["name"])
	if email == "" || name == "" {
		return nil, errInvalidInput
	}

	var exists bool
	if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.customers where email = $1)`, email).Scan(&exists); err != nil {
		return nil, err
	}
	if exists {
		return nil, errDuplicate
	}

	const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.customers (email, name, phone, address)
  values ($1, $2, $3, $4)
  returning id::text as id, email, name, phone, address, metadata, created_at, updated_at
) t
`
	return queryJSONObject(ctx, s.pool, query, email, name, asNullableString(body["phone"]), body["address"])
}

func (s *Store) UpdateCustomer(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
	if email := asString(body["email"]); email != "" {
		var exists bool
		if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.customers where email = $1 and id::text <> $2)`, email, id).Scan(&exists); err != nil {
			return nil, err
		}
		if exists {
			return nil, errDuplicate
		}
	}

	setParts := make([]string, 0, 6)
	args := make([]any, 0, 8)
	appendField := func(col string, key string, nullable bool) {
		v, ok := body[key]
		if !ok {
			return
		}
		if nullable {
			args = append(args, asNullableString(v))
		} else {
			args = append(args, v)
		}
		setParts = append(setParts, fmt.Sprintf("%s = $%d", col, len(args)))
	}

	appendField("name", "name", false)
	appendField("email", "email", false)
	appendField("phone", "phone", true)
	appendField("address", "address", false)
	appendField("metadata", "metadata", false)

	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}
	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)

	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  update shop.customers
  set %s
  where id::text = $%d
  returning id::text as id, email, name, phone, address, metadata, created_at, updated_at
) t
`, strings.Join(setParts, ",\n      "), len(args))

	return queryJSONObject(ctx, s.pool, query, args...)
}

func (s *Store) DeleteCustomer(ctx context.Context, id string) error {
	var orderCount int
	if err := s.pool.QueryRow(ctx, `select count(*) from shop.orders where customer_id::text = $1`, id).Scan(&orderCount); err != nil {
		return err
	}
	if orderCount > 0 {
		return errBlocked
	}

	cmd, err := s.pool.Exec(ctx, `delete from shop.customers where id::text = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
