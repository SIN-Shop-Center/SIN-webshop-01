package analytics

import (
	"context"
	"time"
)

func (s *Store) CountWindow(ctx context.Context, since, until time.Time) (WindowCounts, error) {
	const query = `
select
  count(*) filter (where event_type = 'view_product')::int as view_product,
  count(*) filter (where event_type = 'add_to_cart')::int as add_to_cart,
  count(*) filter (where event_type = 'begin_checkout')::int as begin_checkout,
  count(*) filter (where event_type = 'checkout_step_completed')::int as checkout_step_completed,
  count(*) filter (where event_type = 'purchase')::int as purchase,
  count(*) filter (where event_type = 'checkout_error')::int as checkout_error
from shop.analytics_events
where occurred_at >= $1 and occurred_at < $2
`

	var out WindowCounts
	err := s.pool.QueryRow(ctx, query, since, until).Scan(
		&out.ViewProduct,
		&out.AddToCart,
		&out.BeginCheckout,
		&out.CheckoutStepComplete,
		&out.Purchase,
		&out.CheckoutError,
	)
	return out, err
}
