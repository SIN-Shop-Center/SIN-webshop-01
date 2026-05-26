package admin

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *Store) GetBudgetPolicy(ctx context.Context, scope, channel string) (BudgetPolicy, error) {
	const query = `
select scope, channel, daily_cap, weekly_cap, monthly_cap, target_mer, target_roas, hard_stop, updated_at
from shop.budget_policies
where scope = $1 and channel = $2
limit 1
`
	var out BudgetPolicy
	err := s.pool.QueryRow(ctx, query, scope, channel).Scan(
		&out.Scope,
		&out.Channel,
		&out.DailyCap,
		&out.WeeklyCap,
		&out.MonthlyCap,
		&out.TargetMER,
		&out.TargetROAS,
		&out.HardStop,
		&out.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		_, insErr := s.pool.Exec(ctx, `
insert into shop.budget_policies (scope, channel, daily_cap, weekly_cap, monthly_cap, target_mer, target_roas, hard_stop)
values ($1, $2, 2500, 17500, 75000, 2.5, 3.0, true)
on conflict (scope, channel) do nothing
`, scope, channel)
		if insErr != nil {
			return BudgetPolicy{}, insErr
		}
		return s.GetBudgetPolicy(ctx, scope, channel)
	}
	return out, err
}

func (s *Store) UpdateBudgetPolicy(ctx context.Context, scope, channel string, patch map[string]any) (BudgetPolicy, error) {
	current, err := s.GetBudgetPolicy(ctx, scope, channel)
	if err != nil {
		return BudgetPolicy{}, err
	}
	next := current
	if v, ok := patch["daily_cap"]; ok {
		next.DailyCap = asFloat(v, next.DailyCap)
	}
	if v, ok := patch["weekly_cap"]; ok {
		next.WeeklyCap = asFloat(v, next.WeeklyCap)
	}
	if v, ok := patch["monthly_cap"]; ok {
		next.MonthlyCap = asFloat(v, next.MonthlyCap)
	}
	if v, ok := patch["target_mer"]; ok {
		next.TargetMER = asFloat(v, next.TargetMER)
	}
	if v, ok := patch["target_roas"]; ok {
		next.TargetROAS = asFloat(v, next.TargetROAS)
	}
	if v, ok := patch["hard_stop"]; ok {
		next.HardStop = asBool(v, next.HardStop)
	}

	const query = `
update shop.budget_policies
set daily_cap = $3,
    weekly_cap = $4,
    monthly_cap = $5,
    target_mer = $6,
    target_roas = $7,
    hard_stop = $8,
    updated_at = now()
where scope = $1 and channel = $2
returning scope, channel, daily_cap, weekly_cap, monthly_cap, target_mer, target_roas, hard_stop, updated_at
`
	err = s.pool.QueryRow(
		ctx,
		query,
		scope,
		channel,
		next.DailyCap,
		next.WeeklyCap,
		next.MonthlyCap,
		next.TargetMER,
		next.TargetROAS,
		next.HardStop,
	).Scan(
		&next.Scope,
		&next.Channel,
		&next.DailyCap,
		&next.WeeklyCap,
		&next.MonthlyCap,
		&next.TargetMER,
		&next.TargetROAS,
		&next.HardStop,
		&next.UpdatedAt,
	)
	if err != nil {
		return BudgetPolicy{}, err
	}
	next.UpdatedAt = time.Now().UTC()
	return next, nil
}
