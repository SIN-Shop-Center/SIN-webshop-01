package catalog

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

func (s *Store) ListProducts(ctx context.Context, filter ProductFilter) ([]Product, error) {
	where := []string{
		"p.is_active = true",
		`exists (
  with supplier_candidates as (
    select ps.supplier_id
    from public.product_suppliers ps
    where ps.product_id = p.id
      and ps.is_active = true
    union
    select p.supplier_id
  )
  select 1
  from supplier_candidates sc
  join public.suppliers s on s.id = sc.supplier_id
  where s.auto_fulfill_enabled = true
    and s.status in ('approved', 'active')
    and s.onboarding_status = 'connected'
    and s.compliance_state = 'approved'
    and (
      (s.fulfillment_mode = 'api'
        and coalesce(nullif(s.api_endpoint, ''), '') <> ''
        and coalesce(nullif(public.resolve_supplier_secret_ref(s.api_secret_ref), ''), nullif(s.api_key, ''), '') <> '')
      or
      (s.fulfillment_mode = 'email' and coalesce(nullif(s.contact_email, ''), nullif(s.email, '')) <> '')
    )
)`,
	}
	args := make([]any, 0, 4)

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		pos := len(args)
		where = append(where, fmt.Sprintf("(p.name ilike $%d or coalesce(p.description, '') ilike $%d)", pos, pos))
	}

	if filter.Category != "" {
		args = append(args, filter.Category)
		pos := len(args)
		where = append(where, fmt.Sprintf("(p.category_id::text = $%d or c.slug = $%d)", pos, pos))
	}

	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	args = append(args, filter.Limit, filter.Offset)

	query := fmt.Sprintf(`
select
  p.id::text,
  coalesce(p.sku, ''),
  p.name,
  coalesce(p.slug, ''),
  coalesce(p.description, ''),
  p.price,
  p.original_price,
  coalesce(p.images, '[]'::jsonb) as images,
  p.stock,
  p.is_active,
  p.category_id::text,
  c.name,
  c.slug,
  case
    when coalesce(p.metadata->>'rating', '') ~ '^[0-9]+(\\.[0-9]+)?$'
      then (p.metadata->>'rating')::numeric::float8
    else null
  end as rating,
  case
    when coalesce(p.metadata->>'review_count', '') ~ '^[0-9]+$'
      then (p.metadata->>'review_count')::integer
    else null
  end as review_count,
  p.created_at,
  p.updated_at
from public.products p
left join public.categories c on c.id = p.category_id
where %s
order by p.created_at desc
limit $%d offset $%d
`, strings.Join(where, " and "), limitPos, offsetPos)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Product, 0, filter.Limit)
	for rows.Next() {
		var p Product
		var imagesRaw []byte
		if err := rows.Scan(
			&p.ID,
			&p.SKU,
			&p.Name,
			&p.Slug,
			&p.Description,
			&p.Price,
			&p.OriginalPrice,
			&imagesRaw,
			&p.Stock,
			&p.IsActive,
			&p.CategoryID,
			&p.CategoryName,
			&p.CategorySlug,
			&p.Rating,
			&p.ReviewCount,
			&p.CreatedAt,
			&p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(imagesRaw, &p.Images); err != nil {
			p.Images = []string{}
		}
		items = append(items, p)
	}
	return items, rows.Err()
}
