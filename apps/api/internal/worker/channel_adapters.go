package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type channelAccountRuntime struct {
	ConnectionMode string
	AuthSnapshot   map[string]any
}

func (p *Processor) executeChannelSync(ctx context.Context, channel, syncType, runID string, requestedPayload map[string]any) (map[string]any, error) {
	account, err := p.loadConnectedChannelAccount(ctx, channel)
	if err != nil {
		return nil, err
	}
	request := map[string]any{
		"channel":           channel,
		"sync_type":         syncType,
		"sync_run_id":       runID,
		"requested_payload": requestedPayload,
		"requested_at":      time.Now().UTC().Format(time.RFC3339),
	}
	if syncType == "catalog" {
		mirrorPayload, err := p.buildChannelCatalogMirrorPayload(ctx, channel, requestedPayload, account.AuthSnapshot)
		if err != nil {
			return nil, err
		}
		request["catalog"] = mirrorPayload
	}
	return p.dispatchChannelRequest(ctx, channel, account, syncType, request)
}

func (p *Processor) publishTrendLaunch(ctx context.Context, channel, launchID, candidateID string, spendCapDaily float64) (map[string]any, string, error) {
	account, err := p.loadConnectedChannelAccount(ctx, channel)
	if err != nil {
		return nil, "", err
	}
	request := map[string]any{
		"channel":            channel,
		"sync_type":          "campaign_publish",
		"trend_launch_id":    launchID,
		"trend_candidate_id": candidateID,
		"spend_cap_daily":    spendCapDaily,
		"requested_at":       time.Now().UTC().Format(time.RFC3339),
	}
	response, err := p.dispatchChannelRequest(ctx, channel, account, "campaign_publish", request)
	if err != nil {
		return nil, "", err
	}
	externalID := extractExternalCampaignID(response)
	return response, externalID, nil
}

func (p *Processor) dispatchChannelRequest(ctx context.Context, channel string, account *channelAccountRuntime, syncType string, request map[string]any) (map[string]any, error) {
	if channel == "tiktok" && syncType == "catalog" && p.shouldUseTikTokBrowserRuntime(channel, account.AuthSnapshot) {
		browserPayload := map[string]any{
			"browser_session_ref": asString(account.AuthSnapshot["browser_session_ref"]),
			"target_url": firstNonEmptyWorker(
				asString(asMap(request["requested_payload"])["target_url"]),
				asString(account.AuthSnapshot["browser_catalog_target_url"]),
			),
			"candidate_urls": firstNonEmptySlice(
				workerStringSlice(asMap(request["requested_payload"])["candidate_urls"]),
				workerStringSlice(account.AuthSnapshot["browser_catalog_candidate_urls"]),
			),
			"browser_recipe": firstNonEmptyMap(
				asMap(asMap(request["requested_payload"])["browser_recipe"]),
				asMap(account.AuthSnapshot["catalog_browser_recipe"]),
			),
			"request_payload": asMap(request["requested_payload"]),
			"merchant_id":     firstNonEmptyWorker(asString(account.AuthSnapshot["merchant_id"]), asString(account.AuthSnapshot["seller_id"])),
			"shop_id":         firstNonEmptyWorker(asString(account.AuthSnapshot["shop_id"]), asString(account.AuthSnapshot["shop_cipher"])),
			"catalog":         asMap(request["catalog"]),
		}
		response, err := p.dispatchTikTokBrowserAction(ctx, "/api/automation/tiktok-shop/catalog-sync", browserPayload)
		if err == nil {
			return map[string]any{
				"connection_mode": account.ConnectionMode,
				"provider_result": response,
				"processed_at":    time.Now().UTC().Format(time.RFC3339),
				"dispatch_mode":   "browser_runner",
			}, nil
		}
	}

	endpoint := resolveChannelEndpoint(channel, syncType, account.AuthSnapshot)
	if endpoint == "" {
		return nil, fmt.Errorf("%w: channel_endpoint_missing", ErrPermanent)
	}
	token := extractChannelAccessToken(account.AuthSnapshot)

	body, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*512))
	response := map[string]any{}
	_ = json.Unmarshal(raw, &response)
	if len(response) == 0 && strings.TrimSpace(string(raw)) != "" {
		response["raw_body"] = string(raw)
	}
	response["status_code"] = resp.StatusCode

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != 429 {
			return nil, fmt.Errorf("%w: channel_api_non_2xx:%d", ErrPermanent, resp.StatusCode)
		}
		return nil, fmt.Errorf("channel_api_non_2xx:%d", resp.StatusCode)
	}

	return map[string]any{
		"connection_mode": account.ConnectionMode,
		"provider_result": response,
		"processed_at":    time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func firstNonEmptySlice(values ...[]string) []string {
	for _, value := range values {
		if len(value) > 0 {
			return value
		}
	}
	return []string{}
}
