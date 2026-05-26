package checkout

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

func (s *Store) GetCheckoutSessionStatus(ctx context.Context, sessionID, orderID string) (*CheckoutSessionStatusRecord, error) {
	const query = `
select cs.order_id::text,
       cs.stripe_session_id,
       cs.checkout_url,
       cs.status,
       o.payment_status,
       o.status
from shop.checkout_sessions cs
join shop.orders o on o.id = cs.order_id
where (nullif($1, '') is not null and cs.stripe_session_id = $1)
   or (nullif($2, '') is not null and cs.order_id::text = $2)
order by cs.created_at desc
limit 1
`

	var out CheckoutSessionStatusRecord
	err := s.pool.QueryRow(ctx, query, sessionID, orderID).Scan(
		&out.OrderID,
		&out.StripeSessionID,
		&out.CheckoutURL,
		&out.CheckoutStatus,
		&out.PaymentStatus,
		&out.OrderStatus,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &out, nil
}
