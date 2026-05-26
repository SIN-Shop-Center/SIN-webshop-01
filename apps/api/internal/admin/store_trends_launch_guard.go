package admin

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
)

type trendLaunchGuardContext struct {
	CategoryKey  string
	CountryScope []string
}

func (s *Store) loadTrendLaunchGuardContext(ctx context.Context, candidateID string) (*trendLaunchGuardContext, error) {
	const query = `
select coalesce(lower(c.slug), lower(c.name), 'uncategorized'),
       coalesce(tc.country_scope, '{DE}'::text[])
from shop.trend_candidates tc
left join shop.products p on p.id = tc.product_id
left join shop.categories c on c.id = p.category_id
where tc.id::text = $1
limit 1
`

	out := &trendLaunchGuardContext{}
	err := s.pool.QueryRow(ctx, query, candidateID).Scan(&out.CategoryKey, &out.CountryScope)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, pgx.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	out.CategoryKey = strings.TrimSpace(strings.ToLower(out.CategoryKey))
	if out.CategoryKey == "" {
		out.CategoryKey = "uncategorized"
	}
	out.CountryScope = normalizeCountryScope(out.CountryScope)
	if len(out.CountryScope) == 0 {
		out.CountryScope = []string{"DE"}
	}
	return out, nil
}

func normalizeCountryScope(items []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(items))
	for _, item := range items {
		code := strings.ToUpper(strings.TrimSpace(item))
		if code == "" {
			continue
		}
		if _, ok := seen[code]; ok {
			continue
		}
		seen[code] = struct{}{}
		out = append(out, code)
	}
	return out
}

func (s *Store) isChannelReady(ctx context.Context, channel string) (bool, error) {
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
	if err := s.pool.QueryRow(ctx, query, channel, statuses).Scan(&ready); err != nil {
		return false, err
	}
	return ready, nil
}

func resolveTrendDecision(defaultDecision string, countryDefaults, channelDefaults map[string]any, country, channel string) string {
	countryDecision := normalizePolicyState(asString(countryDefaults[strings.ToUpper(country)]))
	channelDecision := normalizePolicyState(asString(channelDefaults[strings.ToLower(channel)]))
	defaultResolved := normalizePolicyState(defaultDecision)
	if defaultResolved == "" {
		defaultResolved = "review_required"
	}
	switch {
	case countryDecision == "deny" || channelDecision == "deny":
		return "deny"
	case countryDecision == "review_required" || channelDecision == "review_required":
		return "review_required"
	case countryDecision == "allow" || channelDecision == "allow":
		return "allow"
	default:
		return defaultResolved
	}
}

func (s *Store) resolveCategoryPolicy(ctx context.Context, categoryKey, country, channel string) (string, error) {
	const query = `
select policy_state
from shop.category_policies
where category_key = $1
  and country = $2
  and channel = any($3::text[])
order by case when channel = $4 then 0 else 1 end
limit 1
`
	var state string
	channels := []string{channel, "all"}
	err := s.pool.QueryRow(ctx, query, categoryKey, country, channels, channel).Scan(&state)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return normalizePolicyState(state), nil
}

func (s *Store) hasComplianceBlock(ctx context.Context, country, channel string) (bool, string, error) {
	const query = `
select rule_key
from shop.compliance_rules
where state = 'active'
  and country = any($1::text[])
  and channel = any($2::text[])
  and (
    coalesce((rule_definition->>'block_launch')::boolean, false)
    or lower(severity) in ('critical', 'blocker')
  )
order by case when country = $3 then 0 else 1 end,
         case when channel = $4 then 0 else 1 end
limit 1
`
	countries := []string{country, "all"}
	channels := []string{channel, "all"}
	var ruleKey string
	err := s.pool.QueryRow(ctx, query, countries, channels, country, channel).Scan(&ruleKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, "", nil
	}
	if err != nil {
		return false, "", err
	}
	return true, ruleKey, nil
}
