package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) UpsertSupplierCatalogProducts(ctx context.Context, supplierID string, body map[string]any, actorID string) (SupplierCatalogProductsPage, error) {
	rawItems, ok := body["items"].([]any)
	if !ok || len(rawItems) == 0 {
		return SupplierCatalogProductsPage{}, errInvalidInput
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return SupplierCatalogProductsPage{}, err
	}
	defer tx.Rollback(ctx)

	affected := 0
	for _, raw := range rawItems {
		item := asMap(raw)
		title := strings.TrimSpace(defaultString(item["title"], asString(item["name"])))
		if title == "" {
			return SupplierCatalogProductsPage{}, errInvalidInput
		}

		metadataJSON, err := json.Marshal(asMap(item["metadata"]))
		if err != nil {
			return SupplierCatalogProductsPage{}, err
		}

		price := supplierCatalogNullableFloat(item["price"])
		compareAtPrice := supplierCatalogNullableFloat(item["compare_at_price"])
		moq := supplierCatalogNullableFloat(item["minimum_order_quantity"])
		aiScore := supplierCatalogNullableFloat(item["ai_score"])
		stockHint := supplierCatalogNullableInt(item["stock_hint"])
		leadTimeDays := supplierCatalogNullableInt(item["lead_time_days"])
		status := defaultString(item["status"], "new")
		reviewNote := asNullableString(item["review_note"])
		description := asNullableString(item["description"])
		sourceURL := asNullableString(item["source_url"])
		imageURL := asNullableString(item["image_url"])
		currency := defaultString(item["currency"], "EUR")
		externalProductID := asNullableString(item["external_product_id"])
		supplierSKU := asNullableString(item["supplier_sku"])

		id := validUUIDOrEmpty(asString(item["id"]))
		switch {
		case id != "":
			tag, err := tx.Exec(ctx, `
update public.supplier_catalog_products
set external_product_id = $3,
    supplier_sku = $4,
    title = $5,
    description = $6,
    source_url = $7,
    image_url = $8,
    currency = $9,
    price = $10,
    compare_at_price = $11,
    minimum_order_quantity = $12,
    stock_hint = $13,
    lead_time_days = $14,
    status = $15,
    review_note = $16,
    ai_score = $17,
    metadata = coalesce(metadata, '{}'::jsonb) || $18::jsonb,
    last_seen_at = now(),
    updated_at = now()
where id = $1::uuid
  and supplier_id = $2::uuid
`, id, supplierID, externalProductID, supplierSKU, title, description, sourceURL, imageURL, currency, price, compareAtPrice, moq, stockHint, leadTimeDays, status, reviewNote, aiScore, string(metadataJSON))
			if err != nil {
				return SupplierCatalogProductsPage{}, err
			}
			if tag.RowsAffected() == 0 {
				return SupplierCatalogProductsPage{}, pgx.ErrNoRows
			}
			affected++
		case externalProductID != nil:
			if _, err := tx.Exec(ctx, `
insert into public.supplier_catalog_products (
  supplier_id, external_product_id, supplier_sku, title, description, source_url, image_url,
  currency, price, compare_at_price, minimum_order_quantity, stock_hint, lead_time_days,
  status, review_note, ai_score, metadata, discovered_at, last_seen_at
)
values (
  $1::uuid, $2, $3, $4, $5, $6, $7,
  $8, $9, $10, $11, $12, $13,
  $14, $15, $16, $17::jsonb, now(), now()
)
on conflict (supplier_id, external_product_id) do update
set supplier_sku = excluded.supplier_sku,
    title = excluded.title,
    description = excluded.description,
    source_url = excluded.source_url,
    image_url = excluded.image_url,
    currency = excluded.currency,
    price = excluded.price,
    compare_at_price = excluded.compare_at_price,
    minimum_order_quantity = excluded.minimum_order_quantity,
    stock_hint = excluded.stock_hint,
    lead_time_days = excluded.lead_time_days,
    status = excluded.status,
    review_note = excluded.review_note,
    ai_score = excluded.ai_score,
    metadata = coalesce(public.supplier_catalog_products.metadata, '{}'::jsonb) || excluded.metadata,
    last_seen_at = now(),
    updated_at = now()
`, supplierID, externalProductID, supplierSKU, title, description, sourceURL, imageURL, currency, price, compareAtPrice, moq, stockHint, leadTimeDays, status, reviewNote, aiScore, string(metadataJSON)); err != nil {
				return SupplierCatalogProductsPage{}, err
			}
			affected++
		case supplierSKU != nil:
			if _, err := tx.Exec(ctx, `
insert into public.supplier_catalog_products (
  supplier_id, external_product_id, supplier_sku, title, description, source_url, image_url,
  currency, price, compare_at_price, minimum_order_quantity, stock_hint, lead_time_days,
  status, review_note, ai_score, metadata, discovered_at, last_seen_at
)
values (
  $1::uuid, null, $2, $3, $4, $5, $6,
  $7, $8, $9, $10, $11, $12,
  $13, $14, $15, $16::jsonb, now(), now()
)
on conflict (supplier_id, supplier_sku) do update
set title = excluded.title,
    description = excluded.description,
    source_url = excluded.source_url,
    image_url = excluded.image_url,
    currency = excluded.currency,
    price = excluded.price,
    compare_at_price = excluded.compare_at_price,
    minimum_order_quantity = excluded.minimum_order_quantity,
    stock_hint = excluded.stock_hint,
    lead_time_days = excluded.lead_time_days,
    status = excluded.status,
    review_note = excluded.review_note,
    ai_score = excluded.ai_score,
    metadata = coalesce(public.supplier_catalog_products.metadata, '{}'::jsonb) || excluded.metadata,
    last_seen_at = now(),
    updated_at = now()
`, supplierID, supplierSKU, title, description, sourceURL, imageURL, currency, price, compareAtPrice, moq, stockHint, leadTimeDays, status, reviewNote, aiScore, string(metadataJSON)); err != nil {
				return SupplierCatalogProductsPage{}, err
			}
			affected++
		default:
			if _, err := tx.Exec(ctx, `
insert into public.supplier_catalog_products (
  supplier_id, title, description, source_url, image_url, currency, price, compare_at_price,
  minimum_order_quantity, stock_hint, lead_time_days, status, review_note, ai_score, metadata, discovered_at, last_seen_at
)
values (
  $1::uuid, $2, $3, $4, $5, $6, $7, $8,
  $9, $10, $11, $12, $13, $14, $15::jsonb, now(), now()
)
`, supplierID, title, description, sourceURL, imageURL, currency, price, compareAtPrice, moq, stockHint, leadTimeDays, status, reviewNote, aiScore, string(metadataJSON)); err != nil {
				return SupplierCatalogProductsPage{}, err
			}
			affected++
		}
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
  'catalog.products.ingested',
  'info',
  case when $2::uuid is null then 'system' else 'admin' end,
  $2::uuid,
  'Supplier catalog products upserted',
  jsonb_build_object('items', $3)
)
`, supplierID, actorParam, affected); err != nil {
		return SupplierCatalogProductsPage{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SupplierCatalogProductsPage{}, err
	}

	return s.ListSupplierCatalogProducts(ctx, supplierID, 1, 100, "", "")
}

func supplierCatalogNullableInt(v any) any {
	switch x := v.(type) {
	case int:
		return x
	case int32:
		return int(x)
	case int64:
		return int(x)
	case float64:
		return int(x)
	case string:
		value := strings.TrimSpace(x)
		if value == "" {
			return nil
		}
		return asInt(value, 0)
	default:
		return nil
	}
}

func supplierCatalogNullableFloat(v any) any {
	switch x := v.(type) {
	case float32:
		return float64(x)
	case float64:
		return x
	case int:
		return float64(x)
	case int64:
		return float64(x)
	case string:
		value := strings.TrimSpace(x)
		if value == "" {
			return nil
		}
		return asFloat(value, 0)
	default:
		return nil
	}
}

func supplierCatalogProductSlug(title, catalogProductID string) string {
	base := slugify(title)
	suffix := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(catalogProductID), "-", ""))
	if len(suffix) > 8 {
		suffix = suffix[:8]
	}
	if suffix == "" {
		return base
	}
	return fmt.Sprintf("%s-%s", base, suffix)
}

func supplierCatalogProductSKU(supplierID, catalogProductID, preferred string) string {
	supplierPart := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(supplierID), "-", ""))
	catalogPart := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(catalogProductID), "-", ""))
	if len(supplierPart) > 4 {
		supplierPart = supplierPart[:4]
	}
	if len(catalogPart) > 6 {
		catalogPart = catalogPart[:6]
	}
	if preferred = strings.TrimSpace(preferred); preferred != "" {
		preferredPart := strings.ToUpper(strings.ReplaceAll(slugify(preferred), "-", "_"))
		if len(preferredPart) > 16 {
			preferredPart = preferredPart[:16]
		}
		return fmt.Sprintf("SUP_%s_%s_%s", supplierPart, preferredPart, catalogPart)
	}
	return fmt.Sprintf("SUP_%s_%s", supplierPart, catalogPart)
}
