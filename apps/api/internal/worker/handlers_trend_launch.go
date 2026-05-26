package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

func (p *Processor) handleTrendCandidateLaunchRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid trend launch payload", ErrPermanent)
	}
	launchID := sanitizeIdentifier(asString(payload["trend_launch_id"]), asString(payload["launch_id"]))
	if launchID == "" {
		return fmt.Errorf("%w: missing trend launch id", ErrPermanent)
	}

	if blocked, err := p.isGrowthKillSwitchEnabled(ctx, "campaign_publish"); err != nil {
		return err
	} else if blocked {
		_, _ = p.pool.Exec(ctx, `
update shop.trend_launches
set status = 'paused',
    outcome = jsonb_build_object('reason', 'kill_switch_enabled', 'at', $2),
    updated_at = now()
where id::text = $1
`, launchID, time.Now().UTC().Format(time.RFC3339))
		return nil
	}

	var candidateID string
	var channel string
	var spendCap float64
	err = p.pool.QueryRow(ctx, `
select trend_candidate_id::text, channel, spend_cap_daily
from shop.trend_launches
where id::text = $1
limit 1
`, launchID).Scan(&candidateID, &channel, &spendCap)
	if err != nil {
		return err
	}
	ready, err := p.isChannelReady(ctx, channel)
	if err != nil {
		return err
	}
	if !ready {
		_ = p.recordGrowthIncident(ctx, "channel_not_connected", "critical", channel, "Trend launch blocked: channel account not connected", map[string]any{
			"trend_launch_id":    launchID,
			"trend_candidate_id": candidateID,
			"channel":            channel,
		})
		_, _ = p.pool.Exec(ctx, `
update shop.trend_launches
set status = 'failed',
    outcome = jsonb_build_object('reason', 'channel_not_connected', 'channel', $2, 'at', $3),
    updated_at = now()
where id::text = $1
`, launchID, channel, time.Now().UTC().Format(time.RFC3339))
		return nil
	}
	allowed, cap, projected, err := p.withinChannelBudget(ctx, channel, spendCap)
	if err != nil {
		return err
	}
	if !allowed {
		_ = p.recordGrowthIncident(ctx, "budget_cap_exceeded", "critical", channel, "Trend launch blocked by budget policy", map[string]any{
			"trend_launch_id":    launchID,
			"trend_candidate_id": candidateID,
			"channel":            channel,
			"daily_cap":          cap,
			"projected_spend":    projected,
			"requested_budget":   spendCap,
		})
		_, _ = p.pool.Exec(ctx, `
update shop.trend_launches
set status = 'failed',
    outcome = jsonb_build_object(
      'reason', 'budget_cap_exceeded',
      'channel', $2,
      'daily_cap', $3,
      'projected_spend', $4,
      'at', $5
    ),
    updated_at = now()
where id::text = $1
`, launchID, channel, cap, projected, time.Now().UTC().Format(time.RFC3339))
		return nil
	}

	providerResult, externalCampaignID, err := p.publishTrendLaunch(ctx, channel, launchID, candidateID, spendCap)
	if err != nil {
		_ = p.recordGrowthIncident(ctx, "channel_api_error", "critical", channel, "Trend launch failed during provider publish", map[string]any{
			"trend_launch_id":    launchID,
			"trend_candidate_id": candidateID,
			"channel":            channel,
			"error":              truncateErr(err),
		})
		_, _ = p.pool.Exec(ctx, `
update shop.trend_launches
set status = 'failed',
    outcome = jsonb_build_object('reason', 'provider_publish_failed', 'channel', $2, 'error', $3, 'at', $4),
    updated_at = now()
where id::text = $1
`, launchID, channel, truncateErr(err), time.Now().UTC().Format(time.RFC3339))
		return err
	}
	providerBody, err := json.Marshal(providerResult)
	if err != nil {
		return err
	}

	_, err = p.pool.Exec(ctx, `
insert into shop.campaigns (channel, trend_candidate_id, name, objective, status, budget_daily, external_campaign_id, payload, metadata, launched_at)
values ($1, $2::uuid, $3, 'sales', 'active', $4, nullif($5, ''), $6::jsonb, '{}'::jsonb, now())
on conflict do nothing
`, channel, candidateID, "Trend-"+launchID, spendCap, externalCampaignID, string(providerBody))
	if err != nil {
		return err
	}

	launchOutcome, err := json.Marshal(map[string]any{
		"status":            "active",
		"channel":           channel,
		"activated_at":      time.Now().UTC().Format(time.RFC3339),
		"external_campaign": externalCampaignID,
		"provider_result":   providerResult,
	})
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
update shop.trend_launches
set status = 'active',
    started_at = coalesce(started_at, now()),
    outcome = $2::jsonb,
    updated_at = now()
where id::text = $1
`, launchID, string(launchOutcome))
	return err
}
