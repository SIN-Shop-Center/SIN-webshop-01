package social

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) EnqueueRun(ctx context.Context, target string, payload map[string]any) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	eventType := fmt.Sprintf("automation.%s.run", target)
	switch target {
	case "trend":
		eventType = "trend.analysis.requested"
	case "supplier":
		eventType = "supplier.research.requested"
	case "social":
		eventType = "social.post.requested"
	}

	const query = `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ($1, 'automation', gen_random_uuid()::text, $2::jsonb, 'pending')
returning id::text
`

	var id string
	if err := s.pool.QueryRow(ctx, query, eventType, string(body)).Scan(&id); err != nil {
		return "", err
	}
	return id, nil
}
