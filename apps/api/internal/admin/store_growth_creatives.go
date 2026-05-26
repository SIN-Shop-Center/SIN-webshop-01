package admin

import (
	"context"
	"encoding/json"
)

func (s *Store) ListCreatives(ctx context.Context, limit, offset int) ([]map[string]any, error) {
	const query = `
select row_to_json(t)
from (
  select id::text, channel, asset_type, title, hook, status, storage_url, tags, metadata, created_at, updated_at
  from shop.creative_assets
  order by updated_at desc
  limit $1 offset $2
) t
`
	return queryJSONRows(ctx, s.pool, query, limit, offset)
}

func (s *Store) CreateCreative(ctx context.Context, in map[string]any) (map[string]any, error) {
	title := asString(in["title"])
	if title == "" {
		return nil, errInvalidInput
	}
	channel := asString(in["channel"])
	if channel == "" {
		channel = "all"
	}
	assetType := asString(in["asset_type"])
	if assetType == "" {
		assetType = "video"
	}
	status := asString(in["status"])
	if status == "" {
		status = "draft"
	}
	meta, err := json.Marshal(asMap(in["metadata"]))
	if err != nil {
		return nil, err
	}
	tags := asStringSlice(in["tags"])

	const query = `
with created as (
  insert into shop.creative_assets (channel, asset_type, title, hook, status, storage_url, tags, metadata)
  values ($1, $2, $3, nullif($4, ''), $5, nullif($6, ''), $7, $8::jsonb)
  returning id::text, channel, asset_type, title, hook, status, storage_url, tags, metadata, created_at, updated_at
)
select row_to_json(created) from created
`
	return queryJSONObject(ctx, s.pool, query,
		channel,
		assetType,
		title,
		asString(in["hook"]),
		status,
		asString(in["storage_url"]),
		tags,
		string(meta),
	)
}
