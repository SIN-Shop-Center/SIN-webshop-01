package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func (p *Processor) renderModalUGCVariants(ctx context.Context, run map[string]any, brief map[string]any, plan ugcRenderPlan, strategy ugcRenderStrategy) ([]ugcVariant, map[string]any, error) {
	if !p.modalConfigured() {
		return nil, nil, fmt.Errorf("%w: modal_not_configured", ErrPermanent)
	}

	requested := plan.Variants
	if len(requested) > p.modalMaxVariantsPerRun() {
		requested = requested[:p.modalMaxVariantsPerRun()]
	}
	payload := map[string]any{
		"run_id":          asString(run["id"]),
		"lane":            strategy.Lane,
		"provider":        "modal",
		"aspect_ratio":    asString(run["aspect_ratio"]),
		"audio_mode":      asString(run["audio_mode"]),
		"reference_image": plan.ReferenceImage,
		"brief":           brief,
		"variants":        requested,
	}

	response, err := p.postModalJSON(ctx, p.options.ModalRenderURL, payload)
	if err != nil {
		return nil, nil, err
	}
	finalResponse, err := p.awaitModalResult(ctx, response)
	if err != nil {
		return nil, nil, err
	}

	variants := parseModalUGCVariants(finalResponse, brief, requested, strategy.Lane)
	if len(variants) == 0 {
		return nil, nil, fmt.Errorf("%w: modal_empty_variants", ErrPermanent)
	}
	return variants, map[string]any{
		"provider":      "modal",
		"requested":     len(requested),
		"returned":      len(variants),
		"render_mode":   "live",
		"response_mode": detectModalResponseMode(finalResponse),
	}, nil
}

func (p *Processor) postModalJSON(ctx context.Context, endpoint string, payload map[string]any) (map[string]any, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: maxDuration(p.options.ModalRequestTimeout, 120*time.Second)}
	var lastErr error

	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		if token := strings.TrimSpace(p.options.ModalAPIToken); token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			if attempt < 2 {
				time.Sleep(time.Duration(attempt+1) * time.Second)
				continue
			}
			return nil, err
		}

		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 16*1024*1024))
		_ = resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			parsed := map[string]any{}
			if err := json.Unmarshal(raw, &parsed); err != nil {
				return nil, err
			}
			return parsed, nil
		}

		lastErr = fmt.Errorf("modal_api_non_2xx:%d:%s", resp.StatusCode, strings.TrimSpace(string(raw)))
		if attempt < 2 && shouldRetryModalStatus(resp.StatusCode) {
			delay := retryAfterDelay(resp.Header.Get("Retry-After"))
			if delay <= 0 {
				delay = time.Duration(attempt+1) * 3 * time.Second
			}
			time.Sleep(delay)
			continue
		}
		return nil, lastErr
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("%w: modal_unknown_transport_error", ErrPermanent)
	}
	return nil, lastErr
}

func (p *Processor) awaitModalResult(ctx context.Context, response map[string]any) (map[string]any, error) {
	current := unwrapModalResponse(response)
	status := strings.ToLower(firstNonEmptyUGC(asString(current["status"]), asString(response["status"])))
	if !isModalPendingStatus(status) {
		return current, nil
	}

	jobID := firstNonEmptyUGC(asString(current["job_id"]), asString(response["job_id"]), asString(current["id"]), asString(response["id"]))
	statusURL := firstNonEmptyUGC(asString(current["status_url"]), asString(response["status_url"]))
	statusURL = p.resolveModalStatusURL(statusURL, jobID)
	if statusURL == "" {
		return nil, fmt.Errorf("%w: modal_status_url_missing", ErrPermanent)
	}

	pollInterval := maxDuration(p.options.ModalPollInterval, 5*time.Second)
	timeout := maxDuration(p.options.ModalRequestTimeout, 8*time.Minute)
	deadlineCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	for {
		select {
		case <-deadlineCtx.Done():
			return nil, deadlineCtx.Err()
		case <-time.After(pollInterval):
		}

		polled, err := p.fetchModalStatus(deadlineCtx, statusURL, jobID)
		if err != nil {
			return nil, err
		}
		current = unwrapModalResponse(polled)
		status = strings.ToLower(firstNonEmptyUGC(asString(current["status"]), asString(polled["status"])))
		if isModalPendingStatus(status) {
			continue
		}
		return current, nil
	}
}

func (p *Processor) resolveModalStatusURL(statusURL, jobID string) string {
	if strings.TrimSpace(statusURL) != "" {
		return strings.TrimSpace(statusURL)
	}
	base := strings.TrimSpace(p.options.ModalStatusURL)
	if base == "" {
		return ""
	}
	if strings.Contains(base, "{job_id}") {
		return strings.ReplaceAll(base, "{job_id}", url.PathEscape(jobID))
	}
	if jobID == "" {
		return base
	}
	if strings.Contains(base, "?") {
		return base + "&job_id=" + url.QueryEscape(jobID)
	}
	return base + "?job_id=" + url.QueryEscape(jobID)
}

func (p *Processor) fetchModalStatus(ctx context.Context, statusURL, jobID string) (map[string]any, error) {
	client := &http.Client{Timeout: maxDuration(p.options.ModalRequestTimeout, 90*time.Second)}

	requests := []struct {
		method  string
		bodyRaw []byte
	}{
		{method: http.MethodGet},
		{method: http.MethodPost, bodyRaw: []byte(`{"job_id":"` + jobID + `"}`)},
	}

	var lastErr error
	for _, request := range requests {
		req, err := http.NewRequestWithContext(ctx, request.method, statusURL, bytes.NewReader(request.bodyRaw))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")
		if request.method == http.MethodPost {
			req.Header.Set("Content-Type", "application/json")
		}
		if token := strings.TrimSpace(p.options.ModalAPIToken); token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 8*1024*1024))
		_ = resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			parsed := map[string]any{}
			if err := json.Unmarshal(raw, &parsed); err != nil {
				return nil, err
			}
			return parsed, nil
		}
		lastErr = fmt.Errorf("modal_status_non_2xx:%d:%s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("%w: modal_status_unknown", ErrPermanent)
	}
	return nil, lastErr
}

func parseModalUGCVariants(response map[string]any, brief map[string]any, requested []ugcRenderVariantPlan, lane string) []ugcVariant {
	rawVariants := asSlice(response["variants"])
	if len(rawVariants) == 0 {
		if result := asMap(response["result"]); len(result) > 0 {
			rawVariants = asSlice(result["variants"])
			if len(rawVariants) == 0 {
				response = result
			}
		}
	}
	if len(rawVariants) == 0 {
		if data := asMap(response["data"]); len(data) > 0 {
			rawVariants = asSlice(data["variants"])
			if len(rawVariants) == 0 {
				response = data
			}
		}
	}
	if len(rawVariants) == 0 {
		if singleURL := firstNonEmptyUGC(asString(response["video_url"]), asString(response["output_url"]), asString(response["url"])); singleURL != "" {
			rawVariants = []any{map[string]any{"video_url": singleURL}}
		}
		if len(rawVariants) == 0 && firstNonEmptyUGC(asString(response["b64_video"]), asString(response["video_base64"])) != "" {
			rawVariants = []any{response}
		}
	}

	preview := firstNonEmptyUGC(asString(brief["person_image"]), asString(brief["product_image"]))
	out := make([]ugcVariant, 0, len(rawVariants))
	for index, raw := range rawVariants {
		item := asMap(raw)
		requestedVariant := ugcRenderVariantPlan{}
		if index < len(requested) {
			requestedVariant = requested[index]
		}
		videoURL := firstNonEmptyUGC(asString(item["video_url"]), asString(item["output_url"]), asString(item["url"]))
		if videoURL == "" {
			if b64 := firstNonEmptyUGC(asString(item["b64_video"]), asString(item["video_base64"])); b64 != "" {
				mimeType := firstNonEmptyUGC(asString(item["content_type"]), "video/mp4")
				videoURL = fmt.Sprintf("data:%s;base64,%s", mimeType, b64)
			}
		}
		out = append(out, ugcVariant{
			Role:         firstNonEmptyUGC(asString(item["variant_role"]), requestedVariant.Role, ternary(index == 0, "hero", "variant")),
			Label:        firstNonEmptyUGC(asString(item["variant_label"]), requestedVariant.Label, fmt.Sprintf("Variante %d", index+1)),
			Status:       firstNonEmptyUGC(asString(item["status"]), "ready"),
			PreviewURL:   firstNonEmptyUGC(asString(item["preview_url"]), asString(item["thumbnail_url"]), preview),
			VideoURL:     videoURL,
			ThumbnailURL: firstNonEmptyUGC(asString(item["thumbnail_url"]), asString(item["preview_url"]), preview),
			ScriptText:   firstNonEmptyUGC(asString(item["script_text"]), asString(brief["script"])),
			VoiceText:    firstNonEmptyUGC(asString(item["voice_text"]), asString(brief["script"])),
			SubtitleText: firstNonEmptyUGC(asString(item["subtitle_text"]), asString(brief["subtitle"])),
			Metrics: map[string]any{
				"render_mode":     "live",
				"render_provider": "modal",
				"render_lane":     lane,
				"rank":            index + 1,
			},
		})
	}
	return out
}

func unwrapModalResponse(response map[string]any) map[string]any {
	for _, key := range []string{"result", "data"} {
		if inner := asMap(response[key]); len(inner) > 0 {
			return inner
		}
	}
	return response
}

func detectModalResponseMode(response map[string]any) string {
	if len(asSlice(response["variants"])) > 0 {
		return "variants"
	}
	if inner := asMap(response["result"]); len(inner) > 0 && len(asSlice(inner["variants"])) > 0 {
		return "result.variants"
	}
	if inner := asMap(response["data"]); len(inner) > 0 && len(asSlice(inner["variants"])) > 0 {
		return "data.variants"
	}
	if firstNonEmptyUGC(asString(response["video_url"]), asString(response["output_url"]), asString(response["url"])) != "" {
		return "single"
	}
	if firstNonEmptyUGC(asString(response["b64_video"]), asString(response["video_base64"])) != "" {
		return "inline_base64"
	}
	return "unknown"
}

func shouldRetryModalStatus(statusCode int) bool {
	switch statusCode {
	case http.StatusTooManyRequests, http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}

func isModalPendingStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "accepted", "queued", "pending", "running", "processing", "in_progress", "building":
		return true
	default:
		return false
	}
}
