package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) CreatePage(ctx context.Context, body map[string]any) (map[string]any, error) {
	title := asString(body["title"])
	slug := slugify(asString(body["slug"]))
	if title == "" || slug == "" {
		return nil, errInvalidInput
	}

	var exists bool
	if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.pages where slug = $1)`, slug).Scan(&exists); err != nil {
		return nil, err
	}
	if exists {
		return nil, errDuplicate
	}

	const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.pages (slug, title, content, meta_title, meta_description, page_type, is_published)
  values ($1, $2, $3, $4, $5, $6, $7)
  returning id::text as id, slug, title, content, meta_title, meta_description, page_type, is_published, created_at, updated_at
) t
`

	return queryJSONObject(ctx, s.pool, query,
		slug,
		title,
		defaultString(body["content"], ""),
		defaultString(body["meta_title"], title),
		defaultString(body["meta_description"], ""),
		defaultString(body["page_type"], "custom"),
		asBool(body["is_published"], false),
	)
}

func (s *Store) UpdatePage(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
	if slugRaw, ok := body["slug"]; ok {
		slug := slugify(asString(slugRaw))
		var exists bool
		if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.pages where slug = $1 and id::text <> $2)`, slug, id).Scan(&exists); err != nil {
			return nil, err
		}
		if exists {
			return nil, errDuplicate
		}
		body["slug"] = slug
	}

	setParts := make([]string, 0, 8)
	args := make([]any, 0, 10)
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
	appendField("content", "content")
	appendField("meta_title", "meta_title")
	appendField("meta_description", "meta_description")
	appendField("page_type", "page_type")
	appendField("is_published", "is_published")

	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}

	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  update shop.pages
  set %s
  where id::text = $%d
  returning id::text as id, slug, title, content, meta_title, meta_description, page_type, is_published, created_at, updated_at
) t
`, strings.Join(setParts, ",\n      "), len(args))

	return queryJSONObject(ctx, s.pool, query, args...)
}

func (s *Store) DeletePage(ctx context.Context, id string) error {
	cmd, err := s.pool.Exec(ctx, `delete from shop.pages where id::text = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
