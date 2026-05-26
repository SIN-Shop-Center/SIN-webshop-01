package suppliers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) ProcessWebhook(ctx context.Context, supplierSlug string, payload WebhookPayload) (bool, error) {
	eventType := eventTypeForStatus(payload.Status)
	eventPayload, err := json.Marshal(map[string]any{
		"supplier":          strings.TrimSpace(supplierSlug),
		"external_event_id": payload.EventID,
		"order_id":          payload.OrderID,
		"status":            strings.ToLower(strings.TrimSpace(payload.Status)),
		"tracking_number":   payload.TrackingNumber,
		"tracking_url":      payload.TrackingURL,
		"external_order_id": payload.ExternalOrderID,
		"raw":               payload.Raw,
	})
	if err != nil {
		return false, err
	}

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
`, payload.EventID, eventType, string(eventPayload)).Scan(&inboxID)
	if err == pgx.ErrNoRows {
		return true, tx.Commit(ctx)
	}
	if err != nil {
		return false, err
	}

	_, err = tx.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ($1, 'order', $2, $3::jsonb, 'pending')
`, eventType, payload.OrderID, string(eventPayload))
	if err != nil {
		return false, err
	}

	_, err = tx.Exec(ctx, `
update shop.event_inbox
set status = 'processed',
    processed_at = now(),
    error_message = null,
    updated_at = now()
where id::text = $1
`, inboxID)
	if err != nil {
		return false, err
	}

	return false, tx.Commit(ctx)
}

func (s *Store) ValidateAPIKey(ctx context.Context, apiKey string) (string, []string, error) {
	if !strings.HasPrefix(apiKey, "sup_") {
		return "", nil, nil
	}
	parts := strings.Split(apiKey, "_")
	if len(parts) != 3 {
		return "", nil, nil
	}
	prefix := parts[1]
	secret := parts[2]

	hash := sha256.Sum256([]byte(prefix + "." + secret))
	hashHex := hex.EncodeToString(hash[:])

	var supplierID string
	var scopes []string
	err := s.pool.QueryRow(ctx, `
select supplier_id::text, scopes
from shop.supplier_api_keys
where key_prefix = $1
  and key_hash = $2
  and revoked_at is null
limit 1
`, prefix, hashHex).Scan(&supplierID, &scopes)
	if err == pgx.ErrNoRows {
		return "", nil, nil
	}
	if err != nil {
		return "", nil, err
	}

	_, _ = s.pool.Exec(ctx, `update shop.supplier_api_keys set last_used_at = now() where key_prefix = $1 and key_hash = $2`, prefix, hashHex)

	return supplierID, scopes, nil
}

func eventTypeForStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "placed", "accepted", "confirmed", "supplier_ordered":
		return "supplier.order.placed"
	case "failed", "error", "rejected", "cancelled":
		return "supplier.order.failed"
	default:
		return "shipment.updated"
	}
}
