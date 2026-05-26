package admin

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) CreateSupplierOnboardingRun(ctx context.Context, supplierID string, body map[string]any, actorID string) (map[string]any, error) {
	executionMode := strings.ToLower(strings.TrimSpace(asString(body["execution_mode"])))
	if executionMode == "" {
		executionMode = "hybrid"
	}
	if executionMode != "api" && executionMode != "browser" && executionMode != "hybrid" {
		return nil, errInvalidInput
	}

	status := strings.ToLower(strings.TrimSpace(asString(body["status"])))
	if status == "" {
		status = "queued"
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var existingRunID string
	err = tx.QueryRow(ctx, `
select id::text
from shop.supplier_onboarding_runs
where supplier_id = $1::uuid
  and status in ('queued', 'running', 'awaiting_human')
order by created_at desc
limit 1
for update
`, supplierID).Scan(&existingRunID)
	if err == nil && existingRunID != "" {
		return nil, errAlreadyRunning
	}
	if err != nil && err != pgx.ErrNoRows {
		return nil, err
	}

	requestPayload := map[string]any{}
	if raw, ok := body["request_payload"]; ok && raw != nil {
		if typed, ok := raw.(map[string]any); ok {
			requestPayload = typed
		}
	}
	requestJSON, err := json.Marshal(requestPayload)
	if err != nil {
		return nil, err
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}

	var runID string
	if err := tx.QueryRow(ctx, `
insert into shop.supplier_onboarding_runs (
  supplier_id, status, execution_mode, skill_id, dry_run, requested_by, request_payload
)
values (
  $1::uuid, $2, $3, nullif($4, ''), $5, $6::uuid, $7::jsonb
)
returning id::text
`, supplierID, status, executionMode, asString(body["skill_id"]), asBool(body["dry_run"], false), actorParam, string(requestJSON)).Scan(&runID); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
update shop.suppliers
set last_onboarding_run_id = $2::uuid,
    onboarding_status = coalesce(nullif(onboarding_status, ''), 'new'),
    updated_at = now()
where id = $1::uuid
`, supplierID, runID); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
insert into shop.supplier_activity_log (supplier_id, run_id, activity_type, severity, actor_type, actor_id, message, metadata)
values (
  $1::uuid,
  $2::uuid,
  'onboarding.run.created',
  'info',
  'admin',
  $3::uuid,
  'Supplier onboarding run created',
  jsonb_build_object('execution_mode', $4, 'dry_run', $5)
)
`, supplierID, runID, actorParam, executionMode, asBool(body["dry_run"], false)); err != nil {
		return nil, err
	}

	eventPayload := map[string]any{
		"run_id":          runID,
		"supplier_id":     supplierID,
		"execution_mode":  executionMode,
		"skill_id":        asString(body["skill_id"]),
		"dry_run":         asBool(body["dry_run"], false),
		"requested_by":    actorUUID,
		"request_payload": requestPayload,
	}
	if err := insertOutboxEventTx(ctx, tx, "supplier.registration.requested", "supplier_onboarding_run", runID, eventPayload); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetSupplierOnboardingRun(ctx, supplierID, runID)
}
