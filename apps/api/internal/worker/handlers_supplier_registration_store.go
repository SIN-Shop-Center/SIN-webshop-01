package worker

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (p *Processor) loadSupplierRegistrationTarget(ctx context.Context, supplierID string) (*supplierRegistrationTarget, error) {
	const query = `
select id::text,
       coalesce(name, ''),
       coalesce(api_endpoint, ''),
       coalesce(registration_url, ''),
       coalesce(portal_url, ''),
       coalesce(website, '')
from public.suppliers
where id::text = $1
limit 1
`
	var target supplierRegistrationTarget
	if err := p.pool.QueryRow(ctx, query, supplierID).Scan(
		&target.ID,
		&target.Name,
		&target.APIEndpoint,
		&target.RegistrationURL,
		&target.PortalURL,
		&target.Website,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &target, nil
}

func pickRegistrationURL(target *supplierRegistrationTarget) string {
	candidates := []string{target.RegistrationURL, target.PortalURL, target.Website}
	for _, candidate := range candidates {
		if strings.TrimSpace(candidate) != "" {
			return strings.TrimSpace(candidate)
		}
	}
	return ""
}

func (p *Processor) markOnboardingRunRunning(ctx context.Context, runID string) error {
	_, err := p.pool.Exec(ctx, `
update public.supplier_onboarding_runs
set status = 'running',
    started_at = coalesce(started_at, now()),
    updated_at = now()
where id::text = $1
  and status in ('queued', 'running', 'awaiting_human')
`, runID)
	return err
}

func (p *Processor) markOnboardingRunFinished(ctx context.Context, runID, supplierID, status string, resultPayload map[string]any, errorMessage string) error {
	blob, err := json.Marshal(resultPayload)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
update public.supplier_onboarding_runs
set status = $2,
    result_payload = coalesce(result_payload, '{}'::jsonb) || $3::jsonb,
    finished_at = now(),
    last_error = nullif($4, ''),
    updated_at = now()
where id::text = $1
`, runID, status, string(blob), errorMessage)
	if err != nil {
		return err
	}

	onboardingStatus := "applied"
	switch status {
	case "succeeded":
		onboardingStatus = "connected"
	case "failed":
		onboardingStatus = "rejected"
	case "awaiting_human":
		onboardingStatus = "awaiting_access"
	}
	_, err = p.pool.Exec(ctx, `
update public.suppliers
set onboarding_status = $2,
    last_onboarding_run_id = $3::uuid,
    updated_at = now()
where id::text = $1
`, supplierID, onboardingStatus, runID)
	return err
}

func (p *Processor) upsertOnboardingStep(ctx context.Context, runID, supplierID string, stepOrder int, stepType, status string, output map[string]any, artifactURLs []string, errorMessage string) error {
	blob, err := json.Marshal(output)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
insert into public.supplier_onboarding_steps (
  run_id, supplier_id, step_order, step_type, status, attempt_count, output_payload, artifact_urls, error_message, started_at, finished_at
)
values (
  $1::uuid,
  $2::uuid,
  $3,
  $4,
  $5,
  1,
  $6::jsonb,
  $7::text[],
  nullif($8, ''),
  case when $5 in ('running', 'awaiting_human') then now() else null end,
  case when $5 in ('succeeded', 'failed', 'cancelled') then now() else null end
)
on conflict (run_id, step_order) do update
set step_type = excluded.step_type,
    status = excluded.status,
    output_payload = excluded.output_payload,
    artifact_urls = excluded.artifact_urls,
    error_message = excluded.error_message,
    started_at = coalesce(public.supplier_onboarding_steps.started_at, excluded.started_at),
    finished_at = case
      when excluded.status in ('succeeded', 'failed', 'cancelled') then now()
      else public.supplier_onboarding_steps.finished_at
    end,
    updated_at = now()
`, runID, supplierID, stepOrder, stepType, status, string(blob), artifactURLs, errorMessage)
	return err
}

func (p *Processor) appendOnboardingActivity(ctx context.Context, supplierID, runID, activityType, severity, message string, metadata map[string]any) error {
	blob, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
insert into public.supplier_activity_log (supplier_id, run_id, activity_type, severity, actor_type, message, metadata)
values ($1::uuid, $2::uuid, $3, $4, 'worker', $5, $6::jsonb)
`, supplierID, runID, activityType, severity, message, string(blob))
	return err
}
