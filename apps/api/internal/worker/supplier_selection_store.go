package worker

import (
	"context"
	"strings"
)

func (p *Processor) loadDispatchItems(ctx context.Context, orderID string) ([]supplierDispatchItem, error) {
	const query = `
select coalesce(oi.product_id::text, ''),
       coalesce(oi.sku, ''),
       coalesce(oi.title, ''),
       oi.quantity,
       coalesce(oi.unit_price_amount, round(coalesce(oi.price, 0) * 100)::int, 0)
from public.order_items oi
where oi.order_id::text = $1
order by oi.created_at asc
`
	rows, err := p.pool.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]supplierDispatchItem, 0, 8)
	for rows.Next() {
		var item supplierDispatchItem
		if err := rows.Scan(&item.ProductID, &item.SKU, &item.Title, &item.Quantity, &item.UnitPriceAmount); err != nil {
			return nil, err
		}
		if item.Quantity <= 0 {
			continue
		}
		if strings.TrimSpace(item.Title) == "" {
			item.Title = item.SKU
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	skuToProduct, err := p.resolveProductIDsBySKU(ctx, items)
	if err != nil {
		return nil, err
	}
	for i := range items {
		if strings.TrimSpace(items[i].ProductID) == "" {
			items[i].ProductID = skuToProduct[items[i].SKU]
		}
	}
	return items, nil
}

func (p *Processor) resolveProductIDsBySKU(ctx context.Context, items []supplierDispatchItem) (map[string]string, error) {
	skus := make([]string, 0, len(items))
	seen := map[string]struct{}{}
	for _, item := range items {
		sku := strings.TrimSpace(item.SKU)
		if sku == "" {
			continue
		}
		if _, ok := seen[sku]; ok {
			continue
		}
		seen[sku] = struct{}{}
		skus = append(skus, sku)
	}
	if len(skus) == 0 {
		return map[string]string{}, nil
	}

	rows, err := p.pool.Query(ctx, `
select sku, id::text
from public.products
where sku = any($1::text[])
`, skus)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]string, len(skus))
	for rows.Next() {
		var sku string
		var productID string
		if err := rows.Scan(&sku, &productID); err != nil {
			return nil, err
		}
		out[strings.TrimSpace(sku)] = strings.TrimSpace(productID)
	}
	return out, rows.Err()
}

func (p *Processor) loadSupplierCandidates(ctx context.Context, productID string) ([]supplierCandidate, error) {
	const query = `
with source_suppliers as (
  select ps.supplier_id, ps.priority, ps.is_primary
  from public.product_suppliers ps
  where ps.product_id = $1::uuid
    and ps.is_active = true
  union all
  select p.supplier_id, 1000 as priority, true as is_primary
  from public.products p
  where p.id = $1::uuid
    and p.supplier_id is not null
)
select distinct on (s.id)
  s.id::text,
  coalesce(s.name, ''),
  coalesce(s.status, ''),
  coalesce(s.fulfillment_mode, 'email'),
  coalesce(nullif(s.contact_email, ''), nullif(s.email, ''), ''),
  coalesce(s.api_endpoint, ''),
  coalesce(nullif(public.resolve_supplier_secret_ref(s.api_secret_ref), ''), s.api_key, ''),
  coalesce(s.sla_hours, 48),
  coalesce(ss.priority, 1000),
  coalesce(ss.is_primary, false),
  coalesce(s.rating::float8, 0)
from source_suppliers ss
join public.suppliers s on s.id = ss.supplier_id
where s.auto_fulfill_enabled = true
  and s.status = any($2::text[])
  and s.onboarding_status = 'connected'
  and s.compliance_state = 'approved'
  and (
    (coalesce(s.fulfillment_mode, 'email') = 'api'
      and coalesce(nullif(s.api_endpoint, ''), '') <> ''
      and coalesce(nullif(public.resolve_supplier_secret_ref(s.api_secret_ref), ''), nullif(s.api_key, ''), '') <> '')
    or
    (coalesce(s.fulfillment_mode, 'email') = 'email'
      and coalesce(nullif(s.contact_email, ''), nullif(s.email, '')) <> '')
  )
order by s.id, ss.is_primary desc, ss.priority asc
`
	statuses := []string{"approved", "active"}
	rows, err := p.pool.Query(ctx, query, productID, statuses)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]supplierCandidate, 0, 4)
	for rows.Next() {
		var row supplierCandidate
		if err := rows.Scan(&row.ID, &row.Name, &row.Status, &row.Channel, &row.ContactEmail, &row.APIEndpoint, &row.APIKey, &row.SLAHours, &row.Priority, &row.IsPrimary, &row.Rating); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
