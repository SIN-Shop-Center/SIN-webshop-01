package worker

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

const defaultUGCStageCacheTTL = 7 * 24 * time.Hour

func buildUGCStageCacheKey(stage string, input any) (string, error) {
	raw, err := json.Marshal(map[string]any{
		"stage": stage,
		"input": input,
	})
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

func (p *Processor) loadUGCStageCache(ctx context.Context, stage, cacheKey string) (map[string]any, bool, error) {
	var raw []byte
	err := p.pool.QueryRow(ctx, `
select payload
from shop.ugc_generation_stage_cache
where stage = $1
  and cache_key = $2
  and (expires_at is null or expires_at > now())
limit 1
`, stage, cacheKey).Scan(&raw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, false, nil
		}
		return nil, false, err
	}
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, false, err
	}
	return payload, true, nil
}

func (p *Processor) storeUGCStageCache(ctx context.Context, stage, provider, cacheKey string, payload map[string]any, ttl time.Duration) error {
	if ttl <= 0 {
		ttl = defaultUGCStageCacheTTL
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	expiresAt := time.Now().UTC().Add(ttl)
	_, err = p.pool.Exec(ctx, `
insert into shop.ugc_generation_stage_cache (stage, provider, cache_key, payload, expires_at)
values ($1, $2, $3, $4::jsonb, $5)
on conflict (cache_key) do update
set provider = excluded.provider,
    payload = excluded.payload,
    expires_at = excluded.expires_at,
    updated_at = now()
`, stage, provider, cacheKey, string(raw), expiresAt)
	return err
}
