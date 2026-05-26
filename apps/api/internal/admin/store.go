package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) ListOrders(ctx context.Context, status string, limit, offset int) ([]OrderSummary, error) {
	args := []any{limit, offset}
	query := `
select id::text, status, email, currency, total_amount, total, payment_status, created_at, updated_at
from shop.orders
`
	if status != "" {
		query += "where status = $3\n"
		args = append(args, status)
	}
	query += "order by created_at desc\nlimit $1 offset $2"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]OrderSummary, 0, limit)
	for rows.Next() {
		var o OrderSummary
		if err := rows.Scan(&o.ID, &o.Status, &o.Email, &o.Currency, &o.TotalAmount, &o.Total, &o.PaymentStatus, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, o)
	}
	return items, rows.Err()
}

func (s *Store) PatchOrder(ctx context.Context, id string, in PatchOrderInput) (*OrderSummary, error) {
	setParts := make([]string, 0, 5)
	args := make([]any, 0, 8)

	if in.Status != nil {
		args = append(args, *in.Status)
		setParts = append(setParts, fmt.Sprintf("status = $%d", len(args)))
	}
	if in.PaymentStatus != nil {
		args = append(args, *in.PaymentStatus)
		setParts = append(setParts, fmt.Sprintf("payment_status = $%d", len(args)))
	}
	if in.TrackingNumber != nil {
		args = append(args, *in.TrackingNumber)
		setParts = append(setParts, fmt.Sprintf("tracking_number = $%d", len(args)))
	}
	if in.TrackingURL != nil {
		args = append(args, *in.TrackingURL)
		setParts = append(setParts, fmt.Sprintf("tracking_url = $%d", len(args)))
	}
	if in.Notes != nil {
		args = append(args, *in.Notes)
		setParts = append(setParts, fmt.Sprintf("notes = $%d", len(args)))
	}
	if len(setParts) == 0 {
		return nil, fmt.Errorf("empty patch")
	}

	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)

	query := fmt.Sprintf(`
update shop.orders
set %s
where id::text = $%d
returning id::text, status, email, currency, total_amount, total, payment_status, created_at, updated_at
`, strings.Join(setParts, ",\n    "), len(args))

	var out OrderSummary
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&out.ID,
		&out.Status,
		&out.Email,
		&out.Currency,
		&out.TotalAmount,
		&out.Total,
		&out.PaymentStatus,
		&out.CreatedAt,
		&out.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if in.Status != nil || in.TrackingNumber != nil || in.TrackingURL != nil {
		_ = s.emitShipmentUpdatedEvent(ctx, id, out.Status, in.TrackingNumber, in.TrackingURL)
	}
	return &out, nil
}

func (s *Store) GetOrderByID(ctx context.Context, id string) (*OrderSummary, error) {
	const query = `
select id::text, status, email, currency, total_amount, total, payment_status, created_at, updated_at
from shop.orders
where id::text = $1
limit 1
`

	var out OrderSummary
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&out.ID,
		&out.Status,
		&out.Email,
		&out.Currency,
		&out.TotalAmount,
		&out.Total,
		&out.PaymentStatus,
		&out.CreatedAt,
		&out.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func IsNotFound(err error) bool {
	return err == pgx.ErrNoRows
}
