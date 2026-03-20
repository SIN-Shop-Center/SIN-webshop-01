package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
)

func connect(ctx context.Context, dsn string) (*pgx.Conn, error) {
	cfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	cfg.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if _, err := conn.Exec(ctx, "select 1"); err != nil {
		conn.Close(ctx)
		return nil, err
	}
	return conn, nil
}

func ensureMigrationsTable(ctx context.Context, conn *pgx.Conn) error {
	_, err := conn.Exec(
		ctx,
		`create table if not exists public.app_migrations (
  id text primary key,
  filename text not null,
  checksum text not null,
  applied_at timestamptz not null default now()
)`,
	)
	return err
}

func readApplied(ctx context.Context, conn *pgx.Conn) (map[string]string, error) {
	rows, err := conn.Query(ctx, "select id, checksum from public.app_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]string{}
	for rows.Next() {
		var id, checksum string
		if err := rows.Scan(&id, &checksum); err != nil {
			return nil, err
		}
		out[id] = checksum
	}
	return out, rows.Err()
}

func applyOne(ctx context.Context, conn *pgx.Conn, mf migrationFile) error {
	sqlBytes, err := os.ReadFile(mf.Path)
	if err != nil {
		return err
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
		return fmt.Errorf("apply_failed file=%s: %w", mf.FileName, err)
	}
	if _, err := tx.Exec(
		ctx,
		"insert into public.app_migrations (id, filename, checksum) values ($1, $2, $3)",
		mf.ID,
		mf.FileName,
		mf.Checksum,
	); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func verifySchema(ctx context.Context, conn *pgx.Conn) error {
	var now time.Time
	if err := conn.QueryRow(ctx, "select now()").Scan(&now); err != nil {
		return err
	}

	var tableCount int
	if err := conn.QueryRow(ctx, "select count(*) from information_schema.tables where table_schema = 'public'").Scan(&tableCount); err != nil {
		return err
	}
	if tableCount == 0 {
		return errors.New("verify_failed:no_public_tables")
	}

	for _, name := range []string{"public.orders", "public.products", "public.queue_jobs", "public.supplier_orders", "public.trend_candidates"} {
		var regclass *string
		if err := conn.QueryRow(ctx, "select to_regclass($1)", name).Scan(&regclass); err != nil {
			return err
		}
		if regclass == nil {
			return fmt.Errorf("verify_failed:missing_table:%s", name)
		}
	}
	return nil
}
