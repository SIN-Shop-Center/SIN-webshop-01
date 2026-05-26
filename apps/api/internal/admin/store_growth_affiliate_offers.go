package admin

import (
	"context"
	"encoding/json"
	"strings"
)

func (s *Store) ListAffiliateOffers(ctx context.Context, limit, offset int) ([]map[string]any, error) {
	const query = `
select row_to_json(t)
from (
  select id::text, creator_id::text, code, commission_pct, status, valid_from, valid_to, metadata, created_at, updated_at
  from shop.affiliate_offers
  order by created_at desc
  limit $1 offset $2
) t
`
	return queryJSONRows(ctx, s.pool, query, limit, offset)
}

func (s *Store) CreateAffiliateOffer(ctx context.Context, in map[string]any) (map[string]any, error) {
	code := strings.ToUpper(asString(in["code"]))
	if code == "" {
		return nil, errInvalidInput
	}
	creatorID := validUUIDOrEmpty(asString(in["creator_id"]))
	commission := asFloat(in["commission_pct"], 10)
	status := asString(in["status"])
	if status == "" {
		status = "active"
	}
	meta, err := json.Marshal(asMap(in["metadata"]))
	if err != nil {
		return nil, err
	}

	const query = `
with created as (
  insert into shop.affiliate_offers (creator_id, code, commission_pct, status, valid_from, valid_to, metadata)
  values (nullif($1, '')::uuid, $2, $3, $4, coalesce(nullif($5, '')::timestamptz, now()), nullif($6, '')::timestamptz, $7::jsonb)
  returning id::text, creator_id::text, code, commission_pct, status, valid_from, valid_to, metadata, created_at, updated_at
)
select row_to_json(created) from created
`
	return queryJSONObject(ctx, s.pool, query,
		creatorID,
		code,
		commission,
		status,
		asString(in["valid_from"]),
		asString(in["valid_to"]),
		string(meta),
	)
}
