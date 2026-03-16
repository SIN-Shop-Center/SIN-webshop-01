package admin

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListSupplierOnboardingRuns(ctx context.Context, supplierID string, page, limit int, status string) (SupplierOnboardingRunsPage, error) {
	where := []string{"supplier_id = $1::uuid"}
	args := []any{supplierID}

	if strings.TrimSpace(status) != "" {
		args = append(args, strings.TrimSpace(status))
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	}
	whereClause := strings.Join(where, " and ")

	var total int
	if err := s.pool.QueryRow(ctx, "select count(*) from public.supplier_onboarding_runs where "+whereClause, args...).Scan(&total); err != nil {
		return SupplierOnboardingRunsPage{}, err
	}

	args = append(args, limit, (page-1)*limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select r.id::text as id,
         r.supplier_id::text as supplier_id,
         r.status,
         r.execution_mode,
         r.skill_id,
         r.dry_run,
         r.started_at,
         r.finished_at,
         r.requested_by::text as requested_by,
         r.request_payload,
         r.result_payload,
         r.last_error,
         r.created_at,
         r.updated_at,
         (
           select count(*)
           from public.supplier_onboarding_steps st
           where st.run_id = r.id
         ) as steps_count
  from public.supplier_onboarding_runs r
  where %s
  order by r.created_at desc
  limit $%d offset $%d
) t
`, whereClause, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return SupplierOnboardingRunsPage{}, err
	}

	return SupplierOnboardingRunsPage{
		Items: items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *Store) GetSupplierOnboardingRun(ctx context.Context, supplierID, runID string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select r.id::text as id,
         r.supplier_id::text as supplier_id,
         r.status,
         r.execution_mode,
         r.skill_id,
         r.dry_run,
         r.started_at,
         r.finished_at,
         r.requested_by::text as requested_by,
         r.request_payload,
         r.result_payload,
         r.last_error,
         r.created_at,
         r.updated_at,
         coalesce(
           (
             select jsonb_agg(
               jsonb_build_object(
                 'id', st.id::text,
                 'step_order', st.step_order,
                 'step_type', st.step_type,
                 'status', st.status,
                 'attempt_count', st.attempt_count,
                 'started_at', st.started_at,
                 'finished_at', st.finished_at,
                 'artifact_urls', st.artifact_urls,
                 'error_message', st.error_message,
                 'updated_at', st.updated_at
               )
               order by st.step_order asc, st.created_at asc
             )
             from public.supplier_onboarding_steps st
             where st.run_id = r.id
           ),
           '[]'::jsonb
         ) as steps,
         coalesce(
           (
             select jsonb_agg(
               jsonb_build_object(
                 'id', a.id::text,
                 'activity_type', a.activity_type,
                 'severity', a.severity,
                 'actor_type', a.actor_type,
                 'message', a.message,
                 'metadata', a.metadata,
                 'created_at', a.created_at
               )
               order by a.created_at desc
             )
             from public.supplier_activity_log a
             where a.run_id = r.id
           ),
           '[]'::jsonb
         ) as activity
  from public.supplier_onboarding_runs r
  where r.id::text = $1
    and r.supplier_id::text = $2
  limit 1
) t
`
	return queryJSONObject(ctx, s.pool, query, runID, supplierID)
}
