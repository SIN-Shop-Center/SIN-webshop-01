package admin

import "context"

func (s *Store) paymentToSupplierRate(ctx context.Context) (float64, error) {
	const query = `
with paid_orders as (
  select id
  from shop.orders
  where payment_status = 'paid'
    and created_at >= now() - interval '14 days'
),
supplier_ok as (
  select distinct so.order_id
  from shop.supplier_orders so
  join paid_orders p on p.id = so.order_id
  where so.status = 'placed'
)
select
  coalesce((select count(*)::float8 from paid_orders), 0) as paid_count,
  coalesce((select count(*)::float8 from supplier_ok), 0) as supplier_count
`
	var paid float64
	var supplier float64
	if err := s.pool.QueryRow(ctx, query).Scan(&paid, &supplier); err != nil {
		return 0, err
	}
	if paid <= 0 {
		return 0, nil
	}
	return (supplier / paid) * 100, nil
}

func (s *Store) paymentToConfirmationMailRate(ctx context.Context) (float64, error) {
	const query = `
with paid_orders as (
  select id
  from shop.orders
  where payment_status = 'paid'
    and created_at >= now() - interval '14 days'
),
mail_ok as (
  select distinct e.order_id
  from shop.email_log e
  join paid_orders p on p.id = e.order_id
  where e.email_type = 'order_confirmation'
    and e.status = 'sent'
)
select
  coalesce((select count(*)::float8 from paid_orders), 0) as paid_count,
  coalesce((select count(*)::float8 from mail_ok), 0) as mail_count
`
	var paid float64
	var sent float64
	if err := s.pool.QueryRow(ctx, query).Scan(&paid, &sent); err != nil {
		return 0, err
	}
	if paid <= 0 {
		return 0, nil
	}
	return (sent / paid) * 100, nil
}

func (s *Store) criticalDLQ24h(ctx context.Context) (float64, error) {
	const query = `
select count(*)::float8
from shop.queue_dead_letter
where created_at >= now() - interval '24 hours'
  and job_type = any($1::text[])
`
	criticalJobs := []string{
		"payment.succeeded",
		"supplier.order.requested",
		"supplier.order.placed",
		"channel.campaign.publish.requested",
	}
	var count float64
	if err := s.pool.QueryRow(ctx, query, criticalJobs).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (s *Store) channelEventMatchRate(ctx context.Context) (float64, error) {
	const query = `
with paid_orders as (
  select id
  from shop.orders
  where payment_status = 'paid'
    and created_at >= now() - interval '14 days'
),
attributed as (
  select distinct a.order_id
  from shop.attributed_orders a
  join paid_orders p on p.id = a.order_id
)
select
  coalesce((select count(*)::float8 from paid_orders), 0),
  coalesce((select count(*)::float8 from attributed), 0)
`
	var paid float64
	var matched float64
	if err := s.pool.QueryRow(ctx, query).Scan(&paid, &matched); err != nil {
		return 0, err
	}
	if paid <= 0 {
		return 0, nil
	}
	return (matched / paid) * 100, nil
}

func (s *Store) adminToChannelLatencyP95(ctx context.Context) (float64, error) {
	const query = `
select coalesce(
  percentile_cont(0.95) within group (order by extract(epoch from (completed_at - created_at))),
  0
)::float8
from shop.channel_sync_runs
where completed_at is not null
  and status = any($1::text[])
  and created_at >= now() - interval '7 days'
`
	doneStatuses := []string{"succeeded", "failed"}
	var seconds float64
	if err := s.pool.QueryRow(ctx, query, doneStatuses).Scan(&seconds); err != nil {
		return 0, err
	}
	return seconds / 60.0, nil
}
