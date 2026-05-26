package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5"
)

func supplierStatusFromRun(runStatus string) string {
	switch strings.ToLower(strings.TrimSpace(runStatus)) {
	case "queued":
		return "applied"
	case "running":
		return "applied"
	case "awaiting_human":
		return "awaiting_access"
	case "succeeded":
		return "connected"
	case "failed":
		return "rejected"
	default:
		return ""
	}
}

func insertOutboxEventTx(ctx context.Context, tx pgx.Tx, eventType, aggregateType, aggregateID string, payload map[string]any) error {
	blob, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ($1, $2, $3, $4::jsonb, 'pending')
`, eventType, aggregateType, aggregateID, string(blob))
	return err
}

func ensureAwaitingHumanTaskTx(ctx context.Context, tx pgx.Tx, supplierID, runID string) error {
	_, err := tx.Exec(ctx, `
insert into shop.crm_tasks (
  entity_type, entity_id, title, description, status, priority, source, metadata
)
select
  'supplier',
  $1,
  'Supplier onboarding requires human action',
  'Captcha or 2FA blocked the autonomous registration. Continue manually.',
  'open',
  'high',
  'automation',
  jsonb_build_object('run_id', $2)
where not exists (
  select 1
  from shop.crm_tasks t
  where t.entity_type = 'supplier'
    and t.entity_id = $1
    and t.status in ('open', 'in_progress', 'blocked')
    and coalesce(t.metadata->>'run_id', '') = $2
)
`, supplierID, runID)
	return err
}

func isAllowedSupplierDomain(metadata map[string]any, rawURL string) bool {
	allowlist := extractDomainAllowlist(metadata)
	if len(allowlist) == 0 {
		return true
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	host := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
	if host == "" {
		return false
	}
	for _, allowed := range allowlist {
		normalized := strings.ToLower(strings.TrimSpace(allowed))
		if normalized == "" {
			continue
		}
		if host == normalized || strings.HasSuffix(host, "."+normalized) {
			return true
		}
	}
	return false
}

func extractDomainAllowlist(metadata map[string]any) []string {
	candidates := []any{
		metadata["onboarding_allowlist"],
		metadata["domain_allowlist"],
	}
	for _, candidate := range candidates {
		switch typed := candidate.(type) {
		case []string:
			return typed
		case []any:
			out := make([]string, 0, len(typed))
			for _, item := range typed {
				value := strings.TrimSpace(fmt.Sprint(item))
				if value != "" {
					out = append(out, value)
				}
			}
			return out
		}
	}
	return nil
}
