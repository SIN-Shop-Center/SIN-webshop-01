package admin

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) CreateProduct(ctx context.Context, body map[string]any) (map[string]any, error) {
	name := asString(body["name"])
	price := asFloat(body["price"], -1)
	if name == "" || price < 0 {
		return nil, errInvalidInput
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.products (
    supplier_id, category_id, sku, name, slug, description, price, original_price,
    images, variants, stock, is_active, metadata
  ) values (
    nullif($1, '')::uuid, nullif($2, '')::uuid, nullif($3, ''), $4, nullif($5, ''), $6, $7, $8,
    coalesce($9::jsonb, '[]'::jsonb), $10::jsonb, $11, $12, coalesce($13::jsonb, '{}'::jsonb)
  )
  returning id::text as id, supplier_id::text as supplier_id, category_id::text as category_id,
            sku, name, slug, description, price, original_price, images, variants,
            stock, is_active, metadata, created_at, updated_at
) t
`
	item, err := queryJSONObject(ctx, tx, query,
		asString(body["supplier_id"]),
		asString(body["category_id"]),
		asString(body["sku"]),
		name,
		slugify(asString(body["slug"])),
		asNullableString(body["description"]),
		price,
		toNullableFloat(body["original_price"]),
		body["images"],
		body["variants"],
		asInt(body["stock"], 100),
		asBool(body["is_active"], true),
		body["metadata"],
	)
	if err != nil {
		return nil, err
	}
	if asBool(item["is_active"], false) {
		ready, err := isProductAutopilotReady(ctx, tx, asString(item["id"]))
		if err != nil {
			return nil, err
		}
		if !ready {
			return nil, errBlocked
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Store) UpdateProduct(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
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

	appendField("name", "name")
	appendField("description", "description")
	appendField("price", "price")
	appendField("original_price", "original_price")
	appendField("images", "images")
	appendField("variants", "variants")
	appendField("stock", "stock")
	appendField("is_active", "is_active")
	if slugRaw, ok := body["slug"]; ok {
		args = append(args, slugify(asString(slugRaw)))
		setParts = append(setParts, fmt.Sprintf("slug = $%d", len(args)))
	}
	if categoryRaw, ok := body["category_id"]; ok {
		args = append(args, asNullableString(categoryRaw))
		setParts = append(setParts, fmt.Sprintf("category_id = nullif($%d, '')::uuid", len(args)))
	}
	if supplierRaw, ok := body["supplier_id"]; ok {
		args = append(args, asNullableString(supplierRaw))
		setParts = append(setParts, fmt.Sprintf("supplier_id = nullif($%d, '')::uuid", len(args)))
	}
	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  update shop.products
  set %s
  where id::text = $%d
  returning id::text as id, supplier_id::text as supplier_id, category_id::text as category_id,
            sku, name, slug, description, price, original_price, images, variants,
            stock, is_active, metadata, created_at, updated_at
) t
`, strings.Join(setParts, ",\n      "), len(args))

	item, err := queryJSONObject(ctx, tx, query, args...)
	if err != nil {
		return nil, err
	}
	if asBool(item["is_active"], false) {
		ready, err := isProductAutopilotReady(ctx, tx, asString(item["id"]))
		if err != nil {
			return nil, err
		}
		if !ready {
			return nil, errBlocked
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}
