package admin

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) ApplySupplierOnboardingCallback(ctx context.Context, body map[string]any) (map[string]any, error) {
	runID := validUUIDOrEmpty(asString(body["run_id"]))
	if runID == "" {
		return nil, errInvalidInput
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	supplierID, currentStatus, err := loadOnboardingCallbackRunContextTx(ctx, tx, runID, body)
	if err != nil {
		return nil, err
	}

	stepStatus := strings.ToLower(strings.TrimSpace(asString(body["step_status"])))
	if stepStatus == "" {
		stepStatus = strings.ToLower(strings.TrimSpace(asString(body["status"])))
	}
	stepType := strings.TrimSpace(asString(body["step_type"]))
	stepOrder := asInt(body["step_order"], 0)
	attemptCount := asInt(body["attempt_count"], 1)
	if attemptCount < 1 {
		attemptCount = 1
	}
	artifactURLs := asStringSlice(body["artifact_urls"])
	redactedLog := strings.TrimSpace(asString(body["redacted_log"]))
	errorMessage := strings.TrimSpace(asString(body["error_message"]))

	outputJSON, err := callbackPayloadJSON(body, "output_payload")
	if err != nil {
		return nil, err
	}
	if stepType != "" && stepStatus == "" {
		stepStatus = "running"
	}
	if err := s.applySupplierOnboardingStepCallbackTx(
		ctx,
		tx,
		runID,
		supplierID,
		stepType,
		stepStatus,
		stepOrder,
		attemptCount,
		outputJSON,
		artifactURLs,
		redactedLog,
		errorMessage,
	); err != nil {
		return nil, err
	}

	runStatus := callbackRunStatus(body, currentStatus)
	resultJSON, err := callbackPayloadJSON(body, "result_payload")
	if err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
update shop.supplier_onboarding_runs
set status = $2,
    started_at = case when $2 in ('running', 'awaiting_human') then coalesce(started_at, now()) else started_at end,
    finished_at = case when $2 in ('succeeded', 'failed', 'cancelled') then coalesce(finished_at, now()) else finished_at end,
    result_payload = coalesce(result_payload, '{}'::jsonb) || $3::jsonb,
    last_error = nullif($4, ''),
    updated_at = now()
where id::text = $1
`, runID, runStatus, resultJSON, errorMessage); err != nil {
		return nil, err
	}

	nextSupplierStatus := supplierStatusFromRun(runStatus)
	if nextSupplierStatus != "" {
		if _, err := tx.Exec(ctx, `
update shop.suppliers
set onboarding_status = $2,
    last_onboarding_run_id = $3::uuid,
    updated_at = now()
where id = $1::uuid
`, supplierID, nextSupplierStatus, runID); err != nil {
			return nil, err
		}
	}

	activitySeverity := callbackActivitySeverity(runStatus)
	if _, err := tx.Exec(ctx, `
insert into shop.supplier_activity_log (supplier_id, run_id, activity_type, severity, actor_type, message, metadata)
values (
  $1::uuid,
  $2::uuid,
  'onboarding.callback',
  $3,
  'automation_runner',
  'Supplier onboarding callback received',
  jsonb_build_object('status', $4, 'step_type', nullif($5, ''), 'step_status', nullif($6, ''), 'artifacts', $7::text[])
)
`, supplierID, runID, activitySeverity, runStatus, stepType, stepStatus, artifactURLs); err != nil {
		return nil, err
	}

	if runStatus == "awaiting_human" {
		if err := ensureAwaitingHumanTaskTx(ctx, tx, supplierID, runID); err != nil {
			return nil, err
		}
	}

	if runStatus == "succeeded" {
		if err := insertOutboxEventTx(ctx, tx, "supplier.registration.completed", "supplier_onboarding_run", runID, map[string]any{
			"run_id":      runID,
			"supplier_id": supplierID,
			"status":      runStatus,
		}); err != nil {
			return nil, err
		}
	}
	if runStatus == "failed" {
		if err := insertOutboxEventTx(ctx, tx, "supplier.registration.failed", "supplier_onboarding_run", runID, map[string]any{
			"run_id":      runID,
			"supplier_id": supplierID,
			"status":      runStatus,
			"error":       errorMessage,
		}); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetSupplierOnboardingRun(ctx, supplierID, runID)
}
