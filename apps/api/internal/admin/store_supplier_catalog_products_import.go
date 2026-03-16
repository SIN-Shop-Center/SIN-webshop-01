package admin

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) ImportSupplierCatalogProduct(ctx context.Context, supplierID, catalogProductID string, body map[string]any, actorID string) (map[string]any, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	catalogProduct, err := queryJSONObject(ctx, tx, `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         supplier_id::text as supplier_id,
         supplier_sku,
         title,
         description,
         image_url,
         currency,
         price,
         compare_at_price,
         lead_time_days,
         metadata,
         imported_product_id::text as imported_product_id
  from public.supplier_catalog_products
  where id::text = $1
    and supplier_id::text = $2
  limit 1
) t
`, catalogProductID, supplierID)
	if err != nil {
		return nil, err
	}

	if importedProductID := asString(catalogProduct["imported_product_id"]); importedProductID != "" {
		product, err := s.GetProduct(ctx, importedProductID)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"catalog_product_id": catalogProductID,
			"product":            product,
			"already_imported":   true,
		}, nil
	}

	title := strings.TrimSpace(asString(catalogProduct["title"]))
	if title == "" {
		return nil, errInvalidInput
	}

	catalogPrice := asFloat(catalogProduct["price"], 0)
	priceMultiplier := asFloat(body["price_multiplier"], 1.8)
	if priceMultiplier <= 0 {
		priceMultiplier = 1.8
	}
	finalPrice := catalogPrice * priceMultiplier
	if overridePrice := asFloat(body["price"], 0); overridePrice > 0 {
		finalPrice = overridePrice
	}
	if finalPrice <= 0 {
		finalPrice = catalogPrice
	}
	if finalPrice < 0 {
		return nil, errInvalidInput
	}

	productMetadata, err := json.Marshal(map[string]any{
		"catalog_import": map[string]any{
			"catalog_product_id": catalogProductID,
			"supplier_id":        supplierID,
			"source":             "supplier_catalog",
		},
		"supplier_catalog": catalogProduct["metadata"],
	})
	if err != nil {
		return nil, err
	}

	images := []string{}
	if imageURL := asString(catalogProduct["image_url"]); imageURL != "" {
		images = append(images, imageURL)
	}
	imagesJSON, err := json.Marshal(images)
	if err != nil {
		return nil, err
	}

	product, err := queryJSONObject(ctx, tx, `
select row_to_json(t)::jsonb
from (
  insert into public.products (
    supplier_id, category_id, sku, name, slug, description, price, original_price,
    images, variants, stock, is_active, metadata
  ) values (
    $1::uuid, nullif($2, '')::uuid, $3, $4, $5, $6, $7, $8,
    $9::jsonb, '{}'::jsonb, $10, $11, $12::jsonb
  )
  returning id::text as id, supplier_id::text as supplier_id, category_id::text as category_id,
            sku, name, slug, description, price, original_price, images, variants,
            stock, is_active, metadata, created_at, updated_at
) t
`, supplierID,
		asString(body["category_id"]),
		supplierCatalogProductSKU(supplierID, catalogProductID, asString(catalogProduct["supplier_sku"])),
		title,
		supplierCatalogProductSlug(title, catalogProductID),
		asNullableString(catalogProduct["description"]),
		finalPrice,
		supplierCatalogNullableFloat(catalogProduct["compare_at_price"]),
		string(imagesJSON),
		asInt(body["stock"], 0),
		asBool(body["is_active"], false),
		string(productMetadata),
	)
	if err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
insert into public.product_suppliers (
  product_id, supplier_id, priority, is_primary, is_active, supplier_sku, cost_price, lead_time_days
)
values (
  $1::uuid, $2::uuid, 1, true, true, nullif($3, ''), $4, $5
)
on conflict (product_id, supplier_id) do update
set priority = excluded.priority,
    is_primary = excluded.is_primary,
    is_active = excluded.is_active,
    supplier_sku = excluded.supplier_sku,
    cost_price = excluded.cost_price,
    lead_time_days = excluded.lead_time_days,
    updated_at = now()
`, asString(product["id"]), supplierID, asString(catalogProduct["supplier_sku"]), supplierCatalogNullableFloat(catalogProduct["price"]), supplierCatalogNullableInt(catalogProduct["lead_time_days"])); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
update public.supplier_catalog_products
set status = 'imported',
    imported_product_id = $2::uuid,
    review_note = coalesce(nullif(review_note, ''), 'Imported into shop catalog'),
    updated_at = now()
where id = $1::uuid
`, catalogProductID, asString(product["id"])); err != nil {
		return nil, err
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}
	if _, err := tx.Exec(ctx, `
insert into public.supplier_activity_log (supplier_id, activity_type, severity, actor_type, actor_id, message, metadata)
values (
  $1::uuid,
  'catalog.product.imported',
  'info',
  case when $2::uuid is null then 'system' else 'admin' end,
  $2::uuid,
  'Supplier catalog product imported into shop',
  jsonb_build_object('catalog_product_id', $3, 'product_id', $4)
)
`, supplierID, actorParam, catalogProductID, asString(product["id"])); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return map[string]any{
		"catalog_product_id": catalogProductID,
		"product":            product,
		"already_imported":   false,
	}, nil
}
