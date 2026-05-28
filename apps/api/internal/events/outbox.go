package events

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

const fetchPendingOutboxSQL = `
select id, event_type, payload
from shop.event_outbox
where status = 'pending'
  and available_at <= now()
order by created_at asc
limit $1
for update skip locked
`

type outboxEvent struct {
	ID        string
	EventType string
	Payload   []byte
}

func queueForEvent(eventType string) string {
	switch eventType {
	case "ai.chat.requested":
		return "ai"
	case "social.post.requested":
		return "social"
	case "order.created",
		"payment.succeeded",
		"supplier.order.requested",
		"supplier.order.placed",
		"supplier.order.failed",
		"supplier.registration.requested",
		"supplier.registration.step.completed",
		"supplier.registration.completed",
		"supplier.registration.failed",
		"trend.candidate.launch.requested",
		"channel.catalog.sync.requested",
		"channel.campaign.publish.requested",
		"fulfillment.started",
		"fulfillment.completed",
		"shipment.updated",
		"trend.analysis.requested",
		"supplier.research.requested",
		"supplier.catalog.sync.requested",
		"inventory.low",
		"ops.weekly.report.requested",
		"cj.tracking.poll",
		"cj.product.sync",
		"cj.balance.check":
		return "automation"
	default:
		return "automation"
	}
}

func ProcessOutbox(ctx context.Context, pool *pgxpool.Pool) (int, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, fetchPendingOutboxSQL, 20)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	events := make([]outboxEvent, 0, 20)
	for rows.Next() {
		var ev outboxEvent
		if err := rows.Scan(&ev.ID, &ev.EventType, &ev.Payload); err != nil {
			return 0, err
		}
		events = append(events, ev)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	processed := 0
	for _, ev := range events {
		queueName := queueForEvent(ev.EventType)

		_, queueErr := tx.Exec(ctx, `
insert into shop.queue_jobs (queue_name, job_type, dedupe_key, payload, status, available_at)
values ($1, $2, $3, $4::jsonb, 'pending', now())
on conflict (queue_name, dedupe_key) do nothing
`, queueName, ev.EventType, ev.ID, string(ev.Payload))
		if queueErr != nil {
			_, _ = tx.Exec(ctx, `
update shop.event_outbox
set status = 'failed',
    attempt_count = attempt_count + 1,
    last_error = $2,
    updated_at = now()
where id = $1
`, ev.ID, truncateErr(queueErr))
			continue
		}

		_, markErr := tx.Exec(ctx, `
update shop.event_outbox
set status = 'published',
    published_at = now(),
    attempt_count = attempt_count + 1,
    last_error = null,
    updated_at = now()
where id = $1
`, ev.ID)
		if markErr != nil {
			return processed, markErr
		}
		processed++
	}

	if err := tx.Commit(ctx); err != nil {
		return processed, err
	}
	return processed, nil
}

func truncateErr(err error) string {
	msg := err.Error()
	const max = 512
	if len(msg) <= max {
		return msg
	}
	return fmt.Sprintf("%s...", msg[:max-3])
}
