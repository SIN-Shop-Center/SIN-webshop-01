package worker

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) Dequeue(ctx context.Context, queueName string, limit int, workerName string) ([]Job, error) {
	const query = `
select id::text,
       queue_name,
       job_type,
       coalesce(dedupe_key, ''),
       payload::text,
       attempt_count,
       max_attempts
from shop.dequeue_jobs($1, $2, $3)
`

	rows, err := s.pool.Query(ctx, query, queueName, limit, workerName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := make([]Job, 0, limit)
	for rows.Next() {
		var j Job
		var payload string
		if err := rows.Scan(&j.ID, &j.QueueName, &j.JobType, &j.DedupeKey, &payload, &j.Attempt, &j.MaxAttempts); err != nil {
			return nil, err
		}
		j.Payload = []byte(payload)
		jobs = append(jobs, j)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return jobs, nil
}

func (s *Store) MarkSucceeded(ctx context.Context, id string) error {
	const query = `
update shop.queue_jobs
set status = 'succeeded',
    locked_at = null,
    locked_by = null,
    updated_at = now(),
    last_error = null
where id::text = $1
`
	_, err := s.pool.Exec(ctx, query, id)
	return err
}

func (s *Store) MarkFailed(ctx context.Context, j Job, err error) error {
	reason := truncateErr(err)
	if j.Attempt >= j.MaxAttempts {
		if dlqErr := s.moveToDLQ(ctx, j, reason); dlqErr != nil {
			return dlqErr
		}
		_, updErr := s.pool.Exec(ctx, `
update shop.queue_jobs
set status = 'dead_letter',
    locked_at = null,
    locked_by = null,
    updated_at = now(),
    last_error = $2
where id::text = $1
`, j.ID, reason)
		return updErr
	}

	backoffSeconds := retryBackoffSeconds(j.Attempt)
	_, updErr := s.pool.Exec(ctx, `
update shop.queue_jobs
set status = 'pending',
    locked_at = null,
    locked_by = null,
    available_at = now() + ($2 || ' seconds')::interval,
    updated_at = now(),
    last_error = $3
where id::text = $1
`, j.ID, fmt.Sprintf("%d", backoffSeconds), reason)
	return updErr
}

func (s *Store) moveToDLQ(ctx context.Context, j Job, reason string) error {
	const query = `
insert into shop.queue_dead_letter (queue_job_id, queue_name, job_type, payload, reason)
values ($1::uuid, $2, $3, $4::jsonb, $5)
`
	_, err := s.pool.Exec(ctx, query, j.ID, j.QueueName, j.JobType, string(j.Payload), reason)
	if err != nil {
		return err
	}
	return s.recordDLQIncident(ctx, j, reason)
}

func retryBackoffSeconds(attempt int) int {
	if attempt <= 1 {
		return 5
	}
	seconds := 1 << min(attempt, 7)
	if seconds > 300 {
		return 300
	}
	return seconds
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func truncateErr(err error) string {
	msg := err.Error()
	const max = 500
	if len(msg) <= max {
		return msg
	}
	return msg[:max]
}
