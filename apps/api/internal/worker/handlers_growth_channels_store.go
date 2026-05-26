package worker

import (
	"context"
	"encoding/json"
)

func (p *Processor) loadChannelSyncRequest(ctx context.Context, runID string) (string, map[string]any, float64, error) {
	var channel string
	var requestedRaw string
	var requestedBudget float64
	err := p.pool.QueryRow(ctx, `
select channel,
       requested_payload::text,
       coalesce(nullif(requested_payload->>'spend_cap_daily', '')::float8, 0)
from shop.channel_sync_runs
where id::text = $1
limit 1
`, runID).Scan(&channel, &requestedRaw, &requestedBudget)
	if err != nil {
		return "", nil, 0, err
	}
	payload := map[string]any{}
	if requestedRaw != "" {
		_ = json.Unmarshal([]byte(requestedRaw), &payload)
	}
	return channel, payload, requestedBudget, nil
}

func (p *Processor) markChannelSyncRunning(ctx context.Context, runID string) error {
	_, err := p.pool.Exec(ctx, `
update shop.channel_sync_runs
set status = 'running',
    started_at = coalesce(started_at, now()),
    updated_at = now()
where id::text = $1
`, runID)
	return err
}

func (p *Processor) markChannelSyncSucceeded(ctx context.Context, runID string, resultPayload map[string]any) error {
	body, err := json.Marshal(resultPayload)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
update shop.channel_sync_runs
set status = 'succeeded',
    result_payload = $2::jsonb,
    error_message = null,
    completed_at = now(),
    updated_at = now()
where id::text = $1
`, runID, string(body))
	return err
}

func (p *Processor) markChannelSyncFailed(ctx context.Context, runID, reason string) error {
	_, err := p.pool.Exec(ctx, `
update shop.channel_sync_runs
set status = 'failed',
    error_message = $2,
    completed_at = now(),
    updated_at = now()
where id::text = $1
`, runID, reason)
	return err
}
