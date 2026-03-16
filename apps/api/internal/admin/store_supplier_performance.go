package admin

import (
	"context"
)

func (s *Store) GetSupplierPerformance(ctx context.Context, supplierID string, windowDays int) (map[string]any, error) {
	if windowDays < 1 {
		windowDays = 30
	}
	if windowDays > 365 {
		windowDays = 365
	}

	const query = `
select row_to_json(t)::jsonb
from (
  select
    s.id::text as supplier_id,
    $2::int as window_days,
    jsonb_build_object(
      'total', count(so.id),
      'placed', count(*) filter (where so.status = 'placed'),
      'failed', count(*) filter (where so.status = 'failed'),
      'dispatching', count(*) filter (where so.status = 'dispatching'),
      'pending', count(*) filter (where so.status = 'pending'),
      'cancelled', count(*) filter (where so.status = 'cancelled'),
      'on_time_rate', coalesce(lat.on_time_rate, 0),
      'avg_place_latency_seconds', coalesce(lat.avg_seconds, 0),
      'p95_place_latency_seconds', coalesce(lat.p95_seconds, 0)
    ) as metrics
  from public.suppliers s
  left join public.supplier_orders so
    on so.supplier_id = s.id
   and so.created_at >= now() - ($2 || ' days')::interval
  left join lateral (
    select
      avg(extract(epoch from (so2.placed_at - so2.created_at))) as avg_seconds,
      percentile_cont(0.95) within group (order by extract(epoch from (so2.placed_at - so2.created_at))) as p95_seconds,
      avg(case when so2.placed_at <= so2.created_at + (s.sla_hours || ' hours')::interval then 1 else 0 end) as on_time_rate
    from public.supplier_orders so2
    where so2.supplier_id = s.id
      and so2.status = 'placed'
      and so2.placed_at is not null
      and so2.created_at >= now() - ($2 || ' days')::interval
  ) lat on true
  where s.id::text = $1
  group by s.id, lat.avg_seconds, lat.p95_seconds, lat.on_time_rate
  limit 1
) t
`

	return queryJSONObject(ctx, s.pool, query, supplierID, windowDays)
}
