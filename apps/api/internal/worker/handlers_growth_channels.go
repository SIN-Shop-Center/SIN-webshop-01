package worker

import (
	"context"
	"errors"
	"fmt"
)

func (p *Processor) handleChannelCatalogSyncRequested(ctx context.Context, job Job) error {
	return p.handleChannelSyncRequested(ctx, job, "catalog")
}

func (p *Processor) handleChannelCampaignPublishRequested(ctx context.Context, job Job) error {
	return p.handleChannelSyncRequested(ctx, job, "campaign_publish")
}

func (p *Processor) handleChannelSyncRequested(ctx context.Context, job Job, syncType string) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid channel sync payload", ErrPermanent)
	}
	runID := sanitizeIdentifier(asString(payload["id"]), asString(payload["sync_run_id"]))
	if runID == "" {
		return fmt.Errorf("%w: missing sync run id", ErrPermanent)
	}

	if blocked, err := p.isGrowthKillSwitchEnabled(ctx, killSwitchDomain(syncType)); err != nil {
		return err
	} else if blocked {
		_, _ = p.pool.Exec(ctx, `
update shop.channel_sync_runs
set status = 'failed',
    error_message = 'kill_switch_enabled',
    completed_at = now(),
    updated_at = now()
where id::text = $1
`, runID)
		return nil
	}

	channel, requestedPayload, requestedBudget, err := p.loadChannelSyncRequest(ctx, runID)
	if err != nil {
		return err
	}
	ready, err := p.isChannelReady(ctx, channel)
	if err != nil {
		return err
	}
	if !ready {
		_ = p.recordGrowthIncident(ctx, "channel_not_connected", "critical", channel, "Channel sync blocked: channel account not connected", map[string]any{
			"sync_run_id": runID,
			"channel":     channel,
			"sync_type":   syncType,
		})
		_, _ = p.pool.Exec(ctx, `
update shop.channel_sync_runs
set status = 'failed',
    error_message = 'channel_not_connected',
    completed_at = now(),
    updated_at = now()
where id::text = $1
`, runID)
		return nil
	}
	if syncType == "campaign_publish" {
		allowed, cap, projected, err := p.withinChannelBudget(ctx, channel, requestedBudget)
		if err != nil {
			return err
		}
		if !allowed {
			_ = p.recordGrowthIncident(ctx, "budget_cap_exceeded", "critical", channel, "Campaign publish blocked by budget policy", map[string]any{
				"sync_run_id":      runID,
				"channel":          channel,
				"daily_cap":        cap,
				"projected_spend":  projected,
				"requested_budget": requestedBudget,
			})
			_, _ = p.pool.Exec(ctx, `
update shop.channel_sync_runs
set status = 'failed',
    error_message = format('budget_cap_exceeded (cap=%s projected=%s)', $2, $3),
    completed_at = now(),
    updated_at = now()
where id::text = $1
`, runID, cap, projected)
			return nil
		}
	}

	if err := p.markChannelSyncRunning(ctx, runID); err != nil {
		return err
	}

	resultPayload, err := p.executeChannelSync(ctx, channel, syncType, runID, requestedPayload)
	if err != nil {
		severity := "warning"
		if errors.Is(err, ErrPermanent) {
			severity = "critical"
		}
		_ = p.recordGrowthIncident(ctx, "channel_api_error", severity, channel, "Channel API sync failed", map[string]any{
			"sync_run_id": runID,
			"channel":     channel,
			"sync_type":   syncType,
			"error":       truncateErr(err),
		})
		_ = p.markChannelSyncFailed(ctx, runID, truncateErr(err))
		return err
	}
	return p.markChannelSyncSucceeded(ctx, runID, resultPayload)
}
