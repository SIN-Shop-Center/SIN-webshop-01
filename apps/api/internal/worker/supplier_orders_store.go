package worker

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

type supplierOrderState struct {
	Status       string
	AttemptCount int
}

func (p *Processor) getSupplierOrderState(ctx context.Context, orderID, supplierID string) (*supplierOrderState, error) {
	const query = `
select status, attempt_count
from shop.supplier_orders
where order_id::text = $1
  and supplier_id::text = $2
limit 1
`
	var out supplierOrderState
	err := p.pool.QueryRow(ctx, query, orderID, supplierID).Scan(&out.Status, &out.AttemptCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (p *Processor) markSupplierOrderDispatching(ctx context.Context, orderID string, placement supplierPlacement, requestPayload map[string]any) error {
	body, err := json.Marshal(requestPayload)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
insert into shop.supplier_orders (
  order_id, supplier_id, status, channel, request_payload, response_payload, attempt_count, last_error
)
values ($1::uuid, $2::uuid, 'dispatching', $3, $4::jsonb, '{}'::jsonb, 1, null)
on conflict (order_id, supplier_id) do update
set status = 'dispatching',
    channel = excluded.channel,
    request_payload = excluded.request_payload,
    attempt_count = shop.supplier_orders.attempt_count + 1,
    last_error = null,
    updated_at = now()
where shop.supplier_orders.status <> 'placed'
`, orderID, placement.Supplier.ID, placement.Supplier.Channel, string(body))
	return err
}

func (p *Processor) markSupplierOrderPlaced(ctx context.Context, orderID string, placement supplierPlacement, result supplierDispatchResult) error {
	body, err := json.Marshal(result.ResponsePayload)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
update shop.supplier_orders
set status = 'placed',
    response_payload = $3::jsonb,
    external_order_id = nullif($4, ''),
    placed_at = now(),
    last_error = null,
    updated_at = now()
where order_id::text = $1
  and supplier_id::text = $2
`, orderID, placement.Supplier.ID, string(body), result.ExternalOrderID)
	return err
}

func (p *Processor) markSupplierOrderFailed(ctx context.Context, orderID string, placement supplierPlacement, reason string, responsePayload map[string]any) error {
	body, err := json.Marshal(responsePayload)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
update shop.supplier_orders
set status = 'failed',
    response_payload = $3::jsonb,
    last_error = $4,
    updated_at = now()
where order_id::text = $1
  and supplier_id::text = $2
`, orderID, placement.Supplier.ID, string(body), reason)
	return err
}

func (p *Processor) emitSupplierOrderEvent(ctx context.Context, eventType, orderID string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ($1, 'order', $2, $3::jsonb, 'pending')
`, eventType, orderID, string(body))
	return err
}

func (p *Processor) emitFulfillmentCompleted(ctx context.Context, orderID string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
select 'fulfillment.completed', 'order', $1, $2::jsonb, 'pending'
where not exists (
  select 1
  from shop.event_outbox
  where event_type = 'fulfillment.completed'
    and aggregate_id = $1
)
`, orderID, string(body))
	return err
}
