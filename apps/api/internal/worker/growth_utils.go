package worker

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

func killSwitchDomain(syncType string) string {
	if syncType == "campaign_publish" {
		return "campaign_publish"
	}
	return "channel_sync"
}

func (p *Processor) isChannelReady(ctx context.Context, channel string) (bool, error) {
	const query = `
select exists (
  select 1
  from shop.channel_accounts
  where channel = $1
    and status = any($2::text[])
)
`
	statuses := []string{"connected", "degraded"}
	var ready bool
	if err := p.pool.QueryRow(ctx, query, channel, statuses).Scan(&ready); err != nil {
		return false, err
	}
	return ready, nil
}

func (p *Processor) effectiveDailyBudgetCap(ctx context.Context, channel string) (float64, bool, error) {
	globalCap, globalHardStop, err := p.loadBudgetPolicy(ctx, "global", "all")
	if err != nil {
		return 0, false, err
	}
	channelCap, channelHardStop, err := p.loadBudgetPolicy(ctx, "global", channel)
	if err != nil {
		return 0, false, err
	}

	cap := globalCap
	hardStop := globalHardStop || channelHardStop
	if cap <= 0 || (channelCap > 0 && channelCap < cap) {
		cap = channelCap
	}
	return cap, hardStop, nil
}

func (p *Processor) loadBudgetPolicy(ctx context.Context, scope, channel string) (float64, bool, error) {
	const query = `
select daily_cap, hard_stop
from shop.budget_policies
where scope = $1 and channel = $2
limit 1
`
	var cap float64
	var hardStop bool
	err := p.pool.QueryRow(ctx, query, scope, channel).Scan(&cap, &hardStop)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return cap, hardStop, nil
}

func (p *Processor) channelBudgetUsage(ctx context.Context, channel string) (float64, float64, error) {
	var actualSpend float64
	if err := p.pool.QueryRow(ctx, `
select coalesce(sum(cs.spend_amount), 0)::float8
from shop.campaign_spend_daily cs
join shop.campaigns c on c.id = cs.campaign_id
where c.channel = $1
  and cs.spend_date = now()::date
`, channel).Scan(&actualSpend); err != nil {
		return 0, 0, err
	}

	var reserved float64
	if err := p.pool.QueryRow(ctx, `
select coalesce(sum(c.budget_daily), 0)::float8
from shop.campaigns c
where c.channel = $1
  and c.status in ('active', 'launching')
`, channel).Scan(&reserved); err != nil {
		return 0, 0, err
	}
	return actualSpend, reserved, nil
}

func (p *Processor) withinChannelBudget(ctx context.Context, channel string, requestedDaily float64) (bool, float64, float64, error) {
	cap, hardStop, err := p.effectiveDailyBudgetCap(ctx, channel)
	if err != nil {
		return false, 0, 0, err
	}
	if cap <= 0 || !hardStop {
		return true, cap, 0, nil
	}
	actual, reserved, err := p.channelBudgetUsage(ctx, channel)
	if err != nil {
		return false, 0, 0, err
	}
	projected := reserved + requestedDaily
	if actual > projected {
		projected = actual + requestedDaily
	}
	return projected <= cap, cap, projected, nil
}

func (p *Processor) recordGrowthIncident(ctx context.Context, incidentType, severity, channel, summary string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if severity == "" {
		severity = "warning"
	}
	if channel == "" {
		channel = "all"
	}
	_, err = p.pool.Exec(ctx, `
insert into shop.budget_incidents (channel, incident_type, severity, status, summary, payload)
values ($1, $2, $3, 'open', $4, $5::jsonb)
`, channel, incidentType, severity, summary, string(body))
	return err
}
