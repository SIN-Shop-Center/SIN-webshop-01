package admin

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

type jsonRowsQuerier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

type jsonRowQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func queryJSONRows(ctx context.Context, pool jsonRowsQuerier, query string, args ...any) ([]map[string]any, error) {
	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]map[string]any, 0, 16)
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		item := map[string]any{}
		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &item); err != nil {
				return nil, err
			}
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func queryJSONObject(ctx context.Context, pool jsonRowQuerier, query string, args ...any) (map[string]any, error) {
	var raw []byte
	if err := pool.QueryRow(ctx, query, args...).Scan(&raw); err != nil {
		return nil, err
	}
	obj := map[string]any{}
	if len(raw) == 0 {
		return obj, nil
	}
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil, err
	}
	return obj, nil
}

func notFound(err error) bool {
	return err == pgx.ErrNoRows || err == errNotFound
}
