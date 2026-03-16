package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const defaultUGCClaimTTL = 30 * time.Minute

func (s *Store) ListUGCPostingQueue(ctx context.Context, params UGCPostingQueueListParams) ([]map[string]any, int, error) {
	where := []string{"1=1"}
	args := make([]any, 0, 4)

	if status := strings.TrimSpace(params.Status); status != "" {
		args = append(args, status)
		where = append(where, fmt.Sprintf("q.status = $%d", len(args)))
	}
	if channel := strings.TrimSpace(params.Channel); channel != "" {
		args = append(args, channel)
		where = append(where, fmt.Sprintf("q.channel = $%d", len(args)))
	}

	clause := strings.Join(where, " and ")
	countQuery := "select count(*) from public.ugc_posting_queue q join public.ugc_asset_bank a on a.id = q.asset_id where " + clause
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, params.Limit, (params.Page-1)*params.Limit)
	query := fmt.Sprintf(`
select row_to_json(t)
from (
  select q.id::text,
         q.asset_id::text,
         q.channel,
         q.status,
         q.scheduled_for,
         q.claimed_by,
         q.claimed_at,
         q.posted_at,
         q.delete_after_posted,
         q.manifest,
         jsonb_build_object(
           'id', a.id::text,
           'run_id', a.run_id::text,
           'variant_id', a.variant_id::text,
           'creative_asset_id', a.creative_asset_id::text,
           'status', a.status,
           'storage_provider', a.storage_provider,
           'bucket', a.bucket,
           'video_object_key', a.video_object_key,
           'video_size_bytes', a.video_size_bytes,
           'video_mime_type', a.video_mime_type,
           'thumbnail_object_key', a.thumbnail_object_key,
           'thumbnail_size_bytes', a.thumbnail_size_bytes,
           'thumbnail_mime_type', a.thumbnail_mime_type,
           'visibility', a.visibility,
           'metadata', a.metadata,
           'deleted_at', a.deleted_at
         ) as asset,
         r.title as run_title,
         p.name as product_name,
         v.variant_label,
         v.variant_role
  from public.ugc_posting_queue q
  join public.ugc_asset_bank a on a.id = q.asset_id
  left join public.ugc_generation_runs r on r.id = a.run_id
  left join public.products p on p.id = r.product_id
  left join public.ugc_generation_variants v on v.id = a.variant_id
  where %s
  order by q.scheduled_for asc, q.created_at asc
  limit $%d offset $%d
) t
`, clause, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (s *Store) ClaimUGCPostingQueueItem(ctx context.Context, channel, claimedBy string, claimTTL time.Duration) (map[string]any, error) {
	if strings.TrimSpace(channel) == "" {
		channel = "tiktok"
	}
	if claimTTL <= 0 {
		claimTTL = defaultUGCClaimTTL
	}
	claimToken := uuid.NewString()
	if strings.TrimSpace(claimedBy) == "" {
		claimedBy = "ugc-agent"
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var queueID string
	err = tx.QueryRow(ctx, `
with candidate as (
  select q.id
  from public.ugc_posting_queue q
  join public.ugc_asset_bank a on a.id = q.asset_id
  where q.channel = $1
    and q.scheduled_for <= now()
    and a.deleted_at is null
    and (
      q.status = 'ready'
      or (
        q.status = 'claimed'
        and coalesce(q.claimed_at, q.updated_at, q.created_at) < now() - $2::interval
      )
    )
  order by q.scheduled_for asc, q.created_at asc
  limit 1
  for update skip locked
)
update public.ugc_posting_queue q
set status = 'claimed',
    claim_token = $3,
    claimed_by = $4,
    claimed_at = now(),
    updated_at = now()
from candidate
where q.id = candidate.id
returning q.id::text
`, channel, formatPGInterval(claimTTL), claimToken, claimedBy).Scan(&queueID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errNotFound
		}
		return nil, err
	}

	item, err := s.getUGCPostingQueueItem(ctx, tx, queueID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Store) MarkUGCPostingQueuePosted(ctx context.Context, id, claimToken, actorID string, patch map[string]any) (map[string]any, error) {
	manifestPatch := map[string]any{
		"posted_at": time.Now().UTC().Format(time.RFC3339),
	}
	if externalID := strings.TrimSpace(asString(patch["external_post_id"])); externalID != "" {
		manifestPatch["external_post_id"] = externalID
	}
	if postedURL := strings.TrimSpace(asString(patch["posted_url"])); postedURL != "" {
		manifestPatch["posted_url"] = postedURL
	}
	if note := strings.TrimSpace(asString(patch["note"])); note != "" {
		manifestPatch["note"] = note
	}
	if strings.TrimSpace(actorID) != "" {
		manifestPatch["posted_by"] = actorID
	}
	manifestJSON, err := json.Marshal(manifestPatch)
	if err != nil {
		return nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const updateQueue = `
update public.ugc_posting_queue
set status = 'posted',
    posted_at = coalesce(posted_at, now()),
    manifest = coalesce(manifest, '{}'::jsonb) || $2::jsonb,
    updated_at = now()
where id::text = $1
  and ($3 = '' or claim_token = $3 or claim_token is null)
returning asset_id::text, delete_after_posted
`
	var assetID string
	var deleteAfterPosted bool
	if err := tx.QueryRow(ctx, updateQueue, id, string(manifestJSON), strings.TrimSpace(claimToken)).Scan(&assetID, &deleteAfterPosted); err != nil {
		if err == pgx.ErrNoRows {
			return nil, errNotFound
		}
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
update public.ugc_asset_bank
set status = 'posted',
    posted_at = coalesce(posted_at, now()),
    metadata = coalesce(metadata, '{}'::jsonb) || $2::jsonb,
    updated_at = now()
where id::text = $1
`, assetID, string(manifestJSON)); err != nil {
		return nil, err
	}

	deleteNow := asBool(patch["delete_now"], false)
	if deleteAfterPosted || deleteNow {
		if err := s.enqueueUGCAssetCleanupTx(ctx, tx, assetID, id, actorID, firstNonEmptyUGCString(asString(patch["posted_url"]), "posted")); err != nil {
			return nil, err
		}
	}

	item, err := s.getUGCPostingQueueItem(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Store) getUGCPostingQueueItem(ctx context.Context, querier queryJSONObjectQuerier, id string) (map[string]any, error) {
	return queryJSONObject(ctx, querier, `
select row_to_json(t)
from (
  select q.id::text,
         q.asset_id::text,
         q.channel,
         q.status,
         q.scheduled_for,
         q.claim_token,
         q.claimed_by,
         q.claimed_at,
         q.posted_at,
         q.delete_after_posted,
         q.manifest,
         jsonb_build_object(
           'id', a.id::text,
           'run_id', a.run_id::text,
           'variant_id', a.variant_id::text,
           'creative_asset_id', a.creative_asset_id::text,
           'status', a.status,
           'storage_provider', a.storage_provider,
           'bucket', a.bucket,
           'video_object_key', a.video_object_key,
           'video_size_bytes', a.video_size_bytes,
           'video_mime_type', a.video_mime_type,
           'thumbnail_object_key', a.thumbnail_object_key,
           'thumbnail_size_bytes', a.thumbnail_size_bytes,
           'thumbnail_mime_type', a.thumbnail_mime_type,
           'visibility', a.visibility,
           'metadata', a.metadata,
           'deleted_at', a.deleted_at
         ) as asset,
         r.title as run_title,
         p.name as product_name,
         v.variant_label,
         v.variant_role
  from public.ugc_posting_queue q
  join public.ugc_asset_bank a on a.id = q.asset_id
  left join public.ugc_generation_runs r on r.id = a.run_id
  left join public.products p on p.id = r.product_id
  left join public.ugc_generation_variants v on v.id = a.variant_id
  where q.id::text = $1
  limit 1
) t
`, id)
}

func (s *Store) enqueueUGCAssetCleanupTx(ctx context.Context, tx pgx.Tx, assetID, queueID, actorID, reason string) error {
	payload, err := json.Marshal(map[string]any{
		"asset_id":     assetID,
		"queue_id":     queueID,
		"requested_by": actorID,
		"reason":       defaultUGCString(reason, "posted"),
		"requested_at": time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
insert into public.queue_jobs (queue_name, job_type, dedupe_key, payload, status)
values ('automation', 'creative.ugc.asset.cleanup.requested', $1, $2::jsonb, 'pending')
on conflict (queue_name, dedupe_key) do nothing
`, "ugc-asset-cleanup:"+assetID, string(payload))
	return err
}

func formatPGInterval(value time.Duration) string {
	if value <= 0 {
		value = defaultUGCClaimTTL
	}
	return fmt.Sprintf("%d seconds", int(value.Seconds()))
}

type queryJSONObjectQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func firstNonEmptyUGCString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
