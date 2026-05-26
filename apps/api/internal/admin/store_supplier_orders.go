package admin

import (
	"context"
	"encoding/json"
	"time"
)

func (s *Store) ListSupplierOrdersByOrder(ctx context.Context, orderID string) ([]SupplierOrderSummary, error) {
	const query = `
select id::text, order_id::text, supplier_id::text, status, channel,
       external_order_id, attempt_count, last_error, placed_at,
       due_at, discount_until, discount_pct, paid_at, cost_amount, cost_currency,
       updated_at
from shop.supplier_orders
where order_id::text = $1
order by updated_at desc
`

	rows, err := s.pool.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]SupplierOrderSummary, 0, 4)
	for rows.Next() {
		var row SupplierOrderSummary
		if err := rows.Scan(
			&row.ID,
			&row.OrderID,
			&row.SupplierID,
			&row.Status,
			&row.Channel,
			&row.ExternalOrderID,
			&row.AttemptCount,
			&row.LastError,
			&row.PlacedAt,
			&row.DueAt,
			&row.DiscountUntil,
			&row.DiscountPct,
			&row.PaidAt,
			&row.CostAmount,
			&row.CostCurrency,
			&row.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (s *Store) TriggerSupplierDispatch(ctx context.Context, orderID, source string) (bool, error) {
	payload, err := json.Marshal(map[string]any{
		"order_id":   orderID,
		"source":     source,
		"triggered":  time.Now().UTC().Format(time.RFC3339),
		"manual_run": true,
	})
	if err != nil {
		return false, err
	}

	const query = `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
select 'supplier.order.requested', 'order', $1, $2::jsonb, 'pending'
where not exists (
  select 1
  from shop.event_outbox
  where event_type = 'supplier.order.requested'
    and aggregate_id = $1
    and created_at >= now() - interval '10 minutes'
    and status in ('pending', 'published')
)
`
	result, err := s.pool.Exec(ctx, query, orderID, string(payload))
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}
