package admin

import (
	"context"
	"encoding/json"
	"strings"
)

func (s *Store) ListCreators(ctx context.Context, limit, offset int) ([]map[string]any, error) {
	const query = `
select row_to_json(t)
from (
  select id::text, handle, platform, status, region, score, metadata, created_at, updated_at
  from shop.creators
  order by updated_at desc
  limit $1 offset $2
) t
`
	return queryJSONRows(ctx, s.pool, query, limit, offset)
}

func (s *Store) CreateCreator(ctx context.Context, in map[string]any) (map[string]any, error) {
	handle := asString(in["handle"])
	platform := asString(in["platform"])
	if handle == "" || platform == "" {
		return nil, errInvalidInput
	}
	meta, err := json.Marshal(asMap(in["metadata"]))
	if err != nil {
		return nil, err
	}
	status := asString(in["status"])
	if status == "" {
		status = "prospect"
	}
	region := strings.ToUpper(asString(in["region"]))
	if region == "" {
		region = "DACH"
	}
	score := asFloat(in["score"], 0)

	const query = `
with created as (
  insert into shop.creators (handle, platform, status, region, score, metadata)
  values ($1, $2, $3, $4, $5, $6::jsonb)
  returning id::text, handle, platform, status, region, score, metadata, created_at, updated_at
)
select row_to_json(created) from created
`
	return queryJSONObject(ctx, s.pool, query, handle, platform, status, region, score, string(meta))
}
