package worker

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"simone-webshop/apps/api/internal/admin"
)

type ugcVariant struct {
	Role         string
	Label        string
	Status       string
	PreviewURL   string
	VideoURL     string
	ThumbnailURL string
	ScriptText   string
	VoiceText    string
	SubtitleText string
	Metrics      map[string]any
}

const nvcfAssetCreateURL = "https://api.nvcf.nvidia.com/v2/nvcf/assets"

func (p *Processor) handleUGCAutopilotScanRequested(ctx context.Context, _ Job) error {
	store := admin.NewStore(p.pool)
	settings, err := store.GetUGCSettings(ctx)
	if err != nil {
		return err
	}
	if !settings.Enabled || settings.Mode != "auto" {
		return nil
	}

	var personAssetID string
	err = p.pool.QueryRow(ctx, `
select id::text
from shop.ugc_person_assets
where coalesce(is_default, false) = true
order by updated_at desc
limit 1
`).Scan(&personAssetID)
	if err == pgx.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}

	limit := settings.MaxAutopilotRunsPerSweep
	if limit <= 0 {
		limit = 1
	}
	rows, err := p.pool.Query(ctx, `
select p.id::text
from shop.products p
where p.is_active = true
  and coalesce(jsonb_array_length(p.images), 0) > 0
  and (
    select count(*)
    from shop.ugc_generation_runs r_daily
    where r_daily.product_id = p.id
      and r_daily.person_asset_id = $1::uuid
      and r_daily.created_at >= now() - interval '1 day'
  ) < $2
  and not exists (
    select 1
    from shop.ugc_generation_runs r_active
    where r_active.product_id = p.id
      and r_active.person_asset_id = $1::uuid
      and r_active.status in ('queued', 'planning', 'generating', 'voicing', 'qa_review')
  )
order by p.updated_at desc, p.created_at desc
limit $3
`, personAssetID, settings.MaxRunsPerProductPerDay, limit)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var productID string
		if err := rows.Scan(&productID); err != nil {
			return err
		}
		_, createErr := store.CreateUGCGenerationRun(ctx, map[string]any{
			"product_id":      productID,
			"person_asset_id": personAssetID,
			"trigger_mode":    "auto",
			"output_pack":     settings.DefaultOutputPack,
			"audio_mode":      settings.DefaultAudioMode,
			"language":        settings.PreferredLanguage,
			"voice_profile":   settings.VoiceProfile,
		}, "")
		if createErr != nil && !strings.Contains(createErr.Error(), "already_running") {
			return createErr
		}
	}
	return rows.Err()
}

func (p *Processor) handleUGCGenerationRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid ugc payload", ErrPermanent)
	}
	runID := normalizeUUID(asString(payload["run_id"]))
	if runID == "" {
		return fmt.Errorf("%w: missing ugc run_id", ErrPermanent)
	}

	run, err := p.loadUGCRun(ctx, runID)
	if err != nil {
		return err
	}

	if err := p.setUGCRunState(ctx, runID, "planning", "Entwickelt Hook, Script und Bildsprache", "", nil); err != nil {
		return err
	}

	pipeline, err := p.prepareUGCPipeline(ctx, run)
	if err != nil {
		_ = p.setUGCRunState(ctx, runID, "failed", "Pipeline konnte nicht vorbereitet werden", err.Error(), nil)
		return err
	}

	outcome, err := p.generateUGCOutcome(ctx, run, pipeline)
	if err != nil {
		_ = p.recordGrowthIncident(ctx, "ugc_generation_failed", "warning", "all", "UGC Render fehlgeschlagen", map[string]any{
			"run_id": runID,
			"error":  err.Error(),
		})
		_ = p.setUGCRunState(ctx, runID, "failed", "Rendering fehlgeschlagen", err.Error(), nil)
		return err
	}

	if err := p.replaceUGCVariants(ctx, runID, run, outcome.Variants, outcome.UsedConceptOnly); err != nil {
		return err
	}

	resultPayload := p.outcomePayload(pipeline, outcome)
	status, statusMessage := p.outcomeStatus(outcome)
	if err := p.setUGCRunState(ctx, runID, status, statusMessage, "", resultPayload); err != nil {
		return err
	}
	return nil
}

func (p *Processor) loadUGCRun(ctx context.Context, runID string) (map[string]any, error) {
	const query = `
select row_to_json(t)
from (
  select r.id::text,
         r.title,
         r.aspect_ratio,
         r.output_pack,
         r.audio_mode,
         r.input_payload,
         r.settings_snapshot,
         r.pipeline_snapshot,
         jsonb_build_object(
           'id', p.id::text,
           'name', p.name,
           'description', p.description,
           'images', p.images,
           'price', p.price,
           'metadata', p.metadata
         ) as product,
         jsonb_build_object(
           'id', pa.id::text,
           'label', pa.label,
           'image_url', pa.image_url,
           'preview_url', pa.preview_url,
           'source_data_url', pa.source_data_url,
           'metadata', pa.metadata
         ) as person_asset
  from shop.ugc_generation_runs r
  join shop.products p on p.id = r.product_id
  join shop.ugc_person_assets pa on pa.id = r.person_asset_id
  where r.id::text = $1
  limit 1
) t
`
	var raw []byte
	if err := p.pool.QueryRow(ctx, query, runID).Scan(&raw); err != nil {
		return nil, err
	}
	run := map[string]any{}
	if err := json.Unmarshal(raw, &run); err != nil {
		return nil, err
	}
	return run, nil
}

func (p *Processor) setUGCRunState(ctx context.Context, runID, status, message, lastError string, resultPayload map[string]any) error {
	body := map[string]any{}
	if resultPayload != nil {
		body = resultPayload
	}
	resultJSON, err := json.Marshal(body)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
update shop.ugc_generation_runs
set status = $2,
    status_message = nullif($3, ''),
    last_error = nullif($4, ''),
    result_payload = case
      when $5::jsonb = '{}'::jsonb then result_payload
      else coalesce(result_payload, '{}'::jsonb) || $5::jsonb
    end,
    updated_at = now()
where id::text = $1
`, runID, status, message, lastError, string(resultJSON))
	return err
}

func (p *Processor) buildUGCBrief(run map[string]any) map[string]any {
	product := asMap(run["product"])
	person := asMap(run["person_asset"])
	input := asMap(run["input_payload"])

	productName := asString(product["name"])
	description := asString(product["description"])
	if description == "" {
		description = "im Alltag genutzt und spuerbar hilfreich"
	}
	hookStyle := defaultWorkerString(asString(input["hook_style"]), "authentisch")
	ctaStyle := defaultWorkerString(asString(input["cta_style"]), "ruhig-direkt")

	script := fmt.Sprintf(
		"Ich habe %s jetzt im Einsatz. Besonders gut finde ich, dass %s. Wenn du etwas suchst, das sich sofort einfach anfuehlt, ist das hier mein Favorit.",
		productName,
		description,
	)
	subtitle := fmt.Sprintf("Echter Eindruck. %s im Alltag. Schnell verstanden, direkt ausprobiert.", productName)

	return map[string]any{
		"hook":                fmt.Sprintf("%s in 3 Sekunden verstanden", productName),
		"script":              script,
		"subtitle":            subtitle,
		"product_name":        productName,
		"product_description": description,
		"person_label":        asString(person["label"]),
		"hook_style":          hookStyle,
		"cta_style":           ctaStyle,
		"aspect_ratio":        asString(run["aspect_ratio"]),
		"audio_mode":          asString(run["audio_mode"]),
		"output_pack":         asString(run["output_pack"]),
		"language":            defaultWorkerString(asString(input["language"]), "de"),
		"product_image":       firstString(product["images"]),
		"person_image":        defaultWorkerString(asString(person["preview_url"]), asString(person["image_url"])),
		"person_reference_image": firstNonEmptyUGC(
			asString(person["source_data_url"]),
			asString(person["preview_url"]),
			asString(person["image_url"]),
		),
	}
}

func (p *Processor) generateConceptUGCVariants(run map[string]any, brief map[string]any) []ugcVariant {
	personImage := asString(brief["person_image"])
	productImage := asString(brief["product_image"])
	preview := personImage
	if preview == "" {
		preview = productImage
	}
	baseScript := asString(brief["script"])
	baseSubtitle := asString(brief["subtitle"])
	productName := asString(brief["product_name"])

	labels := []struct {
		role  string
		label string
		lead  string
	}{
		{role: "hero", label: "Hero", lead: "Erster Eindruck"},
		{role: "variant", label: "Variante Alltag", lead: "Alltagsmoment"},
		{role: "variant", label: "Variante Nah dran", lead: "Close-up Nutzen"},
		{role: "variant", label: "Variante Empfehlung", lead: "Freundliche Empfehlung"},
	}

	out := make([]ugcVariant, 0, len(labels))
	for index, item := range labels {
		if index >= variantCountFromOutputPack(asString(run["output_pack"])) {
			break
		}
		out = append(out, ugcVariant{
			Role:         item.role,
			Label:        item.label,
			Status:       "concept_ready",
			PreviewURL:   preview,
			ThumbnailURL: preview,
			ScriptText:   fmt.Sprintf("%s: %s", item.lead, baseScript),
			VoiceText:    fmt.Sprintf("%s. %s", item.lead, baseScript),
			SubtitleText: fmt.Sprintf("%s. %s", item.lead, baseSubtitle),
			Metrics: map[string]any{
				"render_mode":      "concept",
				"rank":             index + 1,
				"product_name":     productName,
				"predicted_hook":   asString(brief["hook"]),
				"predicted_format": asString(run["aspect_ratio"]),
			},
		})
	}
	return out
}

func (p *Processor) generateLiveUGCVariants(ctx context.Context, run map[string]any, brief map[string]any) ([]ugcVariant, error) {
	referenceImage, err := p.resolveUGCReferenceImageDataURL(ctx, brief)
	if err != nil {
		return nil, err
	}

	requestedVariantSpecs := liveUGCVariantSpecs(variantCountFromOutputPack(asString(run["output_pack"])))
	if len(requestedVariantSpecs) == 0 {
		return nil, fmt.Errorf("%w: no_ugc_variants_requested", ErrPermanent)
	}
	liveVariantCount := minUGC(len(requestedVariantSpecs), p.nvidiaMaxLiveVariantsPerRun())
	variantSpecs := requestedVariantSpecs[:liveVariantCount]

	reasonNotes := ""

	if strings.TrimSpace(p.options.NVIDIAReasonURL) != "" {
		reasonResponse, reasonErr := p.callNVIDIAJSON(ctx, p.options.NVIDIAReasonURL, map[string]any{
			"prompt": buildUGCReasonPrompt(brief),
			"mode":   "image",
			"image":  referenceImage,
		})
		if reasonErr == nil {
			reasonNotes = firstNonEmptyUGC(
				asString(reasonResponse["analysis"]),
				asString(reasonResponse["text"]),
				asString(reasonResponse["response"]),
				asString(reasonResponse["output_text"]),
			)
		}
	}

	variants := make([]ugcVariant, 0, len(requestedVariantSpecs))
	errorsByVariant := []string{}
	for index, spec := range variantSpecs {
		response, predictErr := p.callNVIDIAJSON(ctx, p.options.NVIDIAPredictURL, buildUGCPredictPayload(brief, referenceImage, spec, index+1, reasonNotes))
		if predictErr != nil {
			errorsByVariant = append(errorsByVariant, fmt.Sprintf("%s: %v", spec.Label, predictErr))
			continue
		}
		variant := parseSingleLiveUGCVariant(response, brief, spec, index)
		if strings.TrimSpace(variant.VideoURL) == "" {
			errorsByVariant = append(errorsByVariant, fmt.Sprintf("%s: empty video response", spec.Label))
			continue
		}
		variants = append(variants, variant)
	}

	if len(variants) == 0 {
		return nil, fmt.Errorf("%w: ugc_predict_empty:%s", ErrPermanent, strings.Join(errorsByVariant, "; "))
	}

	if len(variants) < len(requestedVariantSpecs) {
		fallbacks := p.generateConceptUGCVariants(run, brief)
		for index := len(variants); index < len(requestedVariantSpecs) && index < len(fallbacks); index++ {
			fallback := fallbacks[index]
			if fallback.Metrics == nil {
				fallback.Metrics = map[string]any{}
			}
			fallback.Metrics["render_mode"] = "concept_fallback"
			fallback.Metrics["live_variant_cap"] = p.nvidiaMaxLiveVariantsPerRun()
			if len(errorsByVariant) > 0 {
				fallback.Metrics["live_error"] = errorsByVariant[minUGC(index, len(errorsByVariant)-1)]
			}
			variants = append(variants, fallback)
		}
	}

	if strings.TrimSpace(p.options.NVIDIATransferURL) != "" {
		for index := range variants {
			if variants[index].VideoURL == "" {
				continue
			}
			refined, transferErr := p.callNVIDIAJSON(ctx, p.options.NVIDIATransferURL, map[string]any{
				"video_url":     variants[index].VideoURL,
				"aspect_ratio":  asString(run["aspect_ratio"]),
				"variant_label": variants[index].Label,
			})
			if transferErr == nil {
				if updatedURL := firstNonEmptyUGC(
					asString(refined["video_url"]),
					asString(refined["output_url"]),
				); updatedURL != "" {
					variants[index].VideoURL = updatedURL
				}
			}
		}
	}

	return variants, nil
}

func (p *Processor) callNVIDIAJSON(ctx context.Context, endpoint string, payload map[string]any) (map[string]any, error) {
	var attemptErrors []string
	for _, endpointCandidate := range buildNVIDIAEndpointVariants(endpoint) {
		if isNVCFExecEndpoint(endpointCandidate) {
			parsed, err := p.callNVCFExec(ctx, endpointCandidate, payload)
			if err == nil {
				return parsed, nil
			}
			attemptErrors = append(attemptErrors, err.Error())
			continue
		}
		for _, payloadCandidate := range buildNVIDIARequestVariants(endpointCandidate, payload) {
			parsed, err := p.postNVIDIAJSON(ctx, endpointCandidate, payloadCandidate)
			if err == nil {
				return parsed, nil
			}
			attemptErrors = append(attemptErrors, err.Error())
		}
	}
	if len(attemptErrors) == 0 {
		return nil, fmt.Errorf("%w: nvidia_no_attempts", ErrPermanent)
	}
	return nil, fmt.Errorf("nvidia_request_failed:%s", strings.Join(attemptErrors, " | "))
}

func (p *Processor) postNVIDIAJSON(ctx context.Context, endpoint string, payload map[string]any) (map[string]any, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 120 * time.Second}
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if err := p.reserveNVIDIARequestSlot(ctx); err != nil {
			return nil, err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json, video/*, application/octet-stream")
		req.Header.Set("Authorization", "Bearer "+p.options.NVIDIAAPIKey)

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			p.extendNVIDIABackoff(p.nvidiaMinRequestInterval())
			if attempt < 2 {
				continue
			}
			return nil, err
		}

		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 16*1024*1024))
		_ = resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return parseNVIDIAResponse(raw, resp.Header.Get("Content-Type"), p.options.NVIDIAAPIKey)
		}

		lastErr = fmt.Errorf("nvidia_api_non_2xx:%d:%s", resp.StatusCode, strings.TrimSpace(string(raw)))
		retryDelay := retryAfterDelay(resp.Header.Get("Retry-After"))
		if retryDelay <= 0 && resp.StatusCode == http.StatusTooManyRequests {
			retryDelay = maxDuration(p.nvidiaMinRequestInterval()*2, 30*time.Second)
		}
		if retryDelay > 0 {
			p.extendNVIDIABackoff(retryDelay)
		}
		if attempt < 2 && shouldRetryNVIDIAStatus(resp.StatusCode) {
			continue
		}
		return nil, lastErr
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("%w: nvidia_unknown_transport_error", ErrPermanent)
	}
	return nil, lastErr
}

func (p *Processor) callNVCFExec(ctx context.Context, endpoint string, payload map[string]any) (map[string]any, error) {
	command, assetRefs, err := p.prepareNVCFCommand(ctx, payload)
	if err != nil {
		return nil, err
	}

	requests := []map[string]any{
		{
			"requestHeader": map[string]any{
				"pollDurationSeconds":  120,
				"inputAssetReferences": assetRefs,
			},
			"requestBody": map[string]any{
				"inputs": []map[string]any{
					{
						"name":     "command",
						"shape":    []int{1},
						"datatype": "BYTES",
						"data":     []string{command},
					},
				},
			},
		},
		{
			"requestHeader": map[string]any{
				"pollDurationSeconds":  120,
				"inputAssetReferences": assetRefs,
			},
			"requestBody": map[string]any{
				"command": command,
			},
		},
	}

	errorsByVariant := []string{}
	for _, requestPayload := range requests {
		parsed, callErr := p.postNVIDIAJSON(ctx, endpoint, requestPayload)
		if callErr == nil {
			return parsed, nil
		}
		errorsByVariant = append(errorsByVariant, callErr.Error())
	}
	return nil, fmt.Errorf("nvcf_exec_failed:%s", strings.Join(errorsByVariant, " | "))
}

func (p *Processor) prepareNVCFCommand(ctx context.Context, payload map[string]any) (string, []string, error) {
	prompt := strings.TrimSpace(asString(payload["prompt"]))
	if prompt == "" {
		return "", nil, fmt.Errorf("%w: missing_nvcf_prompt", ErrPermanent)
	}

	if image := strings.TrimSpace(asString(payload["image"])); image != "" {
		assetID, err := p.createNVCFAssetFromDataURL(ctx, image)
		if err != nil {
			return "", nil, err
		}
		return fmt.Sprintf(`video2world --prompt="%s" --input_image_index=0`, escapeNVCFPrompt(prompt)), []string{assetID}, nil
	}
	if video := strings.TrimSpace(asString(payload["video"])); video != "" {
		assetID, err := p.createNVCFAssetFromDataURL(ctx, video)
		if err != nil {
			return "", nil, err
		}
		return fmt.Sprintf(`video2world --prompt="%s" --input_video_index=0`, escapeNVCFPrompt(prompt)), []string{assetID}, nil
	}
	return "", nil, fmt.Errorf("%w: nvcf_reference_media_required", ErrPermanent)
}

func (p *Processor) createNVCFAssetFromDataURL(ctx context.Context, dataURL string) (string, error) {
	contentType, blob, err := decodeMediaDataURL(dataURL)
	if err != nil {
		return "", err
	}

	requestBody, err := json.Marshal(map[string]any{
		"contentType": contentType,
		"description": "simone ugc reference",
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, nvcfAssetCreateURL, bytes.NewReader(requestBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.options.NVIDIAAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := (&http.Client{Timeout: 45 * time.Second}).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("nvcf_asset_create_failed:%d:%s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}

	parsed := map[string]any{}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", err
	}
	assetID := asString(parsed["assetId"])
	uploadURL := asString(parsed["uploadUrl"])
	if assetID == "" || uploadURL == "" {
		return "", fmt.Errorf("%w: nvcf_asset_response_invalid", ErrPermanent)
	}

	uploadReq, err := http.NewRequestWithContext(ctx, http.MethodPut, uploadURL, bytes.NewReader(blob))
	if err != nil {
		return "", err
	}
	uploadReq.Header.Set("Content-Type", contentType)
	uploadReq.Header.Set("x-amz-meta-nvcf-asset-description", "simone ugc reference")

	uploadResp, err := (&http.Client{Timeout: 90 * time.Second}).Do(uploadReq)
	if err != nil {
		return "", err
	}
	defer uploadResp.Body.Close()
	if uploadResp.StatusCode < 200 || uploadResp.StatusCode >= 300 {
		uploadRaw, _ := io.ReadAll(io.LimitReader(uploadResp.Body, 2*1024*1024))
		return "", fmt.Errorf("nvcf_asset_upload_failed:%d:%s", uploadResp.StatusCode, strings.TrimSpace(string(uploadRaw)))
	}

	return assetID, nil
}

func parseLiveUGCVariants(response map[string]any, brief map[string]any) []ugcVariant {
	rawVariants := asSlice(response["variants"])
	if len(rawVariants) == 0 {
		if singleURL := firstNonEmptyUGC(asString(response["video_url"]), asString(response["output_url"])); singleURL != "" {
			rawVariants = []any{
				map[string]any{
					"variant_role":  "hero",
					"variant_label": "Hero",
					"video_url":     singleURL,
					"thumbnail_url": asString(response["thumbnail_url"]),
					"preview_url":   asString(response["preview_url"]),
				},
			}
		}
	}

	out := make([]ugcVariant, 0, len(rawVariants))
	for index, raw := range rawVariants {
		item := asMap(raw)
		label := firstNonEmptyUGC(asString(item["variant_label"]), fmt.Sprintf("Variante %d", index+1))
		role := firstNonEmptyUGC(asString(item["variant_role"]), ternary(index == 0, "hero", "variant"))
		preview := firstNonEmptyUGC(asString(item["preview_url"]), asString(item["thumbnail_url"]), asString(brief["person_image"]), asString(brief["product_image"]))
		out = append(out, ugcVariant{
			Role:         role,
			Label:        label,
			Status:       "ready",
			PreviewURL:   preview,
			VideoURL:     firstNonEmptyUGC(asString(item["video_url"]), asString(item["output_url"])),
			ThumbnailURL: firstNonEmptyUGC(asString(item["thumbnail_url"]), preview),
			ScriptText:   firstNonEmptyUGC(asString(item["script_text"]), asString(brief["script"])),
			VoiceText:    firstNonEmptyUGC(asString(item["voice_text"]), asString(brief["script"])),
			SubtitleText: firstNonEmptyUGC(asString(item["subtitle_text"]), asString(brief["subtitle"])),
			Metrics: map[string]any{
				"render_mode": "live",
				"rank":        index + 1,
			},
		})
	}
	return out
}

type liveUGCVariantSpec struct {
	Role      string
	Label     string
	Direction string
}

func liveUGCVariantSpecs(count int) []liveUGCVariantSpec {
	specs := []liveUGCVariantSpec{
		{Role: "hero", Label: "Hero", Direction: "Starker Hook in den ersten 3 Sekunden, authentisch, vertical 9:16, selfie-naher UGC-Look."},
		{Role: "variant", Label: "Variante Alltag", Direction: "Alltagsszene, natuerliche Nutzung, ruhiger Nutzenfokus, vertical 9:16."},
		{Role: "variant", Label: "Variante Nah dran", Direction: "Nahaufnahme auf Anwendung und Ergebnis, klares Produktgefuehl, vertical 9:16."},
		{Role: "variant", Label: "Variante Empfehlung", Direction: "Wie eine ehrliche Empfehlung an eine Freundin, warm und vertrauensvoll, vertical 9:16."},
		{Role: "variant", Label: "Variante Testimonial", Direction: "Mehr Gesichtszeit, direkte Kameraansprache, glaubwuerdige Mini-Story, vertical 9:16."},
	}
	if count <= 0 || count >= len(specs) {
		return specs[:minUGC(maxUGC(count, 1), len(specs))]
	}
	return specs[:count]
}

func buildUGCReasonPrompt(brief map[string]any) string {
	return fmt.Sprintf(
		"Create a concise visual UGC shot plan in German for %s. Product benefit: %s. Tone: %s. CTA style: %s. Keep it short and practical.",
		asString(brief["product_name"]),
		asString(brief["product_description"]),
		asString(brief["hook_style"]),
		asString(brief["cta_style"]),
	)
}

func buildUGCPredictPayload(brief map[string]any, referenceImage string, spec liveUGCVariantSpec, seed int, reasonNotes string) map[string]any {
	return map[string]any{
		"prompt":        buildUGCRenderPrompt(brief, spec, reasonNotes),
		"mode":          "image",
		"image":         referenceImage,
		"model_profile": "predict1",
		"seed":          seed,
		"video_params": map[string]any{
			"height": 1024,
			"width":  640,
		},
	}
}

func (p *Processor) resolveUGCReferenceImageDataURL(ctx context.Context, brief map[string]any) (string, error) {
	reference := firstNonEmptyUGC(
		asString(brief["person_reference_image"]),
		asString(brief["person_image"]),
		asString(brief["product_image"]),
	)
	if reference == "" {
		return "", fmt.Errorf("%w: ugc_missing_reference_image", ErrPermanent)
	}
	return p.ensureMediaDataURL(ctx, reference)
}

func (p *Processor) ensureMediaDataURL(ctx context.Context, source string) (string, error) {
	if strings.HasPrefix(source, "data:") {
		return source, nil
	}
	if !strings.HasPrefix(source, "http://") && !strings.HasPrefix(source, "https://") {
		return "", fmt.Errorf("%w: unsupported_reference_image_source", ErrPermanent)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
	if err != nil {
		return "", err
	}
	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("ugc_reference_download_failed:%d", resp.StatusCode)
	}

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024*1024))
	if err != nil {
		return "", err
	}
	if len(raw) == 0 {
		return "", fmt.Errorf("%w: empty_reference_image", ErrPermanent)
	}

	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = http.DetectContentType(raw)
	}
	if strings.Contains(contentType, ";") {
		contentType = strings.TrimSpace(strings.Split(contentType, ";")[0])
	}
	if !strings.HasPrefix(contentType, "image/") {
		if ext := strings.TrimSpace(path.Ext(source)); ext != "" {
			if guessed := mime.TypeByExtension(ext); strings.HasPrefix(guessed, "image/") {
				contentType = guessed
			}
		}
	}
	if !strings.HasPrefix(contentType, "image/") {
		contentType = "image/png"
	}

	return normalizeUGCImageDataURL(contentType, raw), nil
}

func buildNVIDIAEndpointVariants(endpoint string) []string {
	base := strings.TrimSpace(endpoint)
	if base == "" {
		return []string{}
	}

	out := []string{}
	appendEndpoint := func(candidate string) {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			return
		}
		for _, existing := range out {
			if existing == candidate {
				return
			}
		}
		out = append(out, candidate)
	}

	appendEndpoint(base)
	if strings.HasSuffix(base, "/infer") {
		appendEndpoint(strings.TrimSuffix(base, "/infer"))
	} else if !strings.Contains(base, "/v2/nvcf/exec/functions/") {
		appendEndpoint(strings.TrimRight(base, "/") + "/infer")
	}
	if strings.Contains(base, "/v1/cosmos/") {
		appendEndpoint(strings.Replace(base, "/v1/cosmos/", "/v1/genai/", 1))
	} else if strings.Contains(base, "/v1/genai/") {
		appendEndpoint(strings.Replace(base, "/v1/genai/", "/v1/cosmos/", 1))
	}
	return out
}

func buildNVIDIARequestVariants(endpoint string, payload map[string]any) []map[string]any {
	coreVariants := []map[string]any{payload}
	trimmedMode := cloneMap(payload)
	delete(trimmedMode, "mode")
	if len(trimmedMode) > 0 {
		coreVariants = append(coreVariants, trimmedMode)
	}

	seen := map[string]struct{}{}
	out := []map[string]any{}
	appendPayload := func(candidate map[string]any) {
		raw, _ := json.Marshal(candidate)
		key := string(raw)
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		out = append(out, candidate)
	}

	for _, core := range coreVariants {
		if strings.Contains(endpoint, "/v1/cosmos/") || strings.Contains(endpoint, "/v1/genai/") {
			appendPayload(toNVIDIATritonPayload(core))
			appendPayload(map[string]any{"inputs": []any{core}})
			appendPayload(map[string]any{"inputs": core})
		}
		appendPayload(core)
		appendPayload(map[string]any{"input": core})
		appendPayload(map[string]any{"data": []any{core}})
	}

	return out
}

func toNVIDIATritonPayload(core map[string]any) map[string]any {
	inputs := []map[string]any{}
	parameters := map[string]any{}

	if prompt := asString(core["prompt"]); prompt != "" {
		inputs = append(inputs, map[string]any{
			"name":     "prompt",
			"shape":    []int{1},
			"datatype": "BYTES",
			"data":     []string{prompt},
		})
	}
	for _, mediaKey := range []string{"image", "video"} {
		if media := asString(core[mediaKey]); media != "" {
			inputs = append(inputs, map[string]any{
				"name":     mediaKey,
				"shape":    []int{1},
				"datatype": "BYTES",
				"data":     []string{media},
			})
		}
	}
	for _, key := range []string{"mode", "steps", "guidance_scale", "seed", "model_profile"} {
		if value, ok := core[key]; ok {
			parameters[key] = value
		}
	}

	payload := map[string]any{"inputs": inputs}
	if len(parameters) > 0 {
		payload["parameters"] = parameters
	}
	return payload
}

func parseNVIDIAResponse(raw []byte, contentType, apiKey string) (map[string]any, error) {
	trimmedType := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	if strings.HasPrefix(trimmedType, "video/") {
		return map[string]any{
			"b64_video":    base64.StdEncoding.EncodeToString(raw),
			"content_type": trimmedType,
		}, nil
	}

	parsed := map[string]any{}
	if err := json.Unmarshal(raw, &parsed); err == nil && len(parsed) > 0 {
		if status := strings.ToLower(asString(parsed["status"])); status != "" && isNVCFPendingStatus(status) {
			return nil, fmt.Errorf("nvcf_pending:%s", firstNonEmptyUGC(asString(parsed["detail"]), asString(parsed["error"])))
		}
		if blob, mimeType, ok, err := extractNVIDIAArtifactBlob(parsed, apiKey); err != nil {
			return nil, err
		} else if ok {
			return map[string]any{
				"b64_video":    base64.StdEncoding.EncodeToString(blob),
				"content_type": mimeType,
			}, nil
		}
		return parsed, nil
	}

	return nil, fmt.Errorf("%w: nvidia_empty_payload", ErrPermanent)
}

func shouldRetryNVIDIAStatus(statusCode int) bool {
	switch statusCode {
	case http.StatusTooManyRequests, http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}

func parseSingleLiveUGCVariant(response map[string]any, brief map[string]any, spec liveUGCVariantSpec, index int) ugcVariant {
	variants := parseLiveUGCVariants(response, brief)
	if len(variants) > 0 {
		variant := variants[0]
		variant.Role = spec.Role
		variant.Label = spec.Label
		if variant.Metrics == nil {
			variant.Metrics = map[string]any{}
		}
		variant.Metrics["rank"] = index + 1
		return variant
	}

	videoURL := ""
	if b64 := firstNonEmptyUGC(asString(response["b64_video"]), asString(response["video_base64"])); b64 != "" {
		mimeType := firstNonEmptyUGC(asString(response["content_type"]), "video/mp4")
		videoURL = fmt.Sprintf("data:%s;base64,%s", mimeType, b64)
	}
	preview := firstNonEmptyUGC(asString(brief["person_image"]), asString(brief["product_image"]))

	return ugcVariant{
		Role:         spec.Role,
		Label:        spec.Label,
		Status:       "ready",
		PreviewURL:   preview,
		VideoURL:     videoURL,
		ThumbnailURL: preview,
		ScriptText:   asString(brief["script"]),
		VoiceText:    asString(brief["script"]),
		SubtitleText: asString(brief["subtitle"]),
		Metrics: map[string]any{
			"render_mode": "live",
			"rank":        index + 1,
		},
	}
}

func cloneMap(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func minUGC(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxUGC(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func isNVCFExecEndpoint(endpoint string) bool {
	return strings.Contains(endpoint, "/v2/nvcf/exec/functions/")
}

func escapeNVCFPrompt(prompt string) string {
	compact := strings.Join(strings.Fields(prompt), " ")
	return strings.ReplaceAll(strings.ReplaceAll(compact, `\`, `\\`), `"`, `\"`)
}

func decodeMediaDataURL(value string) (string, []byte, error) {
	parts := strings.SplitN(strings.TrimSpace(value), ",", 2)
	if len(parts) != 2 || !strings.HasPrefix(parts[0], "data:") {
		return "", nil, fmt.Errorf("%w: invalid_media_data_url", ErrPermanent)
	}

	meta := strings.TrimPrefix(parts[0], "data:")
	metaParts := strings.Split(meta, ";")
	contentType := strings.TrimSpace(metaParts[0])
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	blob, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", nil, fmt.Errorf("invalid_media_base64:%w", err)
	}
	if len(blob) == 0 {
		return "", nil, fmt.Errorf("%w: empty_media_blob", ErrPermanent)
	}
	return contentType, blob, nil
}

func extractNVIDIAArtifactBlob(payload map[string]any, apiKey string) ([]byte, string, bool, error) {
	if blob, mimeType, ok, err := extractNVIDIABlobCandidate(payload, apiKey); ok || err != nil {
		return blob, mimeType, ok, err
	}

	for _, key := range []string{"artifacts", "data"} {
		items := asSlice(payload[key])
		for _, item := range items {
			candidate := asMap(item)
			if blob, mimeType, ok, err := extractNVIDIABlobCandidate(candidate, apiKey); ok || err != nil {
				return blob, mimeType, ok, err
			}
		}
	}

	if result := asMap(payload["result"]); len(result) > 0 {
		if blob, mimeType, ok, err := extractNVIDIABlobCandidate(result, apiKey); ok || err != nil {
			return blob, mimeType, ok, err
		}
	}

	return nil, "", false, nil
}

func extractNVIDIABlobCandidate(candidate map[string]any, apiKey string) ([]byte, string, bool, error) {
	for _, key := range []string{"b64_video", "video_base64"} {
		if raw := asString(candidate[key]); raw != "" {
			blob, err := decodeBase64Artifact(raw)
			return blob, "video/mp4", err == nil, err
		}
	}

	for _, key := range []string{"video_url", "output_url", "download_url", "url"} {
		if raw := asString(candidate[key]); raw != "" {
			blob, mimeType, err := downloadNVIDIAArtifact(raw, apiKey)
			return blob, mimeType, err == nil, err
		}
	}

	return nil, "", false, nil
}

func decodeBase64Artifact(value string) ([]byte, error) {
	trimmed := strings.TrimSpace(value)
	if strings.HasPrefix(trimmed, "data:") {
		_, blob, err := decodeMediaDataURL(trimmed)
		return blob, err
	}
	return base64.StdEncoding.DecodeString(trimmed)
}

func downloadNVIDIAArtifact(rawURL, apiKey string) ([]byte, string, error) {
	headers := []map[string]string{
		{
			"Authorization": "Bearer " + apiKey,
			"Accept":        "video/*, application/octet-stream, application/json, application/zip",
		},
		{
			"Accept": "video/*, application/octet-stream, application/json, application/zip",
		},
	}

	var lastErr error
	for _, headerSet := range headers {
		req, err := http.NewRequest(http.MethodGet, rawURL, nil)
		if err != nil {
			return nil, "", err
		}
		for key, value := range headerSet {
			req.Header.Set(key, value)
		}
		resp, err := (&http.Client{Timeout: 90 * time.Second}).Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		body, _ := io.ReadAll(io.LimitReader(resp.Body, 32*1024*1024))
		_ = resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			contentType := strings.ToLower(strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0]))
			return normalizeNVIDIABlob(body, contentType)
		}
		lastErr = fmt.Errorf("nvidia_artifact_download_failed:%d:%s", resp.StatusCode, strings.TrimSpace(string(body)))
		if resp.StatusCode != http.StatusBadRequest && resp.StatusCode != http.StatusUnauthorized && resp.StatusCode != http.StatusForbidden {
			break
		}
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("%w: nvidia_artifact_download_unknown", ErrPermanent)
	}
	return nil, "", lastErr
}

func normalizeNVIDIABlob(blob []byte, contentType string) ([]byte, string, error) {
	if len(blob) >= 2 && blob[0] == 'P' && blob[1] == 'K' {
		reader, err := zip.NewReader(bytes.NewReader(blob), int64(len(blob)))
		if err != nil {
			return nil, "", err
		}

		mp4Files := []*zip.File{}
		for _, file := range reader.File {
			if strings.HasSuffix(strings.ToLower(file.Name), ".mp4") {
				mp4Files = append(mp4Files, file)
			}
		}
		if len(mp4Files) == 0 {
			return nil, "", fmt.Errorf("%w: nvidia_zip_without_mp4", ErrPermanent)
		}
		sort.Slice(mp4Files, func(i, j int) bool {
			return mp4Files[i].Name < mp4Files[j].Name
		})
		handle, err := mp4Files[0].Open()
		if err != nil {
			return nil, "", err
		}
		defer handle.Close()
		extracted, err := io.ReadAll(handle)
		if err != nil {
			return nil, "", err
		}
		return extracted, "video/mp4", nil
	}

	if contentType == "" {
		contentType = "video/mp4"
	}
	return blob, contentType, nil
}

func isNVCFPendingStatus(status string) bool {
	switch status {
	case "accepted", "queued", "pending", "running", "processing", "in_progress":
		return true
	default:
		return false
	}
}

func (p *Processor) replaceUGCVariants(ctx context.Context, runID string, run map[string]any, variants []ugcVariant, conceptOnly bool) error {
	if err := p.purgeUGCAssetBankForRun(ctx, runID); err != nil {
		return err
	}
	if _, err := p.pool.Exec(ctx, `delete from shop.ugc_generation_variants where run_id::text = $1`, runID); err != nil {
		return err
	}

	for _, variant := range variants {
		creativeAssetID, err := p.createUGCCreativeAsset(ctx, runID, run, variant, conceptOnly)
		if err != nil {
			return err
		}
		metricsJSON, err := json.Marshal(variant.Metrics)
		if err != nil {
			return err
		}
		var variantID string
		err = p.pool.QueryRow(ctx, `
insert into shop.ugc_generation_variants (
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
values ($1::uuid, $2::uuid, $3, $4, $5, nullif($6, ''), nullif($7, ''), nullif($8, ''), nullif($9, ''), nullif($10, ''), nullif($11, ''), $12::jsonb)
returning id::text
`, runID, creativeAssetID, variant.Role, variant.Label, variant.Status, variant.PreviewURL, variant.VideoURL, variant.ThumbnailURL, variant.ScriptText, variant.VoiceText, variant.SubtitleText, string(metricsJSON)).Scan(&variantID)
		if err != nil {
			return err
		}
		if conceptOnly || strings.TrimSpace(variant.VideoURL) == "" {
			continue
		}
		if err := p.syncUGCVariantToAssetBank(ctx, runID, variantID, creativeAssetID, run, variant); err != nil {
			_ = p.recordGrowthIncident(ctx, "ugc_asset_bank_sync_failed", "warning", "all", "UGC Asset Bank Sync fehlgeschlagen", map[string]any{
				"run_id":            runID,
				"variant_id":        variantID,
				"creative_asset_id": creativeAssetID,
				"error":             err.Error(),
			})
		}
	}

	return nil
}

func (p *Processor) createUGCCreativeAsset(ctx context.Context, runID string, run map[string]any, variant ugcVariant, conceptOnly bool) (string, error) {
	product := asMap(run["product"])
	meta := map[string]any{
		"ugc_run_id":    runID,
		"variant_role":  variant.Role,
		"variant_label": variant.Label,
		"product_id":    asString(product["id"]),
		"render_mode":   ternary(conceptOnly, "concept", "live"),
		"preview_url":   variant.PreviewURL,
		"thumbnail_url": variant.ThumbnailURL,
		"audio_mode":    asString(run["audio_mode"]),
		"aspect_ratio":  asString(run["aspect_ratio"]),
		"subtitle_text": variant.SubtitleText,
	}
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return "", err
	}
	title := fmt.Sprintf("%s - %s", asString(product["name"]), variant.Label)
	assetType := "ugc_video"
	if conceptOnly {
		assetType = "ugc_concept"
	}
	storageURL := firstNonEmptyUGC(variant.VideoURL, variant.PreviewURL)

	var creativeAssetID string
	err = p.pool.QueryRow(ctx, `
insert into shop.creative_assets (
  channel,
  asset_type,
  title,
  hook,
  status,
  storage_url,
  tags,
  metadata
)
values ('ugc_generator', $1, $2, $3, $4, nullif($5, ''), $6, $7::jsonb)
returning id::text
`, assetType, title, variant.ScriptText, ternary(conceptOnly, "concept", "draft"), storageURL, []string{"ugc", "generator"}, string(metaJSON)).Scan(&creativeAssetID)
	return creativeAssetID, err
}

func firstString(value any) string {
	switch typed := value.(type) {
	case []any:
		for _, item := range typed {
			if asString(item) != "" {
				return asString(item)
			}
		}
	case []string:
		for _, item := range typed {
			if strings.TrimSpace(item) != "" {
				return item
			}
		}
	}
	return ""
}

func asSlice(value any) []any {
	items, _ := value.([]any)
	if items == nil {
		return []any{}
	}
	return items
}

func firstNonEmptyUGC(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func defaultWorkerString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func variantCountFromOutputPack(value string) int {
	switch strings.TrimSpace(value) {
	case "single":
		return 1
	case "pack_5", "five_pack":
		return 5
	default:
		return 4
	}
}

func ternary[T any](condition bool, whenTrue, whenFalse T) T {
	if condition {
		return whenTrue
	}
	return whenFalse
}
