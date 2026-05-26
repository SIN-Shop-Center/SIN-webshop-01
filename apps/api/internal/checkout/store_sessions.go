package checkout

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type SaveCheckoutSessionInput struct {
	IdempotencyKey  string
	OrderID         string
	StripeSessionID string
	CheckoutURL     string
	Status          string
	CustomerEmail   string
	Currency        string
	AmountTotal     int
	ExpiresAt       *time.Time
}

func (s *Store) GetCheckoutSessionByIdempotency(ctx context.Context, idempotencyKey string) (*CheckoutSessionRecord, error) {
	const query = `
select order_id::text, checkout_url, stripe_session_id, status, customer_email, currency, amount_total
from shop.checkout_sessions
where idempotency_key = $1
`

	var row CheckoutSessionRecord
	err := s.pool.QueryRow(ctx, query, idempotencyKey).Scan(
		&row.OrderID,
		&row.CheckoutURL,
		&row.StripeSessionID,
		&row.Status,
		&row.CustomerEmail,
		&row.Currency,
		&row.AmountTotal,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func (s *Store) UpsertCheckoutSession(ctx context.Context, in SaveCheckoutSessionInput) (*CheckoutSessionRecord, error) {
	const query = `
insert into shop.checkout_sessions (
  idempotency_key, order_id, stripe_session_id, checkout_url, status,
  customer_email, currency, amount_total, expires_at
)
values ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
on conflict (idempotency_key) do update set
  stripe_session_id = excluded.stripe_session_id,
  checkout_url = excluded.checkout_url,
  status = excluded.status,
  customer_email = excluded.customer_email,
  currency = excluded.currency,
  amount_total = excluded.amount_total,
  expires_at = excluded.expires_at,
  updated_at = now()
returning order_id::text, checkout_url, stripe_session_id, status, customer_email, currency, amount_total
`

	var out CheckoutSessionRecord
	err := s.pool.QueryRow(ctx, query,
		in.IdempotencyKey,
		in.OrderID,
		in.StripeSessionID,
		in.CheckoutURL,
		in.Status,
		in.CustomerEmail,
		in.Currency,
		in.AmountTotal,
		in.ExpiresAt,
	).Scan(
		&out.OrderID,
		&out.CheckoutURL,
		&out.StripeSessionID,
		&out.Status,
		&out.CustomerEmail,
		&out.Currency,
		&out.AmountTotal,
	)
	if err != nil {
		return nil, err
	}

	_, err = s.pool.Exec(ctx, `
update shop.orders
set payment_provider = 'stripe',
    payment_reference = $1,
    updated_at = now()
where id::text = $2
`, out.StripeSessionID, out.OrderID)
	if err != nil {
		return nil, err
	}

	return &out, nil
}
