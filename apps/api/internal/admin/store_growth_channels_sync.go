package admin

import (
	"context"
	"encoding/json"
)

func (s *Store) TriggerChannelSync(ctx context.Context, channel, syncType string, options map[string]any) (map[string]any, error) {
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 {
		return nil, errInvalidInput
	}
	channel = normalized[0]

	if blocked, err := s.isGrowthKillSwitchEnabled(ctx, killSwitchDomain(syncType)); err != nil {
		return nil, err
	} else if blocked {
		return nil, errKillSwitch
	}
	ready, err := s.isChannelReady(ctx, channel)
	if err != nil {
		return nil, err
	}
	if !ready {
		_ = s.recordGrowthIncident(ctx, "channel_not_connected", "critical", channel, "Channel sync blocked: channel account not connected", map[string]any{
			"channel":   channel,
			"sync_type": syncType,
		})
		return nil, errNotConnected
	}

	requestedBudget := asFloat(options["spend_cap_daily"], 0)
	if requestedBudget < 0 {
		return nil, errInvalidInput
	}
	if syncType == "campaign_publish" {
		allowed, cap, projected, err := s.canReserveChannelBudget(ctx, channel, requestedBudget)
		if err != nil {
			return nil, err
		}
		if !allowed {
			_ = s.recordGrowthIncident(ctx, "budget_cap_exceeded", "critical", channel, "Campaign publish blocked by budget policy", map[string]any{
				"channel":          channel,
				"sync_type":        syncType,
				"daily_cap":        cap,
				"projected_spend":  projected,
				"requested_budget": requestedBudget,
			})
			return nil, errBudgetCap
		}
	}

	payload := map[string]any{
		"channel":   channel,
		"sync_type": syncType,
		"status":    "queued",
	}
	for key, value := range options {
		payload[key] = value
	}
	const query = `
insert into shop.channel_sync_runs (channel, sync_type, status, requested_payload)
values ($1, $2, 'queued', $3::jsonb)
returning id::text
`
	var id string
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	if err := s.pool.QueryRow(ctx, query, payload["channel"], syncType, string(body)).Scan(&id); err != nil {
		return nil, err
	}
	payload["id"] = id
	if err := s.enqueueChannelSyncEvent(ctx, id, payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func (s *Store) enqueueChannelSyncEvent(ctx context.Context, syncRunID string, payload map[string]any) error {
	eventType := "channel.catalog.sync.requested"
	if asString(payload["sync_type"]) == "campaign_publish" {
		eventType = "channel.campaign.publish.requested"
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ($1, 'channel_sync', $2, $3::jsonb, 'pending')
`, eventType, syncRunID, string(body))
	return err
}

func killSwitchDomain(syncType string) string {
	if syncType == "campaign_publish" {
		return "campaign_publish"
	}
	return "channel_sync"
}
