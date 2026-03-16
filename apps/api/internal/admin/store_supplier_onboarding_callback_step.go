package admin

import (
	"context"

	"github.com/jackc/pgx/v5"
)

func (s *Store) applySupplierOnboardingStepCallbackTx(
	ctx context.Context,
	tx pgx.Tx,
	runID string,
	supplierID string,
	stepType string,
	stepStatus string,
	stepOrder int,
	attemptCount int,
	outputJSON string,
	artifactURLs []string,
	redactedLog string,
	errorMessage string,
) error {
	if stepType == "" {
		return nil
	}
	if _, err := tx.Exec(ctx, `
insert into public.supplier_onboarding_steps (
  run_id, supplier_id, step_order, step_type, status, attempt_count, output_payload, artifact_urls, redacted_log, error_message, started_at, finished_at
)
values (
  $1::uuid,
  $2::uuid,
  $3,
  $4,
  $5,
  $6,
  $7::jsonb,
  $8::text[],
  nullif($9, ''),
  nullif($10, ''),
  case when $5 in ('running', 'awaiting_human') then now() else null end,
  case when $5 in ('succeeded', 'failed', 'cancelled') then now() else null end
)
on conflict (run_id, step_order) do update
set step_type = excluded.step_type,
    status = excluded.status,
    attempt_count = greatest(public.supplier_onboarding_steps.attempt_count, excluded.attempt_count),
    output_payload = excluded.output_payload,
    artifact_urls = excluded.artifact_urls,
    redacted_log = excluded.redacted_log,
    error_message = excluded.error_message,
    started_at = coalesce(public.supplier_onboarding_steps.started_at, excluded.started_at),
    finished_at = case
      when excluded.status in ('succeeded', 'failed', 'cancelled') then now()
      else public.supplier_onboarding_steps.finished_at
    end,
    updated_at = now()
`, runID, supplierID, stepOrder, stepType, stepStatus, attemptCount, outputJSON, artifactURLs, redactedLog, errorMessage); err != nil {
		return err
	}

	if stepStatus == "succeeded" || stepStatus == "failed" || stepStatus == "awaiting_human" {
		return insertOutboxEventTx(ctx, tx, "supplier.registration.step.completed", "supplier_onboarding_run", runID, map[string]any{
			"run_id":        runID,
			"supplier_id":   supplierID,
			"step_type":     stepType,
			"step_order":    stepOrder,
			"step_status":   stepStatus,
			"error_message": errorMessage,
		})
	}
	return nil
}
