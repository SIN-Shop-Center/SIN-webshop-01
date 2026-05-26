package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type channelConnectSessionRuntime struct {
	ID              string
	Channel         string
	Status          string
	RedirectURL     string
	CallbackPayload map[string]any
}

func (p *Processor) handleChannelConnectBrowserMetadataRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid channel connect browser metadata payload", ErrPermanent)
	}

	channel := strings.TrimSpace(asString(payload["channel"]))
	stateToken := strings.TrimSpace(asString(payload["state_token"]))
	if channel != "tiktok" || stateToken == "" {
		return fmt.Errorf("%w: missing channel or state token", ErrPermanent)
	}

	session, err := p.loadChannelConnectSession(ctx, channel, stateToken)
	if err != nil {
		return err
	}

	callbackPayload := session.CallbackPayload
	connectContext := asMap(callbackPayload["tiktok_connect_context"])
	requestPayload := asMap(callbackPayload["tiktok_browser_request"])

	candidateURLs := []string{}
	for _, value := range []string{
		asString(payload["target_url"]),
		asString(requestPayload["target_url"]),
		asString(connectContext["source_url"]),
	} {
		if value = strings.TrimSpace(value); value != "" && !containsString(candidateURLs, value) {
			candidateURLs = append(candidateURLs, value)
		}
	}
	for _, value := range normalizeWorkerStringSlice(payload["candidate_urls"]) {
		if value = strings.TrimSpace(value); value != "" && !containsString(candidateURLs, value) {
			candidateURLs = append(candidateURLs, value)
		}
	}
	for _, value := range normalizeWorkerStringSlice(requestPayload["candidate_urls"]) {
		if value = strings.TrimSpace(value); value != "" && !containsString(candidateURLs, value) {
			candidateURLs = append(candidateURLs, value)
		}
	}

	artifactPayload := map[string]any{
		"channel":             channel,
		"state_token":         stateToken,
		"requested_at":        time.Now().UTC().Format(time.RFC3339),
		"callback_path":       "/api/admin/channels/tiktok/connect/browser-metadata/callback",
		"browser_session_ref": firstNonEmptyWorker(asString(payload["browser_session_ref"]), asString(requestPayload["browser_session_ref"]), asString(connectContext["browser_session_ref"])),
		"target_url":          firstNonEmptyWorker(asString(payload["target_url"]), asString(requestPayload["target_url"])),
		"candidate_urls":      candidateURLs,
		"browser_recipe":      firstNonEmptyMap(asMap(payload["browser_recipe"]), asMap(requestPayload["browser_recipe"])),
		"request_payload":     firstNonEmptyMap(asMap(payload["request_payload"]), asMap(requestPayload["request_payload"])),
		"merchant_id":         firstNonEmptyWorker(asString(connectContext["merchant_id"]), asString(connectContext["seller_id"])),
		"seller_id":           firstNonEmptyWorker(asString(connectContext["seller_id"]), asString(connectContext["merchant_id"])),
		"site_url":            strings.TrimRight(strings.TrimSpace(p.options.SiteURL), "/"),
	}
	if artifactPayload["site_url"] != "" {
		siteURL := artifactPayload["site_url"].(string)
		artifactPayload["callback_url"] = siteURL + "/api/admin/channels/tiktok/connect/browser-metadata/callback"
		artifactPayload["browser_runner_url"] = siteURL + "/api/automation/tiktok-shop/browser-metadata"
	}

	if err := p.postAutomationEvent(ctx, "channel.connect.browser_metadata.requested", artifactPayload); err != nil {
		_ = p.appendCRMActivity(ctx, "channel", channel, "channel.connect.browser_metadata_failed", "error", "automation", "TikTok Browser-Metadaten konnten nicht an die Automation-Bridge gesendet werden.", map[string]any{
			"state_token":    stateToken,
			"dispatch_error": truncateErr(err),
		})
		return err
	}

	_ = p.appendCRMActivity(ctx, "channel", channel, "channel.connect.browser_metadata_requested", "info", "automation", "TikTok Browser-Metadaten wurden zur Automation-Bridge weitergegeben.", map[string]any{
		"state_token":         stateToken,
		"browser_session_ref": artifactPayload["browser_session_ref"],
		"target_url":          artifactPayload["target_url"],
	})
	return nil
}

func (p *Processor) loadChannelConnectSession(ctx context.Context, channel, stateToken string) (*channelConnectSessionRuntime, error) {
	var record channelConnectSessionRuntime
	var callbackRaw string
	err := p.pool.QueryRow(ctx, `
select id::text,
       channel,
       status,
       coalesce(redirect_url, ''),
       callback_payload::text
from shop.channel_connection_sessions
where channel = $1
  and state_token = $2
limit 1
`, channel, stateToken).Scan(
		&record.ID,
		&record.Channel,
		&record.Status,
		&record.RedirectURL,
		&callbackRaw,
	)
	if err != nil {
		return nil, err
	}
	record.CallbackPayload = map[string]any{}
	if strings.TrimSpace(callbackRaw) != "" {
		_ = json.Unmarshal([]byte(callbackRaw), &record.CallbackPayload)
	}
	return &record, nil
}

func containsString(values []string, needle string) bool {
	for _, value := range values {
		if value == needle {
			return true
		}
	}
	return false
}

func firstNonEmptyMap(values ...map[string]any) map[string]any {
	for _, value := range values {
		if len(value) > 0 {
			return value
		}
	}
	return map[string]any{}
}

func normalizeWorkerStringSlice(value any) []string {
	switch typed := value.(type) {
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if item = strings.TrimSpace(item); item != "" {
				out = append(out, item)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if current := strings.TrimSpace(asString(item)); current != "" {
				out = append(out, current)
			}
		}
		return out
	default:
		if current := strings.TrimSpace(asString(value)); current != "" {
			return []string{current}
		}
		return []string{}
	}
}
