package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const maxUGCAssetDownloadBytes = 128 << 20

func (p *Processor) handleUGCAssetCleanupRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid ugc asset cleanup payload", ErrPermanent)
	}
	assetID := normalizeUUID(asString(payload["asset_id"]))
	queueID := normalizeUUID(asString(payload["queue_id"]))
	if assetID == "" {
		return fmt.Errorf("%w: missing ugc asset id", ErrPermanent)
	}

	var videoKey string
	var thumbnailKey string
	var storageProvider string
	err = p.pool.QueryRow(ctx, `
select coalesce(video_object_key, ''),
       coalesce(thumbnail_object_key, ''),
       coalesce(storage_provider, '')
from public.ugc_asset_bank
where id::text = $1
limit 1
`, assetID).Scan(&videoKey, &thumbnailKey, &storageProvider)
	if err == pgx.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}

	if p.r2 != nil && p.r2.Enabled() && storageProvider == "r2" {
		if err := p.r2.DeleteObject(ctx, videoKey); err != nil {
			return err
		}
		if err := p.r2.DeleteObject(ctx, thumbnailKey); err != nil {
			return err
		}
	}

	if _, err := p.pool.Exec(ctx, `
update public.ugc_asset_bank
set status = 'deleted',
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
where id::text = $1
`, assetID); err != nil {
		return err
	}
	if _, err := p.pool.Exec(ctx, `
update public.ugc_posting_queue
set status = 'deleted',
    updated_at = now()
where asset_id::text = $1
   or ($2 <> '' and id::text = $2)
`, assetID, queueID); err != nil {
		return err
	}
	return nil
}

func (p *Processor) purgeUGCAssetBankForRun(ctx context.Context, runID string) error {
	rows, err := p.pool.Query(ctx, `
select id::text,
       coalesce(video_object_key, ''),
       coalesce(thumbnail_object_key, ''),
       coalesce(storage_provider, '')
from public.ugc_asset_bank
where run_id::text = $1
`, runID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type staleAsset struct {
		assetID         string
		videoKey        string
		thumbnailKey    string
		storageProvider string
	}
	items := []staleAsset{}
	for rows.Next() {
		var item staleAsset
		if err := rows.Scan(&item.assetID, &item.videoKey, &item.thumbnailKey, &item.storageProvider); err != nil {
			return err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, item := range items {
		if p.r2 != nil && p.r2.Enabled() && item.storageProvider == "r2" {
			if err := p.r2.DeleteObject(ctx, item.videoKey); err != nil {
				_ = p.recordGrowthIncident(ctx, "ugc_asset_cleanup_failed", "warning", "all", "UGC Asset Cleanup konnte Video nicht entfernen", map[string]any{
					"run_id":   runID,
					"asset_id": item.assetID,
					"error":    err.Error(),
				})
			}
			if err := p.r2.DeleteObject(ctx, item.thumbnailKey); err != nil {
				_ = p.recordGrowthIncident(ctx, "ugc_asset_cleanup_failed", "warning", "all", "UGC Asset Cleanup konnte Thumbnail nicht entfernen", map[string]any{
					"run_id":   runID,
					"asset_id": item.assetID,
					"error":    err.Error(),
				})
			}
		}
	}

	if _, err := p.pool.Exec(ctx, `
delete from public.ugc_posting_queue
where asset_id in (
  select id
  from public.ugc_asset_bank
  where run_id::text = $1
)
`, runID); err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `delete from public.ugc_asset_bank where run_id::text = $1`, runID)
	return err
}

func (p *Processor) syncUGCVariantToAssetBank(ctx context.Context, runID, variantID, creativeAssetID string, run map[string]any, variant ugcVariant) error {
	if p.r2 == nil || !p.r2.Enabled() {
		return nil
	}
	if strings.TrimSpace(variant.VideoURL) == "" {
		return nil
	}

	videoBlob, videoType, err := p.loadUGCMediaBlob(ctx, variant.VideoURL, "video/mp4", maxUGCAssetDownloadBytes)
	if err != nil {
		return err
	}

	videoKey := buildUGCAssetObjectKey(runID, variantID, variant.Label, videoType, "video")
	videoUpload, err := p.r2.UploadBytes(ctx, videoKey, videoType, videoBlob, p.buildUGCAssetMetadata(runID, variantID, creativeAssetID, variant, "video"))
	if err != nil {
		return err
	}

	thumbnailSource := firstNonEmptyUGC(variant.ThumbnailURL, variant.PreviewURL)
	thumbnailKey := ""
	thumbnailETag := ""
	thumbnailType := ""
	var thumbnailSize int64
	if thumbnailSource != "" {
		thumbnailBlob, detectedType, thumbErr := p.loadUGCMediaBlob(ctx, thumbnailSource, "image/jpeg", 16<<20)
		if thumbErr == nil && len(thumbnailBlob) > 0 {
			thumbnailKey = buildUGCAssetObjectKey(runID, variantID, variant.Label, detectedType, "thumbnail")
			thumbnailUpload, uploadErr := p.r2.UploadBytes(ctx, thumbnailKey, detectedType, thumbnailBlob, p.buildUGCAssetMetadata(runID, variantID, creativeAssetID, variant, "thumbnail"))
			if uploadErr == nil {
				thumbnailETag = thumbnailUpload.ETag
				thumbnailType = detectedType
				thumbnailSize = thumbnailUpload.SizeBytes
			}
		}
	}

	manifestJSON, err := json.Marshal(p.buildUGCPostingManifest(runID, variantID, creativeAssetID, run, variant, objectMeta{
		Bucket: videoUpload.Bucket,
		Key:    videoUpload.Key,
	}, thumbnailKey))
	if err != nil {
		return err
	}
	assetMetadataJSON, err := json.Marshal(map[string]any{
		"run_id":            runID,
		"variant_id":        variantID,
		"creative_asset_id": creativeAssetID,
		"variant_role":      variant.Role,
		"variant_label":     variant.Label,
		"render_mode":       asString(variant.Metrics["render_mode"]),
		"aspect_ratio":      asString(run["aspect_ratio"]),
		"audio_mode":        asString(run["audio_mode"]),
	})
	if err != nil {
		return err
	}

	var assetID string
	err = p.pool.QueryRow(ctx, `
insert into public.ugc_asset_bank (
  run_id,
  variant_id,
  creative_asset_id,
  channel,
  status,
  storage_provider,
  bucket,
  video_object_key,
  video_etag,
  video_size_bytes,
  video_mime_type,
  thumbnail_object_key,
  thumbnail_etag,
  thumbnail_size_bytes,
  thumbnail_mime_type,
  source_video_url,
  source_thumbnail_url,
  visibility,
  metadata
)
values (
  $1::uuid,
  $2::uuid,
  $3::uuid,
  'tiktok',
  'ready',
  'r2',
  $4,
  $5,
  nullif($6, ''),
  $7,
  $8,
  nullif($9, ''),
  nullif($10, ''),
  $11,
  nullif($12, ''),
  nullif($13, ''),
  nullif($14, ''),
  'private',
  $15::jsonb
)
on conflict (bucket, video_object_key) do update
set variant_id = excluded.variant_id,
    creative_asset_id = excluded.creative_asset_id,
    status = 'ready',
    source_video_url = excluded.source_video_url,
    source_thumbnail_url = excluded.source_thumbnail_url,
    metadata = excluded.metadata,
    updated_at = now()
returning id::text
`, runID, variantID, creativeAssetID, videoUpload.Bucket, videoUpload.Key, videoUpload.ETag, videoUpload.SizeBytes, videoUpload.ContentType, thumbnailKey, thumbnailETag, thumbnailSize, thumbnailType, variant.VideoURL, thumbnailSource, string(assetMetadataJSON)).Scan(&assetID)
	if err != nil {
		return err
	}

	_, err = p.pool.Exec(ctx, `
insert into public.ugc_posting_queue (
  asset_id,
  channel,
  status,
  scheduled_for,
  delete_after_posted,
  manifest
)
values ($1::uuid, 'tiktok', 'ready', now(), true, $2::jsonb)
on conflict (asset_id, channel) do update
set status = 'ready',
    scheduled_for = now(),
    manifest = excluded.manifest,
    delete_after_posted = excluded.delete_after_posted,
    claim_token = null,
    claimed_by = null,
    claimed_at = null,
    posted_at = null,
    updated_at = now()
`, assetID, string(manifestJSON))
	return err
}

func (p *Processor) buildUGCAssetMetadata(runID, variantID, creativeAssetID string, variant ugcVariant, assetKind string) map[string]string {
	return map[string]string{
		"run_id":            runID,
		"variant_id":        variantID,
		"creative_asset_id": creativeAssetID,
		"variant_role":      variant.Role,
		"variant_label":     variant.Label,
		"asset_kind":        assetKind,
	}
}

func (p *Processor) buildUGCPostingManifest(runID, variantID, creativeAssetID string, run map[string]any, variant ugcVariant, video objectMeta, thumbnailKey string) map[string]any {
	product := asMap(run["product"])
	person := asMap(run["person_asset"])
	metrics := map[string]any{}
	for key, value := range variant.Metrics {
		metrics[key] = value
	}
	return map[string]any{
		"run_id":            runID,
		"variant_id":        variantID,
		"creative_asset_id": creativeAssetID,
		"channel":           "tiktok",
		"product_id":        asString(product["id"]),
		"product_name":      asString(product["name"]),
		"person_asset_id":   asString(person["id"]),
		"person_label":      asString(person["label"]),
		"variant_role":      variant.Role,
		"variant_label":     variant.Label,
		"caption":           firstNonEmptyUGC(variant.SubtitleText, variant.ScriptText),
		"hook":              variant.ScriptText,
		"audio_mode":        asString(run["audio_mode"]),
		"aspect_ratio":      asString(run["aspect_ratio"]),
		"storage": map[string]any{
			"provider":             "r2",
			"bucket":               video.Bucket,
			"video_object_key":     video.Key,
			"thumbnail_object_key": thumbnailKey,
		},
		"metrics": metrics,
	}
}

type objectMeta struct {
	Bucket string
	Key    string
}

func (p *Processor) loadUGCMediaBlob(ctx context.Context, source, fallbackType string, maxBytes int64) ([]byte, string, error) {
	if strings.HasPrefix(strings.TrimSpace(source), "data:") {
		contentType, blob, err := decodeMediaDataURL(source)
		if err != nil {
			return nil, "", err
		}
		if maxBytes > 0 && int64(len(blob)) > maxBytes {
			return nil, "", fmt.Errorf("%w: ugc_asset_blob_too_large", ErrPermanent)
		}
		if strings.TrimSpace(contentType) == "" {
			contentType = fallbackType
		}
		return blob, contentType, nil
	}
	if !strings.HasPrefix(source, "http://") && !strings.HasPrefix(source, "https://") {
		return nil, "", fmt.Errorf("%w: unsupported_ugc_asset_source", ErrPermanent)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := (&http.Client{Timeout: 90 * time.Second}).Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", fmt.Errorf("ugc_asset_download_failed:%d", resp.StatusCode)
	}

	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes+1))
	if err != nil {
		return nil, "", err
	}
	if maxBytes > 0 && int64(len(raw)) > maxBytes {
		return nil, "", fmt.Errorf("%w: ugc_asset_blob_too_large", ErrPermanent)
	}

	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = http.DetectContentType(raw)
	}
	if strings.Contains(contentType, ";") {
		contentType = strings.TrimSpace(strings.Split(contentType, ";")[0])
	}
	if strings.TrimSpace(contentType) == "" {
		contentType = fallbackType
	}
	return raw, contentType, nil
}

func buildUGCAssetObjectKey(runID, variantID, label, contentType, assetKind string) string {
	trimmedLabel := strings.ToLower(strings.TrimSpace(label))
	trimmedLabel = strings.ReplaceAll(trimmedLabel, " ", "-")
	trimmedLabel = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r == '-':
			return r
		default:
			return -1
		}
	}, trimmedLabel)
	if trimmedLabel == "" {
		trimmedLabel = assetKind
	}
	ext := ugcExtensionForContentType(contentType, assetKind)
	return fmt.Sprintf("ugc/%s/%s/%s-%s%s", time.Now().UTC().Format("2006/01/02"), runID, variantID, trimmedLabel, ext)
}

func ugcExtensionForContentType(contentType, assetKind string) string {
	if guesses, _ := mime.ExtensionsByType(contentType); len(guesses) > 0 {
		return guesses[0]
	}
	switch assetKind {
	case "thumbnail":
		return ".jpg"
	default:
		return ".mp4"
	}
}
