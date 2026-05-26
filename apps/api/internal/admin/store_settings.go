package admin

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

func (s *Store) GetSettings(ctx context.Context) (map[string]any, error) {
	const query = `
select value
from shop.settings
where key = 'shop_settings'
limit 1
`

	settings := copyMap(defaultSettings)
	var raw []byte
	err := s.pool.QueryRow(ctx, query).Scan(&raw)
	if err != nil {
		if err == pgx.ErrNoRows {
			return settings, nil
		}
		return nil, err
	}

	stored := map[string]any{}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &stored); err != nil {
			return nil, err
		}
	}
	for k, v := range stored {
		settings[k] = v
	}
	return settings, nil
}

func (s *Store) UpdateSettings(ctx context.Context, patch map[string]any) (map[string]any, error) {
	blob, err := json.Marshal(patch)
	if err != nil {
		return nil, err
	}

	const query = `
insert into shop.settings (key, value)
values ('shop_settings', $1::jsonb)
on conflict (key) do update
set value = coalesce(shop.settings.value, '{}'::jsonb) || excluded.value,
    updated_at = now()
returning value
`

	var raw []byte
	if err := s.pool.QueryRow(ctx, query, string(blob)).Scan(&raw); err != nil {
		return nil, err
	}

	stored := map[string]any{}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &stored); err != nil {
			return nil, err
		}
	}
	out := copyMap(defaultSettings)
	for k, v := range stored {
		out[k] = v
	}
	return out, nil
}

func copyMap(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
