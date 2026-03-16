package admin

import (
	"context"

	"github.com/jackc/pgx/v5"
)

type productReadyQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func isProductAutopilotReady(ctx context.Context, q productReadyQuerier, productID string) (bool, error) {
	const query = `
select exists (
  with supplier_candidates as (
    select ps.supplier_id
    from public.product_suppliers ps
    where ps.product_id = $1::uuid
      and ps.is_active = true
    union
    select p.supplier_id
    from public.products p
    where p.id = $1::uuid
      and p.supplier_id is not null
  )
  select 1
  from supplier_candidates sc
  join public.suppliers s on s.id = sc.supplier_id
  where s.auto_fulfill_enabled = true
    and s.status in ('approved', 'active')
    and s.onboarding_status = 'connected'
    and s.compliance_state = 'approved'
    and (
      (s.fulfillment_mode = 'api'
        and coalesce(nullif(s.api_endpoint, ''), '') <> ''
        and coalesce(nullif(s.api_secret_ref, ''), nullif(s.api_key, ''), '') <> '')
      or
      (s.fulfillment_mode = 'email' and coalesce(nullif(s.contact_email, ''), nullif(s.email, '')) <> '')
    )
)
`
	var ready bool
	err := q.QueryRow(ctx, query, productID).Scan(&ready)
	return ready, err
}
