package admin

import "context"

func (s *Store) ListPages(ctx context.Context) ([]map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select p.id::text as id,
         p.slug,
         p.title,
         p.content,
         p.meta_title,
         p.meta_description,
         p.page_type,
         p.is_published,
         p.created_at,
         p.updated_at
  from shop.pages p
  order by p.title asc
) t
`

	return queryJSONRows(ctx, s.pool, query)
}

func (s *Store) GetPage(ctx context.Context, idOrSlug string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select p.id::text as id,
         p.slug,
         p.title,
         p.content,
         p.meta_title,
         p.meta_description,
         p.page_type,
         p.is_published,
         p.created_at,
         p.updated_at
  from shop.pages p
  where p.id::text = $1 or p.slug = $1
  order by p.updated_at desc
  limit 1
) t
`
	return queryJSONObject(ctx, s.pool, query, idOrSlug)
}
