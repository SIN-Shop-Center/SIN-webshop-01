package admin

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListPromotions(ctx context.Context, p PromotionListParams) ([]map[string]any, int, error) {
	where, args := promotionWhereClause(p)
	countQuery := "select count(*) from shop.promotions p where " + where

	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortCol := pickSortColumn(p.SortBy, "p.created_at", map[string]string{
		"created_at": "p.created_at",
		"updated_at": "p.updated_at",
		"name":       "p.name",
		"type":       "p.type",
		"start_date": "p.start_date",
		"end_date":   "p.end_date",
	})
	sortOrder := normalizeSortOrder(p.SortOrder)

	args = append(args, p.Limit, (p.Page-1)*p.Limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select p.id::text as id,
         p.name,
         p.description,
         p.type,
         p.code,
         p.discount_value,
         p.discount_percentage,
         p.minimum_order,
         p.maximum_discount,
         p.usage_limit,
         p.usage_count,
         p.per_customer_limit,
         p.start_date,
         p.end_date,
         p.is_active,
         p.applies_to,
         p.category_ids,
         p.product_ids,
         p.banner_text,
         p.banner_color,
         p.banner_placement,
         p.segment_scope,
         p.created_at,
         p.updated_at
  from shop.promotions p
  where %s
  order by %s %s
  limit $%d offset $%d
) t
`, where, sortCol, sortOrder, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func promotionWhereClause(p PromotionListParams) (string, []any) {
	where := []string{"1=1"}
	args := make([]any, 0, 4)

	if p.IsActive != nil {
		if *p.IsActive {
			where = append(where, "p.is_active = true", "p.start_date <= now()", "(p.end_date is null or p.end_date >= now())")
		} else {
			where = append(where, "p.is_active = false")
		}
	}
	if typ := strings.TrimSpace(p.Type); typ != "" {
		args = append(args, typ)
		where = append(where, fmt.Sprintf("p.type = $%d", len(args)))
	}

	return strings.Join(where, " and "), args
}

func (s *Store) GetPromotion(ctx context.Context, id string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select p.id::text as id,
         p.name,
         p.description,
         p.type,
         p.code,
         p.discount_value,
         p.discount_percentage,
         p.minimum_order,
         p.maximum_discount,
         p.usage_limit,
         p.usage_count,
         p.per_customer_limit,
         p.start_date,
         p.end_date,
         p.is_active,
         p.applies_to,
         p.category_ids,
         p.product_ids,
         p.banner_text,
         p.banner_color,
         p.banner_placement,
         p.segment_scope,
         p.created_at,
         p.updated_at
  from shop.promotions p
  where p.id::text = $1
  limit 1
) t
`

	return queryJSONObject(ctx, s.pool, query, id)
}
