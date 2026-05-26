package admin

import (
	"context"
	"encoding/json"
)

func (s *Store) emitShipmentUpdatedEvent(ctx context.Context, orderID, status string, trackingNumber, trackingURL *string) error {
	payload, err := json.Marshal(map[string]any{
		"order_id":        orderID,
		"status":          status,
		"tracking_number": nullableString(trackingNumber),
		"tracking_url":    nullableString(trackingURL),
	})
	if err != nil {
		return err
	}

	_, err = s.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('shipment.updated', 'shipment', $1, $2::jsonb, 'pending')
`, orderID, string(payload))
	return err
}

func nullableString(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}
