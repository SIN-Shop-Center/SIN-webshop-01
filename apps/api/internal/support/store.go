package support

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) FindCustomerByUser(ctx context.Context, userID string) (string, error) {
	var customerID string
	err := s.pool.QueryRow(ctx, `select id::text from shop.customers where auth_user_id::text = $1 limit 1`, userID).Scan(&customerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return customerID, nil
}
