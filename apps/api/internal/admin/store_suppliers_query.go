package admin

import (
	"context"
	"fmt"
)

func (s *Store) ListSuppliers(ctx context.Context, p SupplierListParams) ([]map[string]any, int, error) {
	where, args := supplierWhereClause(p)
	countQuery := "select count(*) from public.suppliers s where " + where
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortCol := pickSortColumn(p.SortBy, "s.created_at", map[string]string{
		"created_at":        "s.created_at",
		"updated_at":        "s.updated_at",
		"name":              "s.name",
		"status":            "s.status",
		"rating":            "s.rating",
		"country":           "s.country",
		"onboarding_status": "s.onboarding_status",
		"compliance_state":  "s.compliance_state",
	})
	sortOrder := normalizeSortOrder(p.SortOrder)
	args = append(args, p.Limit, (p.Page-1)*p.Limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select s.id::text as id,
         s.name,
         s.email,
         s.contact_email,
         s.phone,
         s.website,
         s.api_endpoint,
          s.fulfillment_mode,
          s.auto_fulfill_enabled,
          s.sla_hours,
          s.sla_ack_hours,
          s.sla_fulfillment_hours,
          (coalesce(nullif(s.api_secret_ref, ''), '') <> '') as has_secret,

         s.status,
         s.rating,
         s.notes,
         s.contact_person,
         s.country,
         s.shipping_time_days,
         s.minimum_order,
         s.onboarding_status,
         s.registration_url,
         s.portal_url,
         s.compliance_state,
         s.specialization_tags,
         s.payment_terms_days,
         s.early_payment_discount_pct,
         s.early_payment_discount_days,
         s.last_onboarding_run_id::text as last_onboarding_run_id,
         s.metadata,
         s.created_at,
         s.updated_at,
         (select count(*) from public.products p where p.supplier_id = s.id) as products_count
  from public.suppliers s
  where %s
  order by %s %s
  limit $%d offset $%d
) t
`, where, sortCol, sortOrder, len(args)-1, len(args))
	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}
func (s *Store) GetSupplier(ctx context.Context, id string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select s.id::text as id,
         s.name,
         s.email,
         s.contact_email,
         s.phone,
         s.website,
         s.api_endpoint,
          s.fulfillment_mode,
          s.auto_fulfill_enabled,
          s.sla_hours,
          s.sla_ack_hours,
          s.sla_fulfillment_hours,
          (coalesce(nullif(s.api_secret_ref, ''), '') <> '') as has_secret,

         s.status,
         s.rating,
         s.notes,
         s.contact_person,
         s.country,
         s.shipping_time_days,
         s.minimum_order,
         s.onboarding_status,
         s.registration_url,
         s.portal_url,
         s.compliance_state,
         s.specialization_tags,
         s.payment_terms_days,
         s.early_payment_discount_pct,
         s.early_payment_discount_days,
         s.last_onboarding_run_id::text as last_onboarding_run_id,
         s.metadata,
         s.created_at,
         s.updated_at,
         coalesce(
           (
             select row_to_json(creds)::jsonb
             from (
               select provider,
                      username,
                      metadata,
                      last_rotated_at,
                      (coalesce(nullif(secret_ref, ''), '') <> '') as has_secret
               from public.supplier_credentials_refs
               where supplier_id = s.id
               order by updated_at desc
               limit 1
             ) creds
           ),
           '{}'::jsonb
         ) as credential_summary,
         coalesce(
           (
             select row_to_json(r)::jsonb
             from (
               select id::text,
                      status,
                      execution_mode,
                      skill_id,
                      dry_run,
                      started_at,
                      finished_at,
                      updated_at
               from public.supplier_onboarding_runs
               where supplier_id = s.id
               order by created_at desc
               limit 1
             ) r
           ),
           '{}'::jsonb
         ) as latest_run,
         coalesce(
           (
             select jsonb_agg(jsonb_build_object('id', p.id::text, 'name', p.name, 'price', p.price, 'stock', p.stock, 'is_active', p.is_active))
             from public.products p
             where p.supplier_id = s.id
           ),
           '[]'::jsonb
         ) as products
  from public.suppliers s
  where s.id::text = $1
  limit 1
) t
`
	return queryJSONObject(ctx, s.pool, query, id)
}
