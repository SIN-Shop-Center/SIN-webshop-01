package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) CreateCategory(ctx context.Context, body map[string]any) (map[string]any, error) {
	name := asString(body["name"])
	slug := slugify(asString(body["slug"]))
	if name == "" || slug == "" {
		return nil, errInvalidInput
	}

	var exists bool
	if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.categories where slug = $1)`, slug).Scan(&exists); err != nil {
		return nil, err
	}
	if exists {
		return nil, errDuplicate
	}

	const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.categories (name, slug, description, image, parent_id)
  values ($1, $2, $3, $4, nullif($5, '')::uuid)
  returning id::text as id, name, slug, description, image,
            parent_id::text as parent_id, is_active, created_at, updated_at
) t
`

	return queryJSONObject(ctx, s.pool, query,
		name,
		slug,
		asNullableString(body["description"]),
		asNullableString(body["image"]),
		asString(body["parent_id"]),
	)
}

func (s *Store) UpdateCategory(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
	if slugRaw, ok := body["slug"]; ok {
		slug := slugify(asString(slugRaw))
		var exists bool
		if err := s.pool.QueryRow(ctx, `select exists(select 1 from shop.categories where slug = $1 and id::text <> $2)`, slug, id).Scan(&exists); err != nil {
			return nil, err
		}
		if exists {
			return nil, errDuplicate
		}
		body["slug"] = slug
	}

	setParts := make([]string, 0, 6)
	args := make([]any, 0, 8)
	appendField := func(col, key string) {
		v, ok := body[key]
		if !ok {
			return
		}
		args = append(args, v)
		setParts = append(setParts, fmt.Sprintf("%s = $%d", col, len(args)))
	}

	appendField("name", "name")
	appendField("slug", "slug")
	appendField("description", "description")
	appendField("image", "image")
	if parentRaw, ok := body["parent_id"]; ok {
		args = append(args, asNullableString(parentRaw))
		setParts = append(setParts, fmt.Sprintf("parent_id = nullif($%d, '')::uuid", len(args)))
	}

	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}

	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  update shop.categories
  set %s
  where id::text = $%d
  returning id::text as id, name, slug, description, image,
            parent_id::text as parent_id, is_active, created_at, updated_at
) t
`, strings.Join(setParts, ",\n      "), len(args))

	return queryJSONObject(ctx, s.pool, query, args...)
}

func (s *Store) DeleteCategory(ctx context.Context, id string) error {
	var productCount int
	if err := s.pool.QueryRow(ctx, `select count(*) from shop.products where category_id::text = $1`, id).Scan(&productCount); err != nil {
		return err
	}
	if productCount > 0 {
		return errBlocked
	}

	cmd, err := s.pool.Exec(ctx, `delete from shop.categories where id::text = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
