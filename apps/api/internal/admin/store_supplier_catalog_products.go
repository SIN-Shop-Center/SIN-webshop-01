package admin

import (
	"context"
	"fmt"
	"strings"
)

type SupplierCatalogProductsPage struct {
	Items []map[string]any
	Total int
	Page  int
	Limit int
}

func (s *Store) ListSupplierCatalogProducts(ctx context.Context, supplierID string, page, limit int, search, status string) (SupplierCatalogProductsPage, error) {
	where := []string{"scp.supplier_id = $1::uuid"}
	args := []any{supplierID}

	if strings.TrimSpace(search) != "" {
		args = append(args, "%"+strings.TrimSpace(search)+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf("(scp.title ilike $%d or coalesce(scp.supplier_sku, '') ilike $%d or coalesce(scp.external_product_id, '') ilike $%d)", idx, idx, idx))
	}
	if strings.TrimSpace(status) != "" {
		args = append(args, strings.TrimSpace(status))
		where = append(where, fmt.Sprintf("scp.status = $%d", len(args)))
	}

	whereClause := strings.Join(where, " and ")

	var total int
	if err := s.pool.QueryRow(ctx, "select count(*) from public.supplier_catalog_products scp where "+whereClause, args...).Scan(&total); err != nil {
		return SupplierCatalogProductsPage{}, err
	}

	args = append(args, limit, (page-1)*limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select scp.id::text as id,
         scp.supplier_id::text as supplier_id,
         scp.external_product_id,
         scp.supplier_sku,
         scp.title,
         scp.description,
         scp.source_url,
         scp.image_url,
         scp.currency,
         scp.price,
         scp.compare_at_price,
         scp.minimum_order_quantity,
         scp.stock_hint,
         scp.lead_time_days,
         scp.status,
         scp.review_note,
         scp.ai_score,
         scp.metadata,
         scp.discovered_at,
         scp.last_seen_at,
         scp.imported_product_id::text as imported_product_id,
         scp.created_at,
         scp.updated_at,
         case when p.id is null then null else jsonb_build_object(
           'id', p.id::text,
           'name', p.name,
           'slug', p.slug,
           'is_active', p.is_active
         ) end as imported_product
  from public.supplier_catalog_products scp
  left join public.products p on p.id = scp.imported_product_id
  where %s
  order by
    case
      when scp.status = 'approved' then 0
      when scp.status = 'reviewing' then 1
      when scp.status = 'new' then 2
      when scp.status = 'imported' then 3
      when scp.status = 'rejected' then 4
      else 5
    end asc,
    scp.ai_score desc nulls last,
    scp.updated_at desc,
    scp.created_at desc
  limit $%d offset $%d
) t
`, whereClause, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return SupplierCatalogProductsPage{}, err
	}

	return SupplierCatalogProductsPage{
		Items: items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}
