package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
)

func (p *Processor) handleStripeWebhook(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid stripe payload", ErrPermanent)
	}

	externalID := asString(payload["id"])
	if externalID == "" {
		externalID = job.ID
	}
	eventType := asString(payload["type"])
	if eventType == "" {
		eventType = "stripe.webhook.received"
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var inboxID string
	err = tx.QueryRow(ctx, `
insert into shop.event_inbox (external_event_id, event_type, payload, status)
values ($1, $2, $3::jsonb, 'processing')
on conflict (external_event_id) do nothing
returning id::text
`, externalID, eventType, string(job.Payload)).Scan(&inboxID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return tx.Commit(ctx)
		}
		return err
	}

	orderID := normalizeUUID(extractOrderID(payload))
	if orderID != "" {
		_, err = tx.Exec(ctx, `
update shop.orders
set payment_status = 'paid',
    status = case when status = 'created' then 'confirmed' else status end,
    payment_provider = 'stripe',
    payment_reference = $1,
    updated_at = now()
where id::text = $2
`, externalID, orderID)
		if err != nil {
			return err
		}

		eventPayload, err := json.Marshal(map[string]any{
			"order_id":          orderID,
			"external_event_id": externalID,
			"event_type":        eventType,
		})
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('payment.succeeded', 'payment', $1, $2::jsonb, 'pending')
`, orderID, string(eventPayload))
		if err != nil {
			return err
		}
	}

	_, err = tx.Exec(ctx, `
update shop.event_inbox
set status = 'processed', processed_at = now(), updated_at = now(), error_message = null
where id::text = $1
`, inboxID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func extractOrderID(payload map[string]any) string {
	if v := asString(payload["order_id"]); v != "" {
		return v
	}
	data := asMap(payload["data"])
	obj := asMap(data["object"])
	if v := asString(obj["client_reference_id"]); v != "" {
		return v
	}
	metadata := asMap(obj["metadata"])
	if v := asString(metadata["order_id"]); v != "" {
		return v
	}
	if v := asString(metadata["orderId"]); v != "" {
		return v
	}
	return ""
}
