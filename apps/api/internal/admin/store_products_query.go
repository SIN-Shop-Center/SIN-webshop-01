package admin

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListProducts(ctx context.Context, p ProductListParams) ([]map[string]any, int, error) {
	where, args := productWhereClause(p)

	countQuery := "select count(*) from shop.products p where " + where
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortCol := pickSortColumn(p.SortBy, "p.created_at", map[string]string{
		"created_at": "p.created_at",
		"updated_at": "p.updated_at",
		"name":       "p.name",
		"price":      "p.price",
		"stock":      "p.stock",
	})
	sortOrder := normalizeSortOrder(p.SortOrder)

	args = append(args, p.Limit, (p.Page-1)*p.Limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select p.id::text as id,
         p.supplier_id::text as supplier_id,
         p.category_id::text as category_id,
         p.sku,
         p.name,
         p.slug,
         p.description,
         p.price,
         p.original_price,
         p.images,
         p.variants,
         p.stock,
         p.is_active,
         p.metadata,
         p.created_at,
         p.updated_at,
         case when c.id is null then null else jsonb_build_object('id', c.id::text, 'name', c.name, 'slug', c.slug) end as category
  from shop.products p
  left join shop.categories c on c.id = p.category_id
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

func productWhereClause(p ProductListParams) (string, []any) {
	where := []string{"1=1"}
	args := make([]any, 0, 4)

	if search := strings.TrimSpace(p.Search); search != "" {
		args = append(args, "%"+search+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf("(p.name ilike $%d or p.description ilike $%d)", idx, idx))
	}
	if category := strings.TrimSpace(p.CategoryID); category != "" {
		args = append(args, category)
		where = append(where, fmt.Sprintf("p.category_id::text = $%d", len(args)))
	}
	if p.IsActive != nil {
		args = append(args, *p.IsActive)
		where = append(where, fmt.Sprintf("p.is_active = $%d", len(args)))
	}

	return strings.Join(where, " and "), args
}

func (s *Store) GetProduct(ctx context.Context, id string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select p.id::text as id,
         p.supplier_id::text as supplier_id,
         p.category_id::text as category_id,
         p.sku,
         p.name,
         p.slug,
         p.description,
         p.price,
         p.original_price,
         p.images,
         p.variants,
         p.stock,
         p.is_active,
         p.metadata,
         p.created_at,
         p.updated_at,
         case when c.id is null then null else jsonb_build_object('id', c.id::text, 'name', c.name, 'slug', c.slug) end as category,
         case when s.id is null then null else jsonb_build_object('id', s.id::text, 'name', s.name, 'email', s.email) end as supplier
  from shop.products p
  left join shop.categories c on c.id = p.category_id
  left join shop.suppliers s on s.id = p.supplier_id
  where p.id::text = $1
  limit 1
) t
`

	return queryJSONObject(ctx, s.pool, query, id)
}
