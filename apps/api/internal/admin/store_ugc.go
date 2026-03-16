package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const ugcRunFingerprintVersion = "ugc_cache_v1"

func (s *Store) GetUGCSettings(ctx context.Context) (UGCGeneratorSettings, error) {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return UGCGeneratorSettings{}, err
	}
	return ugcSettingsFromSettings(settings), nil
}

func (s *Store) UpdateUGCSettings(ctx context.Context, patch map[string]any) (UGCGeneratorSettings, error) {
	current, err := s.GetUGCSettings(ctx)
	if err != nil {
		return UGCGeneratorSettings{}, err
	}
	next := mergeUGCSettingsPatch(current, patch)
	next.UpdatedAt = time.Now().UTC()

	blob, err := json.Marshal(next)
	if err != nil {
		return UGCGeneratorSettings{}, err
	}
	_, err = s.UpdateSettings(ctx, map[string]any{
		"ugc_generator_policy": json.RawMessage(blob),
	})
	if err != nil {
		return UGCGeneratorSettings{}, err
	}
	return next, nil
}

func defaultUGCSettings() UGCGeneratorSettings {
	return UGCGeneratorSettings{
		Enabled:                  true,
		Mode:                     "auto",
		DefaultOutputPack:        "hero_plus_3",
		DefaultAudioMode:         "voice_and_captions",
		DefaultAspectRatio:       "9:16",
		DefaultRenderLane:        "balanced",
		PreferredRenderProvider:  "hybrid",
		PreferredLanguage:        "de",
		RequiresHumanReview:      false,
		MaxRunsPerProductPerDay:  2,
		MaxAutopilotRunsPerSweep: 4,
		DefaultDurationSeconds:   15,
		VoiceProfile:             "magpie_multilingual",
		UpdatedAt:                time.Now().UTC(),
	}
}

func ugcSettingsFromSettings(settings map[string]any) UGCGeneratorSettings {
	raw, _ := settings["ugc_generator_policy"].(map[string]any)
	return mergeUGCSettingsPatch(defaultUGCSettings(), raw)
}

func mergeUGCSettingsPatch(base UGCGeneratorSettings, patch map[string]any) UGCGeneratorSettings {
	if patch == nil {
		return base
	}
	if value, ok := patch["enabled"]; ok {
		base.Enabled = asBool(value, base.Enabled)
	}
	if value, ok := patch["mode"]; ok {
		mode := strings.TrimSpace(asString(value))
		if mode == "manual" || mode == "auto" {
			base.Mode = mode
		}
	}
	if value, ok := patch["default_output_pack"]; ok {
		base.DefaultOutputPack = normalizeStoredUGCOutputPack(strings.TrimSpace(asString(value)), base.DefaultOutputPack)
	}
	if value, ok := patch["default_audio_mode"]; ok {
		base.DefaultAudioMode = normalizeStoredUGCAudioMode(strings.TrimSpace(asString(value)), base.DefaultAudioMode)
	}
	if value, ok := patch["default_aspect_ratio"]; ok {
		switch option := strings.TrimSpace(asString(value)); option {
		case "9:16", "1:1", "16:9":
			base.DefaultAspectRatio = option
		}
	}
	if value, ok := patch["default_render_lane"]; ok {
		base.DefaultRenderLane = normalizeStoredUGCRenderLane(strings.TrimSpace(asString(value)), base.DefaultRenderLane)
	}
	if value, ok := patch["preferred_render_provider"]; ok {
		base.PreferredRenderProvider = normalizeStoredUGCRenderProvider(strings.TrimSpace(asString(value)), base.PreferredRenderProvider)
	}
	if value, ok := patch["preferred_language"]; ok {
		if language := strings.TrimSpace(asString(value)); language != "" {
			base.PreferredLanguage = language
		}
	}
	if value, ok := patch["requires_human_review"]; ok {
		base.RequiresHumanReview = asBool(value, base.RequiresHumanReview)
	}
	if value, ok := patch["max_runs_per_product_per_day"]; ok {
		base.MaxRunsPerProductPerDay = clampInt(asInt(value, base.MaxRunsPerProductPerDay), 1, 12)
	}
	if value, ok := patch["max_autopilot_runs_per_sweep"]; ok {
		base.MaxAutopilotRunsPerSweep = clampInt(asInt(value, base.MaxAutopilotRunsPerSweep), 1, 20)
	}
	if value, ok := patch["default_duration_seconds"]; ok {
		base.DefaultDurationSeconds = clampInt(asInt(value, base.DefaultDurationSeconds), 6, 45)
	}
	if value, ok := patch["voice_profile"]; ok {
		if voiceProfile := strings.TrimSpace(asString(value)); voiceProfile != "" {
			base.VoiceProfile = voiceProfile
		}
	}
	if value, ok := patch["updated_at"]; ok {
		if parsed, err := time.Parse(time.RFC3339, asString(value)); err == nil {
			base.UpdatedAt = parsed.UTC()
		}
	}
	return base
}

func (s *Store) ListUGCPersonAssets(ctx context.Context, limit, offset int) ([]map[string]any, error) {
	const query = `
select row_to_json(t)
from (
  select id::text,
         label,
         source_kind,
         image_url,
         preview_url,
         coalesce(is_default, false) as is_default,
         metadata,
         created_at,
         updated_at
  from public.ugc_person_assets
  order by is_default desc, updated_at desc
  limit $1 offset $2
) t
`
	return queryJSONRows(ctx, s.pool, query, limit, offset)
}

func (s *Store) CreateUGCPersonAsset(ctx context.Context, body map[string]any, actorID string) (map[string]any, error) {
	label := asString(body["label"])
	imageURL := asString(body["image_url"])
	previewURL := asString(body["preview_url"])
	sourceDataURL := asString(body["source_data_url"])
	if label == "" {
		label = asString(body["file_name"])
	}
	if label == "" {
		label = fmt.Sprintf("Person %s", time.Now().UTC().Format("02.01.2006 15:04"))
	}
	if imageURL == "" && sourceDataURL == "" {
		return nil, errInvalidInput
	}
	if previewURL == "" {
		switch {
		case imageURL != "":
			previewURL = imageURL
		case sourceDataURL != "":
			previewURL = sourceDataURL
		}
	}
	sourceKind := asString(body["source_kind"])
	if sourceKind == "" {
		if sourceDataURL != "" {
			sourceKind = "upload"
		} else {
			sourceKind = "library"
		}
	}
	meta := asMap(body["metadata"])
	if fileName := asString(body["file_name"]); fileName != "" {
		meta["file_name"] = fileName
	}
	if mimeType := asString(body["mime_type"]); mimeType != "" {
		meta["mime_type"] = mimeType
	}
	if sizeBytes := asInt(body["size_bytes"], 0); sizeBytes > 0 {
		meta["size_bytes"] = sizeBytes
	}
	requestedDefault := asBool(body["is_default"], false)

	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return nil, err
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	isDefault := requestedDefault
	if !isDefault {
		var hasDefault bool
		if err := tx.QueryRow(ctx, `select exists(select 1 from public.ugc_person_assets where is_default = true)`).Scan(&hasDefault); err != nil {
			return nil, err
		}
		isDefault = !hasDefault
	}
	if isDefault {
		if _, err := tx.Exec(ctx, `update public.ugc_person_assets set is_default = false, updated_at = now() where is_default = true`); err != nil {
			return nil, err
		}
	}

	const query = `
with created as (
  insert into public.ugc_person_assets (
    label,
    source_kind,
    image_url,
    preview_url,
    source_data_url,
    is_default,
    metadata,
    created_by
  )
  values ($1, $2, nullif($3, ''), nullif($4, ''), nullif($5, ''), $6, $7::jsonb, $8)
  returning id::text,
            label,
            source_kind,
            image_url,
            preview_url,
            is_default,
            metadata,
            created_at,
            updated_at
)
select row_to_json(created) from created
`
	item, err := queryJSONObject(ctx, tx, query, label, sourceKind, imageURL, previewURL, sourceDataURL, isDefault, string(metaJSON), actorParam)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Store) GetUGCPersonAssetContent(ctx context.Context, id string) (string, string, string, error) {
	const query = `
select coalesce(source_data_url, ''),
       coalesce(preview_url, ''),
       coalesce(image_url, '')
from public.ugc_person_assets
where id::text = $1
limit 1
`
	var sourceDataURL string
	var previewURL string
	var imageURL string
	if err := s.pool.QueryRow(ctx, query, id).Scan(&sourceDataURL, &previewURL, &imageURL); err != nil {
		return "", "", "", err
	}
	return sourceDataURL, previewURL, imageURL, nil
}

func (s *Store) ListUGCGenerationRuns(ctx context.Context, params UGCGenerationListParams) ([]map[string]any, int, error) {
	where := []string{"1=1"}
	args := make([]any, 0, 4)

	if status := strings.TrimSpace(params.Status); status != "" {
		args = append(args, status)
		where = append(where, fmt.Sprintf("r.status = $%d", len(args)))
	}
	if productID := validUUIDOrEmpty(strings.TrimSpace(params.ProductID)); productID != "" {
		args = append(args, productID)
		where = append(where, fmt.Sprintf("r.product_id = $%d::uuid", len(args)))
	}
	if triggerMode := strings.TrimSpace(params.TriggerMode); triggerMode != "" {
		args = append(args, triggerMode)
		where = append(where, fmt.Sprintf("r.trigger_mode = $%d", len(args)))
	}
	clause := strings.Join(where, " and ")

	countQuery := "select count(*) from public.ugc_generation_runs r where " + clause
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, params.Limit, (params.Page-1)*params.Limit)
	query := fmt.Sprintf(`
select row_to_json(t)
from (
  select r.id::text,
         r.title,
         r.status,
         r.status_message,
         r.trigger_mode,
         r.product_id::text,
         r.person_asset_id::text,
         r.aspect_ratio,
         r.output_pack,
         r.audio_mode,
         r.created_at,
         r.updated_at,
         p.name as product_name,
         pa.label as person_label,
         pa.preview_url as person_preview_url,
         (
           select v.preview_url
           from public.ugc_generation_variants v
           where v.run_id = r.id
             and v.variant_role = 'hero'
           order by v.updated_at desc
           limit 1
         ) as hero_preview_url,
         (
           select count(*)
           from public.ugc_generation_variants v
           where v.run_id = r.id
         ) as variant_count
  from public.ugc_generation_runs r
  left join public.products p on p.id = r.product_id
  left join public.ugc_person_assets pa on pa.id = r.person_asset_id
  where %s
  order by r.updated_at desc
  limit $%d offset $%d
) t
`, clause, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (s *Store) CreateUGCGenerationRun(ctx context.Context, body map[string]any, actorID string) (map[string]any, error) {
	productID := validUUIDOrEmpty(asString(body["product_id"]))
	personAssetID := validUUIDOrEmpty(asString(body["person_asset_id"]))
	if productID == "" || personAssetID == "" {
		return nil, errInvalidInput
	}

	if err := s.ensureUGCInputs(ctx, productID, personAssetID); err != nil {
		if IsNotFound(err) {
			return nil, errInvalidInput
		}
		return nil, err
	}

	settings, err := s.GetUGCSettings(ctx)
	if err != nil {
		return nil, err
	}
	if !settings.Enabled {
		return nil, errBlocked
	}
	title := asString(body["title"])
	if title == "" {
		title = "UGC Clip"
	}
	triggerMode := asString(body["trigger_mode"])
	if triggerMode == "" {
		triggerMode = "manual"
	}
	aspectRatio := asString(body["aspect_ratio"])
	if aspectRatio == "" {
		aspectRatio = settings.DefaultAspectRatio
	}
	audioMode := asString(body["audio_mode"])
	if audioMode == "" {
		audioMode = settings.DefaultAudioMode
	}
	audioMode = normalizeStoredUGCAudioMode(audioMode, settings.DefaultAudioMode)
	outputPack := asString(body["output_pack"])
	if outputPack == "" {
		outputPack = settings.DefaultOutputPack
	}
	outputPack = normalizeStoredUGCOutputPack(outputPack, settings.DefaultOutputPack)

	inputPayload := map[string]any{
		"hook_style":               asString(body["hook_style"]),
		"cta_style":                asString(body["cta_style"]),
		"notes":                    asString(body["notes"]),
		"language":                 defaultUGCString(body["language"], settings.PreferredLanguage),
		"voice_profile":            defaultUGCString(body["voice_profile"], settings.VoiceProfile),
		"default_duration_seconds": settings.DefaultDurationSeconds,
		"requires_human_review":    settings.RequiresHumanReview,
		"render_lane":              defaultUGCString(body["render_lane"], settings.DefaultRenderLane),
		"render_provider":          defaultUGCString(body["render_provider"], settings.PreferredRenderProvider),
	}
	inputPayload["render_lane"] = normalizeStoredUGCRenderLane(asString(inputPayload["render_lane"]), settings.DefaultRenderLane)
	inputPayload["render_provider"] = normalizeStoredUGCRenderProvider(asString(inputPayload["render_provider"]), settings.PreferredRenderProvider)
	inputJSON, err := json.Marshal(inputPayload)
	if err != nil {
		return nil, err
	}
	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return nil, err
	}
	pipelineJSON, err := json.Marshal(defaultUGCPipelineSnapshot(inputPayload))
	if err != nil {
		return nil, err
	}
	fingerprintHash, err := s.buildUGCRunFingerprint(ctx, productID, personAssetID, aspectRatio, outputPack, audioMode, inputPayload)
	if err != nil {
		return nil, err
	}
	if activeRunID, ok, activeErr := s.findActiveUGCRunByFingerprint(ctx, fingerprintHash); activeErr != nil {
		return nil, activeErr
	} else if ok {
		return s.GetUGCGenerationRun(ctx, activeRunID)
	}
	if cachedSourceRunID, ok, cacheErr := s.findReusableUGCRunByFingerprint(ctx, fingerprintHash); cacheErr != nil {
		return nil, cacheErr
	} else if ok {
		return s.cloneUGCGenerationRunFromCache(ctx, cachedSourceRunID, productID, personAssetID, title, triggerMode, aspectRatio, outputPack, audioMode, string(inputJSON), string(settingsJSON), actorID, fingerprintHash)
	}
	if err := s.ensureNoActiveUGCRun(ctx, productID, personAssetID); err != nil {
		return nil, err
	}
	if err := s.ensureUGCDailyLimit(ctx, productID, settings.MaxRunsPerProductPerDay); err != nil {
		return nil, err
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}

	const insertQuery = `
insert into public.ugc_generation_runs (
  product_id,
  person_asset_id,
  title,
  status,
  status_message,
  trigger_mode,
  aspect_ratio,
  output_pack,
  audio_mode,
  input_payload,
  settings_snapshot,
  pipeline_snapshot,
  created_by,
  fingerprint_hash
)
values ($1::uuid, $2::uuid, $3, 'queued', 'Wartet auf Generierung', $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12)
returning id::text
`
	var runID string
	if err := s.pool.QueryRow(
		ctx,
		insertQuery,
		productID,
		personAssetID,
		title,
		triggerMode,
		aspectRatio,
		outputPack,
		audioMode,
		string(inputJSON),
		string(settingsJSON),
		string(pipelineJSON),
		actorParam,
		fingerprintHash,
	).Scan(&runID); err != nil {
		return nil, err
	}

	if err := s.enqueueUGCRun(ctx, runID, triggerMode, actorUUID, false); err != nil {
		return nil, err
	}
	return s.GetUGCGenerationRun(ctx, runID)
}

func (s *Store) GetUGCGenerationRun(ctx context.Context, id string) (map[string]any, error) {
	const runQuery = `
select row_to_json(t)
from (
  select r.id::text,
         r.title,
         r.status,
         r.status_message,
         r.last_error,
         r.trigger_mode,
         r.aspect_ratio,
         r.output_pack,
         r.audio_mode,
         r.input_payload,
         r.settings_snapshot,
         r.pipeline_snapshot,
         r.result_payload,
         r.fingerprint_hash,
         r.source_run_id::text,
         r.attempt_count,
         r.created_at,
         r.updated_at,
         case when p.id is null then null else jsonb_build_object(
           'id', p.id::text,
           'name', p.name,
           'slug', p.slug,
           'description', p.description,
           'images', p.images,
           'price', p.price
         ) end as product,
         case when pa.id is null then null else jsonb_build_object(
           'id', pa.id::text,
           'label', pa.label,
           'source_kind', pa.source_kind,
           'preview_url', pa.preview_url,
           'image_url', pa.image_url
         ) end as person_asset
  from public.ugc_generation_runs r
  left join public.products p on p.id = r.product_id
  left join public.ugc_person_assets pa on pa.id = r.person_asset_id
  where r.id::text = $1
  limit 1
) t
`
	run, err := queryJSONObject(ctx, s.pool, runQuery, id)
	if err != nil {
		return nil, err
	}
	const variantsQuery = `
select row_to_json(t)
from (
  select v.id::text,
         v.run_id::text,
         v.creative_asset_id::text,
         v.variant_role,
         v.variant_label,
         v.status,
         v.preview_url,
         v.video_url,
         v.thumbnail_url,
         v.script_text,
         v.voice_text,
         v.subtitle_text,
         v.metrics,
         v.created_at,
         v.updated_at
  from public.ugc_generation_variants v
  where v.run_id::text = $1
  order by case when v.variant_role = 'hero' then 0 else 1 end, v.created_at asc
) t
`
	variants, err := queryJSONRows(ctx, s.pool, variantsQuery, id)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"run":      run,
		"variants": variants,
	}, nil
}

func (s *Store) buildUGCRunFingerprint(ctx context.Context, productID, personAssetID, aspectRatio, outputPack, audioMode string, inputPayload map[string]any) (string, error) {
	contextBlob, err := s.loadUGCFingerprintContext(ctx, productID, personAssetID)
	if err != nil {
		return "", err
	}

	payload := map[string]any{
		"version":         ugcRunFingerprintVersion,
		"product_id":      productID,
		"person_asset_id": personAssetID,
		"aspect_ratio":    aspectRatio,
		"output_pack":     outputPack,
		"audio_mode":      audioMode,
		"input_payload":   inputPayload,
		"context":         contextBlob,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

func (s *Store) loadUGCFingerprintContext(ctx context.Context, productID, personAssetID string) (map[string]any, error) {
	const query = `
select row_to_json(t)
from (
  select p.name,
         p.description,
         p.images,
         p.updated_at as product_updated_at,
         pa.source_kind,
         pa.preview_url,
         pa.image_url,
         pa.updated_at as person_updated_at
  from public.products p
  join public.ugc_person_assets pa on pa.id::text = $2
  where p.id::text = $1
  limit 1
) t
`
	return queryJSONObject(ctx, s.pool, query, productID, personAssetID)
}

func (s *Store) findActiveUGCRunByFingerprint(ctx context.Context, fingerprintHash string) (string, bool, error) {
	const query = `
select id::text
from public.ugc_generation_runs
where fingerprint_hash = $1
  and status = any($2::text[])
order by created_at desc
limit 1
`
	activeStatuses := []string{"queued", "planning", "generating", "voicing", "qa_review"}
	var runID string
	if err := s.pool.QueryRow(ctx, query, fingerprintHash, activeStatuses).Scan(&runID); err != nil {
		if err == pgx.ErrNoRows {
			return "", false, nil
		}
		return "", false, err
	}
	return runID, true, nil
}

func (s *Store) findReusableUGCRunByFingerprint(ctx context.Context, fingerprintHash string) (string, bool, error) {
	const query = `
select r.id::text
from public.ugc_generation_runs r
where r.fingerprint_hash = $1
  and r.status = any($2::text[])
  and exists (
    select 1
    from public.ugc_generation_variants v
    where v.run_id = r.id
      and coalesce(v.video_url, '') <> ''
  )
order by r.updated_at desc, r.created_at desc
limit 1
`
	reusableStatuses := []string{"completed", "qa_review"}
	var runID string
	if err := s.pool.QueryRow(ctx, query, fingerprintHash, reusableStatuses).Scan(&runID); err != nil {
		if err == pgx.ErrNoRows {
			return "", false, nil
		}
		return "", false, err
	}
	return runID, true, nil
}

func (s *Store) cloneUGCGenerationRunFromCache(ctx context.Context, sourceRunID, productID, personAssetID, title, triggerMode, aspectRatio, outputPack, audioMode, inputJSON, settingsJSON, actorID, fingerprintHash string) (map[string]any, error) {
	if title == "" {
		title = "UGC Clip"
	}
	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}

	cachePayload, err := json.Marshal(map[string]any{
		"cache_hit":            true,
		"cache_source_run_id":  sourceRunID,
		"cache_reused_at":      time.Now().UTC().Format(time.RFC3339),
		"cache_fingerprint_id": fingerprintHash,
	})
	if err != nil {
		return nil, err
	}
	cacheMetrics, err := json.Marshal(map[string]any{
		"cache_hit":           true,
		"cache_source_run_id": sourceRunID,
	})
	if err != nil {
		return nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const insertRunQuery = `
insert into public.ugc_generation_runs (
  product_id,
  person_asset_id,
  title,
  status,
  status_message,
  trigger_mode,
  aspect_ratio,
  output_pack,
  audio_mode,
  input_payload,
  settings_snapshot,
  pipeline_snapshot,
  result_payload,
  created_by,
  fingerprint_hash,
  source_run_id
)
select $2::uuid,
       $3::uuid,
       $4,
       case when r.status = 'completed' then 'completed' else 'qa_review' end,
       'Aus Cache wiederverwendet',
       $5,
       $6,
       $7,
       $8,
       $9::jsonb,
       $10::jsonb,
       r.pipeline_snapshot,
       coalesce(r.result_payload, '{}'::jsonb) || $11::jsonb,
       $12,
       $13,
       r.id
from public.ugc_generation_runs r
where r.id::text = $1
returning id::text
`
	var newRunID string
	if err := tx.QueryRow(ctx, insertRunQuery, sourceRunID, productID, personAssetID, title, triggerMode, aspectRatio, outputPack, audioMode, inputJSON, settingsJSON, string(cachePayload), actorParam, fingerprintHash).Scan(&newRunID); err != nil {
		return nil, err
	}

	const copyVariantsQuery = `
insert into public.ugc_generation_variants (
  run_id,
  creative_asset_id,
  variant_role,
  variant_label,
  status,
  preview_url,
  video_url,
  thumbnail_url,
  script_text,
  voice_text,
  subtitle_text,
  metrics
)
select $1::uuid,
       creative_asset_id,
       variant_role,
       variant_label,
       status,
       preview_url,
       video_url,
       thumbnail_url,
       script_text,
       voice_text,
       subtitle_text,
       coalesce(metrics, '{}'::jsonb) || $2::jsonb
from public.ugc_generation_variants
where run_id::text = $3
`
	if _, err := tx.Exec(ctx, copyVariantsQuery, newRunID, string(cacheMetrics), sourceRunID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetUGCGenerationRun(ctx, newRunID)
}

func (s *Store) RetryUGCGenerationRun(ctx context.Context, id, actorID string) (map[string]any, error) {
	const stateQuery = `
select status, product_id::text, person_asset_id::text
from public.ugc_generation_runs
where id::text = $1
limit 1
`
	var status string
	var productID string
	var personAssetID string
	if err := s.pool.QueryRow(ctx, stateQuery, id).Scan(&status, &productID, &personAssetID); err != nil {
		return nil, err
	}
	if status != "failed" {
		return nil, errInvalidInput
	}
	if err := s.ensureNoActiveUGCRun(ctx, productID, personAssetID); err != nil {
		if err == errAlreadyRunning {
			return nil, errAlreadyRunning
		}
		return nil, err
	}

	_, err := s.pool.Exec(ctx, `
update public.ugc_generation_runs
set status = 'queued',
    status_message = 'Erneut angestossen',
    last_error = null,
    attempt_count = attempt_count + 1,
    updated_at = now()
where id::text = $1
`, id)
	if err != nil {
		return nil, err
	}
	if err := s.enqueueUGCRun(ctx, id, "manual_retry", validUUIDOrEmpty(actorID), true); err != nil {
		return nil, err
	}
	return s.GetUGCGenerationRun(ctx, id)
}

func (s *Store) ensureUGCInputs(ctx context.Context, productID, personAssetID string) error {
	var ok bool
	if err := s.pool.QueryRow(ctx, `select exists(select 1 from public.products where id::text = $1)`, productID).Scan(&ok); err != nil {
		return err
	}
	if !ok {
		return pgx.ErrNoRows
	}
	if err := s.pool.QueryRow(ctx, `select exists(select 1 from public.ugc_person_assets where id::text = $1)`, personAssetID).Scan(&ok); err != nil {
		return err
	}
	if !ok {
		return pgx.ErrNoRows
	}
	return nil
}

func (s *Store) ensureNoActiveUGCRun(ctx context.Context, productID, personAssetID string) error {
	const query = `
select exists (
  select 1
  from public.ugc_generation_runs
  where product_id::text = $1
    and person_asset_id::text = $2
    and status = any($3::text[])
)
`
	activeStatuses := []string{"queued", "planning", "generating", "voicing", "qa_review"}
	var exists bool
	if err := s.pool.QueryRow(ctx, query, productID, personAssetID, activeStatuses).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return errAlreadyRunning
	}
	return nil
}

func (s *Store) ensureUGCDailyLimit(ctx context.Context, productID string, maxRuns int) error {
	if maxRuns <= 0 {
		return nil
	}
	var count int
	if err := s.pool.QueryRow(ctx, `
select count(*)
from public.ugc_generation_runs
where product_id::text = $1
  and created_at >= date_trunc('day', now())
`, productID).Scan(&count); err != nil {
		return err
	}
	if count >= maxRuns {
		return errBlocked
	}
	return nil
}

func (s *Store) enqueueUGCRun(ctx context.Context, runID, triggerMode, actorID string, retry bool) error {
	payload := map[string]any{
		"run_id":       runID,
		"trigger_mode": triggerMode,
		"requested_by": actorID,
		"retry":        retry,
		"requested_at": time.Now().UTC().Format(time.RFC3339),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	dedupeKey := runID
	if retry {
		dedupeKey = fmt.Sprintf("%s:%d", runID, time.Now().UTC().Unix())
	}
	_, err = s.pool.Exec(ctx, `
insert into public.queue_jobs (queue_name, job_type, dedupe_key, payload, status)
values ('automation', 'creative.ugc.generate.requested', $1, $2::jsonb, 'pending')
on conflict (queue_name, dedupe_key) do nothing
`, dedupeKey, string(body))
	return err
}

func (s *Store) RequestUGCAutopilotScan(ctx context.Context, reason string) error {
	payload, err := json.Marshal(map[string]any{
		"reason":       defaultUGCString(reason, "manual_request"),
		"requested_at": time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return err
	}
	dedupeKey := fmt.Sprintf("ugc-autopilot-scan:%s", time.Now().UTC().Format("200601021504"))
	_, err = s.pool.Exec(ctx, `
insert into public.queue_jobs (queue_name, job_type, dedupe_key, payload, status)
values ('automation', 'creative.ugc.autopilot.scan.requested', $1, $2::jsonb, 'pending')
on conflict (queue_name, dedupe_key) do nothing
`, dedupeKey, string(payload))
	return err
}

func defaultUGCPipelineSnapshot(inputPayload map[string]any) map[string]any {
	return map[string]any{
		"planner_model":           "nvidia/cosmos-reason2",
		"generator_model":         "nvidia/cosmos-predict1-video2world",
		"bulk_renderer":           "modal/ugc-bulk-renderer",
		"refine_model":            "nvidia/cosmos-transfer2_5",
		"guardrail_model":         "nvidia/nemo-guardrails",
		"render_lane":             asString(inputPayload["render_lane"]),
		"preferred_render_engine": asString(inputPayload["render_provider"]),
		"variant_count":           4,
		"stage_cache":             true,
	}
}

func defaultUGCString(value any, fallback string) string {
	resolved := asString(value)
	if resolved == "" {
		return fallback
	}
	return resolved
}

func normalizeStoredUGCOutputPack(value, fallback string) string {
	switch strings.TrimSpace(value) {
	case "single":
		return "single"
	case "hero_plus_three", "hero_plus_3":
		return "hero_plus_3"
	case "five_pack", "pack_5":
		return "pack_5"
	default:
		return fallback
	}
}

func normalizeStoredUGCAudioMode(value, fallback string) string {
	switch strings.TrimSpace(value) {
	case "subtitles_only", "captions_only":
		return "captions_only"
	case "voice_subtitles", "voice_and_captions":
		return "voice_and_captions"
	case "voice_and_silent":
		return "voice_and_silent"
	default:
		return fallback
	}
}

func normalizeStoredUGCRenderLane(value, fallback string) string {
	switch strings.TrimSpace(value) {
	case "fast":
		return "fast"
	case "balanced":
		return "balanced"
	case "quality":
		return "quality"
	default:
		return fallback
	}
}

func normalizeStoredUGCRenderProvider(value, fallback string) string {
	switch strings.TrimSpace(value) {
	case "auto":
		return "auto"
	case "hybrid":
		return "hybrid"
	case "modal":
		return "modal"
	case "nvidia":
		return "nvidia"
	default:
		return fallback
	}
}
