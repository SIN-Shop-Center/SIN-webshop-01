package admin

import (
	"fmt"
	"strings"
)

func supplierWhereClause(p SupplierListParams) (string, []any) {
	where := []string{"1=1"}
	args := make([]any, 0, 8)

	if status := strings.TrimSpace(p.Status); status != "" {
		args = append(args, status)
		where = append(where, fmt.Sprintf("s.status = $%d", len(args)))
	}
	if country := strings.TrimSpace(p.Country); country != "" {
		args = append(args, country)
		where = append(where, fmt.Sprintf("upper(s.country) = upper($%d)", len(args)))
	}
	if onboardingStatus := strings.TrimSpace(p.OnboardingStatus); onboardingStatus != "" {
		args = append(args, onboardingStatus)
		where = append(where, fmt.Sprintf("s.onboarding_status = $%d", len(args)))
	}
	if complianceState := strings.TrimSpace(p.ComplianceState); complianceState != "" {
		args = append(args, complianceState)
		where = append(where, fmt.Sprintf("s.compliance_state = $%d", len(args)))
	}
	if search := strings.TrimSpace(p.Search); search != "" {
		args = append(args, "%"+search+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf("(s.name ilike $%d or s.email ilike $%d or s.website ilike $%d or s.country ilike $%d)", idx, idx, idx, idx))
	}
	return strings.Join(where, " and "), args
}
