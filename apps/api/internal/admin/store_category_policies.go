package admin

import (
	"context"
	"strings"
)

func (s *Store) listCategoryPolicies(ctx context.Context) ([]CategoryPolicyRule, error) {
	const query = `
select category_key, country, channel, policy_state, reason, updated_at
from shop.category_policies
order by category_key asc, country asc, channel asc
`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]CategoryPolicyRule, 0, 32)
	for rows.Next() {
		var row CategoryPolicyRule
		if err := rows.Scan(&row.CategoryKey, &row.Country, &row.Channel, &row.PolicyState, &row.Reason, &row.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (s *Store) upsertCategoryPolicies(ctx context.Context, rules []CategoryPolicyRule) error {
	if len(rules) == 0 {
		return nil
	}
	for _, rule := range rules {
		policyState := normalizePolicyState(rule.PolicyState)
		if policyState == "" {
			continue
		}
		categoryKey := strings.ToLower(strings.TrimSpace(rule.CategoryKey))
		if categoryKey == "" {
			continue
		}
		country := strings.ToUpper(strings.TrimSpace(rule.Country))
		if country == "" {
			country = "DE"
		}
		channel := strings.ToLower(strings.TrimSpace(rule.Channel))
		if channel == "" {
			channel = "all"
		}
		_, err := s.pool.Exec(ctx, `
insert into shop.category_policies (category_key, country, channel, policy_state, reason)
values ($1, $2, $3, $4, $5)
on conflict (category_key, country, channel) do update
set policy_state = excluded.policy_state,
    reason = excluded.reason,
    updated_at = now()
`, categoryKey, country, channel, policyState, rule.Reason)
		if err != nil {
			return err
		}
	}
	return nil
}

func parseCategoryPoliciesPatch(raw any) []CategoryPolicyRule {
	items, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]CategoryPolicyRule, 0, len(items))
	for _, item := range items {
		entry, ok := item.(map[string]any)
		if !ok {
			continue
		}
		rule := CategoryPolicyRule{
			CategoryKey: strings.ToLower(strings.TrimSpace(asString(entry["category_key"]))),
			Country:     strings.ToUpper(strings.TrimSpace(asString(entry["country"]))),
			Channel:     strings.ToLower(strings.TrimSpace(asString(entry["channel"]))),
			PolicyState: normalizePolicyState(asString(entry["policy_state"])),
			Reason:      asNullableString(entry["reason"]),
		}
		if rule.CategoryKey == "" || rule.PolicyState == "" {
			continue
		}
		if rule.Country == "" {
			rule.Country = "DE"
		}
		if rule.Channel == "" {
			rule.Channel = "all"
		}
		out = append(out, rule)
	}
	return out
}

func normalizePolicyState(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "allow":
		return "allow"
	case "review_required":
		return "review_required"
	case "deny":
		return "deny"
	default:
		return ""
	}
}
