package worker

import (
	"context"
	"encoding/json"
	"fmt"
)

func (p *Processor) handleOrderCreated(ctx context.Context, job Job) error {
	orderID, payload, err := orderIDFromPayload(job)
	if err != nil {
		return err
	}

	_, err = p.pool.Exec(ctx, `
update shop.orders
set status = case when status = 'created' then 'payment_pending' else status end,
    updated_at = now()
where id::text = $1
`, orderID)
	if err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) handlePaymentSucceeded(ctx context.Context, job Job) error {
	orderID, payload, err := orderIDFromPayload(job)
	if err != nil {
		return err
	}

	order, err := p.loadOrderAggregate(ctx, orderID)
	if err != nil {
		return err
	}
	if order == nil {
		return fmt.Errorf("%w: order_not_found", ErrPermanent)
	}
	if order.PaymentStatus != "paid" {
		return fmt.Errorf("order_not_paid_yet")
	}

	invoice, err := p.ensureInvoice(ctx, order)
	if err != nil {
		return err
	}
	if err := p.sendOrderConfirmationEmail(ctx, order, invoice); err != nil {
		return err
	}
	if err := p.sendInvoiceEmail(ctx, order, invoice); err != nil {
		return err
	}
	if err := p.emitSupplierOrderRequested(ctx, orderID, payload); err != nil {
		return err
	}

	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) emitSupplierOrderRequested(ctx context.Context, orderID string, source map[string]any) error {
	payload := map[string]any{
		"order_id":   orderID,
		"started_at": source["occurred_at"],
		"source":     "payment.succeeded",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	_, err = p.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
select 'supplier.order.requested', 'order', $1, $2::jsonb, 'pending'
where not exists (
  select 1 from shop.event_outbox where event_type = 'supplier.order.requested' and aggregate_id = $1
)
`, orderID, string(body))
	return err
}
