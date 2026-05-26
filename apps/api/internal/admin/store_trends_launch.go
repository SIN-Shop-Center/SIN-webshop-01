package admin

import (
	"context"
)

func (s *Store) LaunchTrendCandidate(ctx context.Context, candidateID string, channels []string, spendCapDaily float64) ([]TrendLaunchSummary, error) {
	if blocked, err := s.isGrowthKillSwitchEnabled(ctx, "campaign_publish"); err != nil {
		return nil, err
	} else if blocked {
		return nil, errKillSwitch
	}
	if spendCapDaily < 0 {
		return nil, errInvalidInput
	}

	normalized := normalizeChannels(channels)
	if len(normalized) == 0 {
		return nil, errInvalidInput
	}

	var decision string
	err := s.pool.QueryRow(ctx, `select decision_state from shop.trend_candidates where id::text = $1`, candidateID).Scan(&decision)
	if err != nil {
		return nil, err
	}
	if decision != "allow" {
		return nil, errBlocked
	}
	policy, err := s.GetTrendPolicy(ctx)
	if err != nil {
		return nil, err
	}
	guard, err := s.loadTrendLaunchGuardContext(ctx, candidateID)
	if err != nil {
		return nil, err
	}

	out := make([]TrendLaunchSummary, 0, len(normalized))
	for _, channel := range normalized {
		ready, err := s.isChannelReady(ctx, channel)
		if err != nil {
			return nil, err
		}
		if !ready {
			_ = s.recordGrowthIncident(ctx, "channel_not_connected", "critical", channel, "Trend launch blocked: channel account not connected", map[string]any{
				"trend_candidate_id": candidateID,
				"channel":            channel,
			})
			return nil, errNotConnected
		}

		for _, country := range guard.CountryScope {
			resolved := resolveTrendDecision(policy.DefaultDecision, policy.CountryDefaults, policy.ChannelDefaults, country, channel)
			categoryPolicy, err := s.resolveCategoryPolicy(ctx, guard.CategoryKey, country, channel)
			if err != nil {
				return nil, err
			}
			if categoryPolicy != "" {
				resolved = categoryPolicy
			}
			if resolved == "deny" {
				_ = s.recordGrowthIncident(ctx, "policy_denied", "critical", channel, "Trend launch blocked by category policy", map[string]any{
					"trend_candidate_id": candidateID,
					"channel":            channel,
					"country":            country,
					"category_key":       guard.CategoryKey,
				})
				return nil, errCompliance
			}
			blockedByCompliance, ruleKey, err := s.hasComplianceBlock(ctx, country, channel)
			if err != nil {
				return nil, err
			}
			if blockedByCompliance {
				_ = s.recordGrowthIncident(ctx, "compliance_blocked", "critical", channel, "Trend launch blocked by active compliance rule", map[string]any{
					"trend_candidate_id": candidateID,
					"channel":            channel,
					"country":            country,
					"category_key":       guard.CategoryKey,
					"rule_key":           ruleKey,
				})
				return nil, errCompliance
			}
		}

		allowed, cap, projected, err := s.canReserveChannelBudget(ctx, channel, spendCapDaily)
		if err != nil {
			return nil, err
		}
		if !allowed {
			_ = s.recordGrowthIncident(ctx, "budget_cap_exceeded", "critical", channel, "Trend launch blocked by budget policy", map[string]any{
				"trend_candidate_id": candidateID,
				"channel":            channel,
				"daily_cap":          cap,
				"projected_spend":    projected,
				"requested_budget":   spendCapDaily,
			})
			return nil, errBudgetCap
		}

		item, created, err := s.upsertTrendLaunch(ctx, candidateID, channel, spendCapDaily)
		if err != nil {
			return nil, err
		}
		if created {
			if err := s.enqueueTrendLaunchEvent(ctx, item); err != nil {
				return nil, err
			}
		}
		out = append(out, *item)
	}

	_, _ = s.pool.Exec(ctx, `
update shop.trend_candidates
set lifecycle_state = 'launched',
    updated_at = now()
where id::text = $1
`, candidateID)

	return out, nil
}
