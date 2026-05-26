package admin

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

type budgetPolicyRow struct {
	DailyCap float64
	HardStop bool
}

func (s *Store) getBudgetPolicyOptional(ctx context.Context, scope, channel string) (*budgetPolicyRow, error) {
	const query = `
select daily_cap, hard_stop
from shop.budget_policies
where scope = $1 and channel = $2
limit 1
`
	var row budgetPolicyRow
	err := s.pool.QueryRow(ctx, query, scope, channel).Scan(&row.DailyCap, &row.HardStop)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *Store) effectiveDailyBudgetCap(ctx context.Context, channel string) (float64, bool, error) {
	global, err := s.getBudgetPolicyOptional(ctx, "global", "all")
	if err != nil {
		return 0, false, err
	}
	byChannel, err := s.getBudgetPolicyOptional(ctx, "global", channel)
	if err != nil {
		return 0, false, err
	}

	cap := 0.0
	hardStop := false
	if global != nil {
		cap = global.DailyCap
		hardStop = global.HardStop
	}
	if byChannel != nil {
		if cap <= 0 || (byChannel.DailyCap > 0 && byChannel.DailyCap < cap) {
			cap = byChannel.DailyCap
		}
		hardStop = hardStop || byChannel.HardStop
	}
	return cap, hardStop, nil
}

func (s *Store) calculateChannelBudgetUsage(ctx context.Context, channel string) (float64, float64, error) {
	var actualSpend float64
	if err := s.pool.QueryRow(ctx, `
select coalesce(sum(cs.spend_amount), 0)::float8
from shop.campaign_spend_daily cs
join shop.campaigns c on c.id = cs.campaign_id
where c.channel = $1
  and cs.spend_date = now()::date
`, channel).Scan(&actualSpend); err != nil {
		return 0, 0, err
	}

	var reservedSpend float64
	if err := s.pool.QueryRow(ctx, `
select coalesce(sum(c.budget_daily), 0)::float8
from shop.campaigns c
where c.channel = $1
  and c.status in ('active', 'launching')
`, channel).Scan(&reservedSpend); err != nil {
		return 0, 0, err
	}

	return actualSpend, reservedSpend, nil
}

func (s *Store) canReserveChannelBudget(ctx context.Context, channel string, requestedDaily float64) (bool, float64, float64, error) {
	cap, hardStop, err := s.effectiveDailyBudgetCap(ctx, channel)
	if err != nil {
		return false, 0, 0, err
	}
	if cap <= 0 || !hardStop {
		return true, cap, 0, nil
	}
	actualSpend, reservedSpend, err := s.calculateChannelBudgetUsage(ctx, channel)
	if err != nil {
		return false, 0, 0, err
	}
	projected := reservedSpend + requestedDaily
	if actualSpend > projected {
		projected = actualSpend + requestedDaily
	}
	return projected <= cap, cap, projected, nil
}

func (s *Store) recordGrowthIncident(ctx context.Context, incidentType, severity, channel, summary string, payload map[string]any) error {
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
	_, err = s.pool.Exec(ctx, `
insert into shop.budget_incidents (channel, incident_type, severity, status, summary, payload)
values ($1, $2, $3, 'open', $4, $5::jsonb)
`, channel, incidentType, severity, summary, string(body))
	return err
}
