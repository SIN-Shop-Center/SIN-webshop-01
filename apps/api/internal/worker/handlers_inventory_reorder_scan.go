package worker

import (
	"context"
	"fmt"
	"time"
)

func (p *Processor) handleInventoryReorderScanRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid reorder scan payload", ErrPermanent)
	}

	limit := 50
	if raw, ok := payload["limit"].(float64); ok {
		limit = int(raw)
	}
	if limit < 1 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}

	exists := false
	if err := p.pool.QueryRow(ctx, `
select exists(
  select 1
  from public.support_tickets
  where status = 'open'
    and coalesce(metadata->>'type', '') = 'reorder_scan'
    and created_at >= now() - interval '6 hours'
)
`).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}

	rows, err := p.pool.Query(ctx, `
select
  p.id::text as product_id,
  coalesce(p.name, '') as product_name,
  coalesce(p.sku, '') as product_sku,
  coalesce(p.stock, 0) as stock,
  s.id::text as supplier_id,
  coalesce(s.name, '') as supplier_name,
  ps.reorder_min_stock,
  ps.reorder_target_stock,
  ps.lead_time_days
from public.product_suppliers ps
join public.products p on p.id = ps.product_id
join public.suppliers s on s.id = ps.supplier_id
where ps.is_active = true
  and p.is_active = true
  and ps.reorder_min_stock is not null
  and coalesce(p.stock, 0) <= ps.reorder_min_stock
order by (ps.reorder_min_stock - coalesce(p.stock, 0)) desc, p.updated_at desc
limit $1
`, limit)
	if err != nil {
		return err
	}
	defer rows.Close()

	candidates := make([]map[string]any, 0, 32)
	for rows.Next() {
		var productID, productName, productSKU, supplierID, supplierName string
		var stock int
		var reorderMin int
		var reorderTarget *int
		var leadTimeDays *int
		if err := rows.Scan(
			&productID,
			&productName,
			&productSKU,
			&stock,
			&supplierID,
			&supplierName,
			&reorderMin,
			&reorderTarget,
			&leadTimeDays,
		); err != nil {
			return err
		}

		target := reorderMin
		if reorderTarget != nil && *reorderTarget >= reorderMin {
			target = *reorderTarget
		}
		recommended := target - stock
		if recommended < 0 {
			recommended = 0
		}

		item := map[string]any{
			"product_id":            productID,
			"product_name":          productName,
			"product_sku":           productSKU,
			"stock":                 stock,
			"supplier_id":           supplierID,
			"supplier_name":         supplierName,
			"reorder_min_stock":     reorderMin,
			"reorder_target_stock":  reorderTarget,
			"lead_time_days":        leadTimeDays,
			"recommended_order_qty": recommended,
			"stock_delta_to_min":    reorderMin - stock,
			"stock_delta_to_target": target - stock,
		}
		candidates = append(candidates, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(candidates) == 0 {
		return nil
	}

	metadata := map[string]any{
		"type":         "reorder_scan",
		"requested_at": time.Now().UTC().Format(time.RFC3339),
		"limit":        limit,
		"count":        len(candidates),
		"candidates":   candidates,
	}

	_, err = p.pool.Exec(ctx, `
insert into public.support_tickets (email, subject, message, status, priority, metadata)
values ('ops@simone.local', 'Reorder candidates', 'Automatischer Hinweis: Produkte unter Reorder-Minimum', 'open', 'high', $1::jsonb)
`, mustJSON(metadata))
	return err
}
