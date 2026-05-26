package analytics

import (
	"context"
	"encoding/json"
	"time"
)

func (s *Store) InsertEvent(ctx context.Context, in EventInput, requestID, userAgent, ipAddress string) error {
	if in.OccurredAt.IsZero() {
		in.OccurredAt = time.Now().UTC()
	}
	if in.Payload == nil {
		in.Payload = map[string]any{}
	}
	body, err := json.Marshal(in.Payload)
	if err != nil {
		return err
	}

	const query = `
insert into shop.analytics_events (
  event_type,
  occurred_at,
  segment,
  route,
  payload,
  request_id,
  user_agent,
  ip_address
) values ($1, $2, nullif($3, ''), nullif($4, ''), $5::jsonb, nullif($6, ''), nullif($7, ''), nullif($8, ''))
`

	_, err = s.pool.Exec(ctx, query,
		in.Type,
		in.OccurredAt,
		in.Segment,
		in.Route,
		string(body),
		requestID,
		userAgent,
		ipAddress,
	)
	return err
}
