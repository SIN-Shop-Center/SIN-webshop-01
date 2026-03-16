package db

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(dsn string) (*pgxpool.Pool, error) {
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	
	// If connecting to Supabase pooler (port 6543) or PgBouncer, 
	// we must disable prepared statement caching to avoid 42P05 errors.
	if strings.Contains(dsn, "pooler.supabase.com:6543") || strings.Contains(dsn, "pgbouncer") {
		cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec
	}

	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnIdleTime = 10 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
