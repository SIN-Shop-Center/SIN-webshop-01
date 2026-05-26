package admin

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListBlogPosts(ctx context.Context, p BlogListParams) ([]map[string]any, int, error) {
	where, args := blogWhereClause(p)
	countQuery := "select count(*) from shop.blog_posts b where " + where

	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortCol := pickSortColumn(p.SortBy, "b.created_at", map[string]string{
		"created_at": "b.created_at",
		"updated_at": "b.updated_at",
		"title":      "b.title",
		"published_at": "b.published_at",
		"status":     "b.status",
	})
	sortOrder := normalizeSortOrder(p.SortOrder)

	args = append(args, p.Limit, (p.Page-1)*p.Limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select b.id::text as id,
         b.slug,
         b.title,
         b.excerpt,
         b.content,
         b.featured_image,
         b.category,
         b.tags,
         b.author,
         b.status,
         b.published_at,
         b.scheduled_at,
         b.meta_title,
         b.meta_description,
         b.views,
         b.created_at,
         b.updated_at
  from shop.blog_posts b
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

func blogWhereClause(p BlogListParams) (string, []any) {
	where := []string{"1=1"}
	args := make([]any, 0, 4)

	if status := strings.TrimSpace(p.Status); status != "" {
		args = append(args, status)
		where = append(where, fmt.Sprintf("b.status = $%d", len(args)))
	}
	if category := strings.TrimSpace(p.Category); category != "" {
		args = append(args, category)
		where = append(where, fmt.Sprintf("b.category = $%d", len(args)))
	}
	if search := strings.TrimSpace(p.Search); search != "" {
		args = append(args, "%"+search+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf("(b.title ilike $%d or b.content ilike $%d)", idx, idx))
	}
	return strings.Join(where, " and "), args
}

func (s *Store) GetBlogPost(ctx context.Context, idOrSlug string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select b.id::text as id,
         b.slug,
         b.title,
         b.excerpt,
         b.content,
         b.featured_image,
         b.category,
         b.tags,
         b.author,
         b.status,
         b.published_at,
         b.scheduled_at,
         b.meta_title,
         b.meta_description,
         b.views,
         b.created_at,
         b.updated_at
  from shop.blog_posts b
  where b.id::text = $1 or b.slug = $1
  order by b.updated_at desc
  limit 1
) t
`

	return queryJSONObject(ctx, s.pool, query, idOrSlug)
}
