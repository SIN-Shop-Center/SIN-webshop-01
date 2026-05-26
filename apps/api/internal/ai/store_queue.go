package ai

import (
	"context"
	"encoding/json"
)

func (s *Store) EnqueueProviderTest(ctx context.Context, payload map[string]any) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	const query = `
insert into shop.queue_jobs (queue_name, job_type, dedupe_key, payload, status)
values ('ai', 'ai.provider.test', gen_random_uuid()::text, $1::jsonb, 'pending')
returning id::text
`

	var id string
	if err := s.pool.QueryRow(ctx, query, string(body)).Scan(&id); err != nil {
		return "", err
	}
	return id, nil
}

func (s *Store) EnqueueChatRequested(ctx context.Context, sessionID string, payload map[string]any) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	const query = `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('ai.chat.requested', 'chat', $1, $2::jsonb, 'pending')
returning id::text
`

	var id string
	if err := s.pool.QueryRow(ctx, query, sessionID, string(body)).Scan(&id); err != nil {
		return "", err
	}
	return id, nil
}
