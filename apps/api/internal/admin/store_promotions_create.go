package admin

import (
	"context"
	"strings"
	"time"
)

func (s *Store) CreatePromotion(ctx context.Context, body map[string]any) (map[string]any, error) {
	name := asString(body["name"])
	typ := asString(body["type"])
	if name == "" || typ == "" {
		return nil, errInvalidInput
	}

	code := strings.ToUpper(asString(body["code"]))
	if code != "" {
		var exists bool
		if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.promotions where code = $1)`, code).Scan(&exists); err != nil {
			return nil, err
		}
		if exists {
			return nil, errDuplicate
		}
	}

	const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.promotions (
    name, description, type, code, discount_value, discount_percentage,
    minimum_order, maximum_discount, usage_limit, usage_count, per_customer_limit,
    start_date, end_date, is_active, applies_to, category_ids, product_ids,
    banner_text, banner_color, banner_placement, segment_scope
  ) values (
    $1, $2, $3, nullif($4, ''), $5, $6,
    $7, $8, $9, 0, $10,
    $11, $12, $13, $14, coalesce($15::uuid[], '{}'::uuid[]), coalesce($16::uuid[], '{}'::uuid[]),
    $17, $18, $19, $20
  )
  returning id::text as id, name, description, type, code, discount_value, discount_percentage,
            minimum_order, maximum_discount, usage_limit, usage_count, per_customer_limit,
            start_date, end_date, is_active, applies_to, category_ids, product_ids,
            banner_text, banner_color, banner_placement, segment_scope, created_at, updated_at
) t
`

	return queryJSONObject(ctx, s.pool, query,
		name,
		asNullableString(body["description"]),
		typ,
		code,
		asFloat(body["discount_value"], 0),
		asFloat(body["discount_percentage"], 0),
		asFloat(body["minimum_order"], 0),
		toNullableFloat(body["maximum_discount"]),
		toNullableInt(body["usage_limit"]),
		toNullableInt(body["per_customer_limit"]),
		defaultTime(body["start_date"], time.Now().UTC()),
		body["end_date"],
		asBool(body["is_active"], true),
		defaultString(body["applies_to"], "all"),
		asStringSlice(body["category_ids"]),
		asStringSlice(body["product_ids"]),
		asNullableString(body["banner_text"]),
		defaultString(body["banner_color"], "#d946ef"),
		defaultString(body["banner_placement"], "all"),
		defaultString(body["segment_scope"], "all"),
	)
}

func defaultTime(v any, fallback time.Time) any {
	if v == nil {
		return fallback
	}
	if s, ok := v.(string); ok && strings.TrimSpace(s) == "" {
		return fallback
	}
	return v
}
