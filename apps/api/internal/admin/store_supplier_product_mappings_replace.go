package admin

import (
	"context"

	"github.com/jackc/pgx/v5"
)

func (s *Store) ReplaceSupplierProductMappings(ctx context.Context, supplierID string, body map[string]any, actorID, actorRole, requestID string) (SupplierProductMappingsPage, error) {
	rawItems, ok := body["items"].([]any)
	if !ok {
		return SupplierProductMappingsPage{}, errInvalidInput
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return SupplierProductMappingsPage{}, err
	}
	defer tx.Rollback(ctx)

	const auditQuery = `
select row_to_json(t)::jsonb
from (
  select ps.product_id::text as product_id,
         p.name as product_name,
         p.sku as product_sku,
         ps.priority,
         ps.is_primary,
         ps.is_active,
         ps.supplier_sku,
         ps.cost_price,
         ps.cost_currency,
         ps.cost_fx_rate_to_eur,
         ps.lead_time_days,
         ps.reorder_min_stock,
         ps.reorder_target_stock
  from shop.product_suppliers ps
  join shop.products p on p.id = ps.product_id
  where ps.supplier_id = $1::uuid
  order by ps.is_primary desc, ps.priority asc, ps.updated_at desc, ps.created_at desc
) t
`
	beforeItems, err := queryJSONRows(ctx, tx, auditQuery, supplierID)
	if err != nil {
		return SupplierProductMappingsPage{}, err
	}

	if _, err := tx.Exec(ctx, `delete from shop.product_suppliers where supplier_id = $1::uuid`, supplierID); err != nil {
		return SupplierProductMappingsPage{}, err
	}

	for _, raw := range rawItems {
		item, ok := raw.(map[string]any)
		if !ok {
			return SupplierProductMappingsPage{}, errInvalidInput
		}
		productID := validUUIDOrEmpty(asString(item["product_id"]))
		if productID == "" {
			return SupplierProductMappingsPage{}, errInvalidInput
		}

		priority := asInt(item["priority"], 100)
		isPrimary := asBool(item["is_primary"], false)
		isActive := asBool(item["is_active"], true)
		supplierSKU := asNullableString(item["supplier_sku"])

		var costPrice any
		if asString(item["cost_price"]) != "" || item["cost_price"] != nil {
			costPrice = asFloat(item["cost_price"], 0)
		}

		costCurrency := asString(item["cost_currency"])
		if costCurrency == "" {
			costCurrency = "EUR"
		}
		costFxRate := asFloat(item["cost_fx_rate_to_eur"], 1)
		if costFxRate <= 0 {
			costFxRate = 1
		}
		var leadTime any
		if asString(item["lead_time_days"]) != "" || item["lead_time_days"] != nil {
			leadTime = asInt(item["lead_time_days"], 0)
		}

		var reorderMin any
		if asString(item["reorder_min_stock"]) != "" || item["reorder_min_stock"] != nil {
			reorderMin = asInt(item["reorder_min_stock"], 0)
		}
		var reorderTarget any
		if asString(item["reorder_target_stock"]) != "" || item["reorder_target_stock"] != nil {
			reorderTarget = asInt(item["reorder_target_stock"], 0)
		}

		if isPrimary {
			if _, err := tx.Exec(ctx, `
update shop.product_suppliers
set is_primary = false,
    updated_at = now()
where product_id = $1::uuid
  and supplier_id <> $2::uuid
  and is_primary = true
`, productID, supplierID); err != nil {
				return SupplierProductMappingsPage{}, err
			}
		}

		if _, err := tx.Exec(ctx, `
 insert into shop.product_suppliers (
  product_id,
  supplier_id,
  priority,
  is_primary,
  is_active,
  supplier_sku,
  cost_price,
  cost_currency,
  cost_fx_rate_to_eur,
  lead_time_days,
  reorder_min_stock,
  reorder_target_stock
)
values (
  $1::uuid,
  $2::uuid,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9,
  $10,
  $11,
  $12
)
on conflict (product_id, supplier_id) do update
set priority = excluded.priority,
    is_primary = excluded.is_primary,
    is_active = excluded.is_active,
    supplier_sku = excluded.supplier_sku,
    cost_price = excluded.cost_price,
    cost_currency = excluded.cost_currency,
    cost_fx_rate_to_eur = excluded.cost_fx_rate_to_eur,
    lead_time_days = excluded.lead_time_days,
    reorder_min_stock = excluded.reorder_min_stock,
    reorder_target_stock = excluded.reorder_target_stock,
    updated_at = now()
`, productID, supplierID, priority, isPrimary, isActive, supplierSKU, costPrice, costCurrency, costFxRate, leadTime, reorderMin, reorderTarget); err != nil {
			return SupplierProductMappingsPage{}, err
		}
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}
	if _, err := tx.Exec(ctx, `
insert into shop.supplier_activity_log (supplier_id, activity_type, severity, actor_type, actor_id, message, metadata)
values (
  $1::uuid,
  'product.mappings.updated',
  'info',
  'admin',
  $2::uuid,
  'Product mappings updated',
  jsonb_build_object('count', $3)
)
`, supplierID, actorParam, len(rawItems)); err != nil {
		return SupplierProductMappingsPage{}, err
	}

	afterItems, err := queryJSONRows(ctx, tx, auditQuery, supplierID)
	if err != nil {
		return SupplierProductMappingsPage{}, err
	}
	if err := s.insertAuditLog(ctx, tx, supplierID, "supplier.product_mappings.replaced", "product_mappings", supplierID, map[string]any{"items": beforeItems}, map[string]any{"items": afterItems}, actorID, actorRole, requestID, map[string]any{"count_before": len(beforeItems), "count_after": len(afterItems)}); err != nil {
		return SupplierProductMappingsPage{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SupplierProductMappingsPage{}, err
	}

	return s.ListSupplierProductMappings(ctx, supplierID, 1, 200, "", nil)
}
