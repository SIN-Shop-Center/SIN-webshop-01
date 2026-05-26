package admin

import "context"

func (s *Store) GetAutomationHealth(ctx context.Context) (AutomationHealth, error) {
	policy, err := s.GetAutomationPolicy(ctx)
	if err != nil {
		return AutomationHealth{}, err
	}

	pending, err := s.countSupplierOrders(ctx, "pending", "dispatching")
	if err != nil {
		return AutomationHealth{}, err
	}
	failed, err := s.countSupplierOrders(ctx, "failed")
	if err != nil {
		return AutomationHealth{}, err
	}
	dlq, err := s.countCriticalDLQ(ctx)
	if err != nil {
		return AutomationHealth{}, err
	}
	lag, err := s.paymentWithoutSupplierMinutes(ctx)
	if err != nil {
		return AutomationHealth{}, err
	}

	ready := policy.CatalogEnabled &&
		policy.CheckoutEnabled &&
		policy.SupplierFulfillmentEnabled &&
		policy.MailingEnabled &&
		dlq == 0 &&
		failed == 0 &&
		lag <= policy.AlertThresholdMinutes

	return AutomationHealth{
		Policy:                       policy,
		PendingSupplierOrders:        pending,
		FailedSupplierOrders:         failed,
		CriticalDLQJobs:              dlq,
		PaymentWithoutSupplierMinute: lag,
		Ready:                        ready,
	}, nil
}

func (s *Store) countSupplierOrders(ctx context.Context, statuses ...string) (int, error) {
	const query = `
select count(*)
from shop.supplier_orders
where status = any($1::text[])
`
	var out int
	err := s.pool.QueryRow(ctx, query, statuses).Scan(&out)
	return out, err
}

func (s *Store) countCriticalDLQ(ctx context.Context) (int, error) {
	const query = `
select count(*)
from shop.queue_dead_letter
where job_type = any($1::text[])
`
	critical := []string{"payment.succeeded", "supplier.order.requested", "shipment.updated"}
	var out int
	err := s.pool.QueryRow(ctx, query, critical).Scan(&out)
	return out, err
}

func (s *Store) paymentWithoutSupplierMinutes(ctx context.Context) (int, error) {
	const query = `
select coalesce(max(extract(epoch from (now() - o.updated_at)) / 60)::int, 0)
from shop.orders o
where o.payment_status = 'paid'
  and not exists (
    select 1
    from shop.supplier_orders so
    where so.order_id = o.id
      and so.status = 'placed'
  )
`
	var out int
	err := s.pool.QueryRow(ctx, query).Scan(&out)
	return out, err
}
