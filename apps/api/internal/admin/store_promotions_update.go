package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) UpdatePromotion(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
	if codeRaw, ok := body["code"]; ok {
		code := strings.ToUpper(asString(codeRaw))
		if code != "" {
			var exists bool
			if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.promotions where code = $1 and id::text <> $2)`, code, id).Scan(&exists); err != nil {
				return nil, err
			}
			if exists {
				return nil, errDuplicate
			}
		}
		body["code"] = code
	}

	setParts := make([]string, 0, 20)
	args := make([]any, 0, 22)
	appendField := func(col, key string) {
		v, ok := body[key]
		if !ok {
			return
		}
		args = append(args, v)
		setParts = append(setParts, fmt.Sprintf("%s = $%d", col, len(args)))
	}

	appendField("name", "name")
	appendField("description", "description")
	appendField("type", "type")
	appendField("code", "code")
	appendField("discount_value", "discount_value")
	appendField("discount_percentage", "discount_percentage")
	appendField("minimum_order", "minimum_order")
	appendField("maximum_discount", "maximum_discount")
	appendField("usage_limit", "usage_limit")
	appendField("per_customer_limit", "per_customer_limit")
	appendField("start_date", "start_date")
	appendField("end_date", "end_date")
	appendField("is_active", "is_active")
	appendField("applies_to", "applies_to")
	appendField("category_ids", "category_ids")
	appendField("product_ids", "product_ids")
	appendField("banner_text", "banner_text")
	appendField("banner_color", "banner_color")
	appendField("banner_placement", "banner_placement")
	appendField("segment_scope", "segment_scope")

	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}

	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  update shop.promotions
  set %s
  where id::text = $%d
  returning id::text as id, name, description, type, code, discount_value, discount_percentage,
            minimum_order, maximum_discount, usage_limit, usage_count, per_customer_limit,
            start_date, end_date, is_active, applies_to, category_ids, product_ids,
            banner_text, banner_color, banner_placement, segment_scope, created_at, updated_at
) t
`, strings.Join(setParts, ",\n      "), len(args))

	return queryJSONObject(ctx, s.pool, query, args...)
}

func (s *Store) DeletePromotion(ctx context.Context, id string) error {
	cmd, err := s.pool.Exec(ctx, `delete from shop.promotions where id::text = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func toNullableInt(v any) any {
	if v == nil {
		return nil
	}
	if s, ok := v.(string); ok && strings.TrimSpace(s) == "" {
		return nil
	}
	return asInt(v, 0)
}
