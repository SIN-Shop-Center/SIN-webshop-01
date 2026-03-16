package catalog

import (
	"context"
	"encoding/json"
)

func (s *Store) GetProduct(ctx context.Context, idOrSlug string) (*Product, error) {
	const query = `
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
where p.is_active = true
  and exists (
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
  )
  and (p.id::text = $1 or p.slug = $1)
limit 1
`

	var p Product
	var imagesRaw []byte
	err := s.pool.QueryRow(ctx, query, idOrSlug).Scan(
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
	)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(imagesRaw, &p.Images); err != nil {
		p.Images = []string{}
	}
	return &p, nil
}

func (s *Store) ListCategories(ctx context.Context) ([]Category, error) {
	const query = `
select id::text, name, slug, description, image, is_active, created_at, updated_at
from public.categories
where is_active = true
order by name asc
`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Category, 0, 32)
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.Image, &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}
