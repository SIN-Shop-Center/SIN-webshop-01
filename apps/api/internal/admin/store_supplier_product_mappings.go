package admin

import (
	"context"
	"fmt"
	"strings"
)

type SupplierProductMappingsPage struct {
	Items []map[string]any
	Total int
	Page  int
	Limit int
}

func (s *Store) ListSupplierProductMappings(ctx context.Context, supplierID string, page, limit int, search string, isActive *bool) (SupplierProductMappingsPage, error) {
	where := []string{"ps.supplier_id = $1::uuid"}
	args := []any{supplierID}

	if strings.TrimSpace(search) != "" {
		args = append(args, "%"+strings.TrimSpace(search)+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf("(p.name ilike $%d or coalesce(p.sku, '') ilike $%d)", idx, idx))
	}
	if isActive != nil {
		args = append(args, *isActive)
		where = append(where, fmt.Sprintf("ps.is_active = $%d", len(args)))
	}

	whereClause := strings.Join(where, " and ")

	var total int
	if err := s.pool.QueryRow(ctx, "select count(*) from shop.product_suppliers ps join shop.products p on p.id = ps.product_id where "+whereClause, args...).Scan(&total); err != nil {
		return SupplierProductMappingsPage{}, err
	}

	args = append(args, limit, (page-1)*limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select ps.id::text as id,
         ps.product_id::text as product_id,
         p.name as product_name,
         p.sku as product_sku,
         ps.supplier_id::text as supplier_id,
         ps.priority,
         ps.is_primary,
         ps.is_active,
         ps.supplier_sku,
         ps.cost_price,
         ps.cost_currency,
         ps.cost_fx_rate_to_eur,
         ps.lead_time_days,
         ps.reorder_min_stock,
         ps.reorder_target_stock,
         ps.created_at,
         ps.updated_at
  from shop.product_suppliers ps
  join shop.products p on p.id = ps.product_id
  where %s
  order by ps.is_primary desc, ps.priority asc, ps.updated_at desc, ps.created_at desc
  limit $%d offset $%d
) t
`, whereClause, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return SupplierProductMappingsPage{}, err
	}

	return SupplierProductMappingsPage{
		Items: items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}
