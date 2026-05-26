package checkout

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

func (s *Store) ProcessStripeEvent(ctx context.Context, in StripeEventEnvelope) (bool, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	var inboxID string
	err = tx.QueryRow(ctx, `
insert into shop.event_inbox (external_event_id, event_type, payload, status)
values ($1, $2, $3::jsonb, 'processing')
on conflict (external_event_id) do nothing
returning id::text
`, in.EventID, in.EventType, string(in.Payload)).Scan(&inboxID)
	if err == pgx.ErrNoRows {
		return true, tx.Commit(ctx)
	}
	if err != nil {
		return false, err
	}

	orderID, err := s.resolveOrderIDForEvent(ctx, tx, in.OrderID, in.SessionID)
	if err != nil {
		return false, err
	}
	if orderID != "" {
		if err := s.applyOrderTransition(ctx, tx, orderID, in); err != nil {
			return false, err
		}
	}

	_, err = tx.Exec(ctx, `
update shop.event_inbox
set status = 'processed', processed_at = now(), updated_at = now(), error_message = null
where id::text = $1
`, inboxID)
	if err != nil {
		return false, err
	}

	return false, tx.Commit(ctx)
}

func (s *Store) resolveOrderIDForEvent(ctx context.Context, tx pgx.Tx, orderID, sessionID string) (string, error) {
	if orderID != "" || sessionID == "" {
		return orderID, nil
	}
	var resolved string
	err := tx.QueryRow(ctx, `
select order_id::text
from shop.checkout_sessions
where stripe_session_id = $1
`, sessionID).Scan(&resolved)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	return resolved, err
}

func (s *Store) applyOrderTransition(ctx context.Context, tx pgx.Tx, orderID string, in StripeEventEnvelope) error {
	transition := transitionForEventType(in.EventType)
	if transition == "" {
		return nil
	}
	res, err := tx.Exec(ctx, `
update shop.orders
set payment_status = $1,
    status = $2,
    payment_provider = 'stripe',
    payment_reference = coalesce(nullif($3, ''), payment_reference),
    updated_at = now()
where id::text = $4
  and payment_status <> 'paid'
`, transition, orderStatusForPayment(transition), in.SessionID, orderID)
	if err != nil {
		return err
	}
	if in.SessionID != "" && res.RowsAffected() > 0 {
		_, err = tx.Exec(ctx, `
update shop.checkout_sessions
set status = $1, updated_at = now()
where stripe_session_id = $2
`, transition, in.SessionID)
		if err != nil {
			return err
		}
	}
	if transition == "paid" && res.RowsAffected() > 0 {
		body, err := json.Marshal(map[string]any{
			"order_id":          orderID,
			"external_event_id": in.EventID,
			"event_type":        in.EventType,
			"stripe_session_id": in.SessionID,
		})
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('payment.succeeded', 'payment', $1, $2::jsonb, 'pending')
`, orderID, string(body))
		if err != nil {
			return err
		}
	}
	return nil
}

func transitionForEventType(eventType string) string {
	switch eventType {
	case "checkout.session.completed", "checkout.session.async_payment_succeeded":
		return "paid"
	case "checkout.session.expired", "payment_intent.payment_failed":
		return "payment_failed"
	default:
		return ""
	}
}

func orderStatusForPayment(paymentStatus string) string {
	if paymentStatus == "paid" {
		return "confirmed"
	}
	return "payment_failed"
}
