package admin

import (
	"context"
	"encoding/json"
	"time"
)

func (s *Store) TriggerInventoryReorderScan(ctx context.Context, body map[string]any, actorID string) (map[string]any, error) {
	limit := asInt(body["limit"], 50)
	if limit < 1 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}

	payload := map[string]any{
		"requested_at": time.Now().UTC().Format(time.RFC3339),
		"limit":        limit,
		"requested_by": actorID,
		"source":       defaultString(body["source"], "admin_manual_reorder_scan"),
	}

	blob, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	_, err = s.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('inventory.reorder.scan.requested', 'inventory', 'reorder-scan', $1::jsonb, 'pending')
`, string(blob))
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"status":       "queued",
		"requested_at": payload["requested_at"],
		"limit":        limit,
		"source":       payload["source"],
	}, nil
}
