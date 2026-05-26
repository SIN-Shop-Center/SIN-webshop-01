package admin

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) DeleteProduct(ctx context.Context, id string) error {
	cmd, err := s.pool.Exec(ctx, `delete from shop.products where id::text = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func toNullableFloat(v any) any {
	if v == nil {
		return nil
	}
	if s, ok := v.(string); ok && strings.TrimSpace(s) == "" {
		return nil
	}
	return asFloat(v, 0)
}
