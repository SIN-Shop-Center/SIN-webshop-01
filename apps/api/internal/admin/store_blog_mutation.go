package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *Store) CreateBlogPost(ctx context.Context, body map[string]any) (map[string]any, error) {
	title := asString(body["title"])
	if title == "" {
		return nil, errInvalidInput
	}
	slug := slugify(defaultString(body["slug"], title))

	var exists bool
	if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.blog_posts where slug = $1)`, slug).Scan(&exists); err != nil {
		return nil, err
	}
	if exists {
		return nil, errDuplicate
	}

	status := defaultString(body["status"], "draft")
	publishedAt := body["published_at"]
	if status == "published" && publishedAt == nil {
		publishedAt = time.Now().UTC()
	}

	const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.blog_posts (
    slug, title, excerpt, content, featured_image, category, tags, author,
    status, published_at, scheduled_at, meta_title, meta_description, views
  ) values (
    $1, $2, $3, $4, $5, $6, coalesce($7::text[], '{}'::text[]), $8,
    $9, $10, $11, $12, $13, 0
  )
  returning id::text as id, slug, title, excerpt, content, featured_image, category,
            tags, author, status, published_at, scheduled_at,
            meta_title, meta_description, views, created_at, updated_at
) t
`

	return queryJSONObject(ctx, s.pool, query,
		slug,
		title,
		asNullableString(body["excerpt"]),
		defaultString(body["content"], ""),
		asNullableString(body["featured_image"]),
		asNullableString(body["category"]),
		asStringSlice(body["tags"]),
		defaultString(body["author"], "Admin"),
		status,
		publishedAt,
		body["scheduled_at"],
		defaultString(body["meta_title"], title),
		defaultString(body["meta_description"], asString(body["excerpt"])),
	)
}

func (s *Store) UpdateBlogPost(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
	if slugRaw, ok := body["slug"]; ok {
		slug := slugify(asString(slugRaw))
		var exists bool
		if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.blog_posts where slug = $1 and id::text <> $2)`, slug, id).Scan(&exists); err != nil {
			return nil, err
		}
		if exists {
			return nil, errDuplicate
		}
		body["slug"] = slug
	}

	setParts := make([]string, 0, 12)
	args := make([]any, 0, 14)
	appendField := func(col, key string) {
		v, ok := body[key]
		if !ok {
			return
		}
		args = append(args, v)
		setParts = append(setParts, fmt.Sprintf("%s = $%d", col, len(args)))
	}

	appendField("title", "title")
	appendField("slug", "slug")
	appendField("excerpt", "excerpt")
	appendField("content", "content")
	appendField("featured_image", "featured_image")
	appendField("category", "category")
	appendField("tags", "tags")
	appendField("author", "author")
	appendField("status", "status")
	appendField("published_at", "published_at")
	appendField("scheduled_at", "scheduled_at")
	appendField("meta_title", "meta_title")
	appendField("meta_description", "meta_description")

	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}

	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  update shop.blog_posts
  set %s
  where id::text = $%d
  returning id::text as id, slug, title, excerpt, content, featured_image, category,
            tags, author, status, published_at, scheduled_at,
            meta_title, meta_description, views, created_at, updated_at
) t
`, strings.Join(setParts, ",\n      "), len(args))

	return queryJSONObject(ctx, s.pool, query, args...)
}

func (s *Store) DeleteBlogPost(ctx context.Context, id string) error {
	cmd, err := s.pool.Exec(ctx, `delete from shop.blog_posts where id::text = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
