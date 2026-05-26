package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) PatchSupplierOnboardingRun(ctx context.Context, supplierID, runID string, body map[string]any, actorID string) (map[string]any, error) {
	setParts := make([]string, 0, 8)
	args := make([]any, 0, 10)

	appendField := func(column string, value any) {
		args = append(args, value)
		setParts = append(setParts, fmt.Sprintf("%s = $%d", column, len(args)))
	}

	if value, ok := body["status"]; ok {
		appendField("status", strings.ToLower(strings.TrimSpace(asString(value))))
	}
	if value, ok := body["execution_mode"]; ok {
		appendField("execution_mode", strings.ToLower(strings.TrimSpace(asString(value))))
	}
	if value, ok := body["skill_id"]; ok {
		appendField("skill_id", asNullableString(value))
	}
	if value, ok := body["dry_run"]; ok {
		appendField("dry_run", asBool(value, false))
	}
	if value, ok := body["last_error"]; ok {
		appendField("last_error", asNullableString(value))
	}
	if value, ok := body["result_payload"]; ok {
		payloadJSON, err := json.Marshal(value)
		if err != nil {
			return nil, err
		}
		appendField("result_payload", string(payloadJSON))
		setParts[len(setParts)-1] = fmt.Sprintf("result_payload = $%d::jsonb", len(args))
	}

	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}

	runStatus := strings.ToLower(strings.TrimSpace(asString(body["status"])))
	if runStatus == "running" {
		setParts = append(setParts, "started_at = coalesce(started_at, now())")
	}
	if runStatus == "succeeded" || runStatus == "failed" || runStatus == "cancelled" {
		setParts = append(setParts, "finished_at = coalesce(finished_at, now())")
	}
	setParts = append(setParts, "updated_at = now()")

	args = append(args, runID, supplierID)
	updateQuery := fmt.Sprintf(`
update shop.supplier_onboarding_runs
set %s
where id::text = $%d
  and supplier_id::text = $%d
`, strings.Join(setParts, ",\n    "), len(args)-1, len(args))

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, updateQuery, args...)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, pgx.ErrNoRows
	}

	if runStatus != "" {
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
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}
	if _, err := tx.Exec(ctx, `
insert into shop.supplier_activity_log (supplier_id, run_id, activity_type, severity, actor_type, actor_id, message, metadata)
values (
  $1::uuid,
  $2::uuid,
  'onboarding.run.updated',
  'info',
  'admin',
  $3::uuid,
  'Supplier onboarding run updated',
  jsonb_build_object('status', nullif($4, ''), 'last_error', nullif($5, ''))
)
`, supplierID, runID, actorParam, runStatus, asString(body["last_error"])); err != nil {
		return nil, err
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
			"error":       asString(body["last_error"]),
		}); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetSupplierOnboardingRun(ctx, supplierID, runID)
}
