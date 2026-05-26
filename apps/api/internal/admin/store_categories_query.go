package admin

import (
	"context"
)

func (s *Store) ListCategories(ctx context.Context, includeProducts bool) ([]map[string]any, error) {
	query := `
select row_to_json(t)::jsonb
from (
  select c.id::text as id,
         c.name,
         c.slug,
         c.description,
         c.image,
         c.parent_id::text as parent_id,
         c.is_active,
         c.created_at,
         c.updated_at
  from shop.categories c
  order by c.name asc
) t
`

	if includeProducts {
		query = `
select row_to_json(t)::jsonb
from (
  select c.id::text as id,
         c.name,
         c.slug,
         c.description,
         c.image,
         c.parent_id::text as parent_id,
         c.is_active,
         c.created_at,
         c.updated_at,
         (select count(*) from shop.products p where p.category_id = c.id) as products_count
  from shop.categories c
  order by c.name asc
) t
`
	}

	return queryJSONRows(ctx, s.pool, query)
}

func (s *Store) GetCategory(ctx context.Context, id string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select c.id::text as id,
         c.name,
         c.slug,
         c.description,
         c.image,
         c.parent_id::text as parent_id,
         c.is_active,
         c.created_at,
         c.updated_at,
         coalesce(
           (
             select jsonb_agg(jsonb_build_object('id', p.id::text, 'name', p.name, 'price', p.price, 'is_active', p.is_active))
             from shop.products p
             where p.category_id = c.id
           ),
           '[]'::jsonb
         ) as products
  from shop.categories c
  where c.id::text = $1
  limit 1
) t
`

	return queryJSONObject(ctx, s.pool, query, id)
}
