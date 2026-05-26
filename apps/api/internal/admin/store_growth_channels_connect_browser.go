package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *Store) RequestChannelConnectBrowserMetadata(ctx context.Context, channel, stateToken string, options map[string]any, actorID string) (map[string]any, error) {
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 {
		return nil, errInvalidInput
	}
	channel = normalized[0]
	if channel != "tiktok" || strings.TrimSpace(stateToken) == "" {
		return nil, errInvalidInput
	}

	session, err := s.loadChannelConnectSession(ctx, channel, stateToken)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errBlocked
	}
	if err != nil {
		return nil, err
	}
	if session.ExpiresAt.Before(time.Now().UTC()) {
		return nil, errBlocked
	}

	payload := map[string]any{
		"channel":             channel,
		"state_token":         stateToken,
		"requested_at":        time.Now().UTC().Format(time.RFC3339),
		"requested_by":        actorID,
		"source":              defaultString(options["source"], "admin_connect_browser_metadata"),
		"browser_session_ref": asString(options["browser_session_ref"]),
		"target_url":          asString(options["target_url"]),
		"candidate_urls":      normalizeStringSliceAny(options["candidate_urls"]),
		"callback_path":       "/api/admin/channels/tiktok/connect/browser-metadata/callback",
	}
	if browserRecipe := asMap(options["browser_recipe"]); len(browserRecipe) > 0 {
		payload["browser_recipe"] = browserRecipe
	}
	if requestPayload := asMap(options["request_payload"]); len(requestPayload) > 0 {
		payload["request_payload"] = requestPayload
	}

	if err := s.mergeChannelConnectSessionPayload(ctx, session.ID, map[string]any{
		"tiktok_browser_request": payload,
	}); err != nil {
		return nil, err
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	_, err = s.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('channel.connect.browser_metadata.requested', 'channel', $1, $2::jsonb, 'pending')
`, stateToken, string(body))
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"channel":             channel,
		"state_token":         stateToken,
		"status":              "queued",
		"requested_at":        payload["requested_at"],
		"browser_session_ref": payload["browser_session_ref"],
		"target_url":          payload["target_url"],
		"candidate_urls":      payload["candidate_urls"],
	}, nil
}

func (s *Store) HandleTikTokConnectBrowserMetadataCallback(ctx context.Context, body map[string]any) (map[string]any, error) {
	stateToken := strings.TrimSpace(asString(body["state_token"]))
	if stateToken == "" {
		return nil, errInvalidInput
	}
	session, err := s.loadChannelConnectSession(ctx, "tiktok", stateToken)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errBlocked
	}
	if err != nil {
		return nil, err
	}

	callbackPayload := map[string]any{}
	for key, value := range session.CallbackPayload {
		callbackPayload[key] = value
	}
	currentContext := normalizeTikTokCallbackContext(asMap(callbackPayload["tiktok_connect_context"]))
	incomingContext := normalizeTikTokCallbackContext(map[string]any{
		"merchant_id":         firstNonEmpty(asString(body["merchant_id"]), asString(body["seller_id"])),
		"seller_id":           firstNonEmpty(asString(body["seller_id"]), asString(body["merchant_id"])),
		"shop_id":             asString(body["shop_id"]),
		"shop_cipher":         firstNonEmpty(asString(body["shop_cipher"]), asString(body["third_shop_id"])),
		"third_shop_id":       firstNonEmpty(asString(body["third_shop_id"]), asString(body["shop_cipher"])),
		"shop_name":           asString(body["shop_name"]),
		"shop_region":         firstNonEmpty(asString(body["shop_region"]), asString(body["region"])),
		"account_external_id": asString(body["account_external_id"]),
		"browser_session_ref": asString(body["browser_session_ref"]),
		"source_url":          firstNonEmpty(asString(body["source_url"]), asString(body["current_url"]), asString(body["target_url"])),
	})
	for key, value := range incomingContext {
		if strings.TrimSpace(asString(currentContext[key])) == "" {
			currentContext[key] = value
		}
	}

	patch := map[string]any{
		"tiktok_connect_context": currentContext,
	}

	if items := extractTikTokShopOptions(firstNonNil(body["available_shops"], body["shops"], body["items"], body["shop_list"])); len(items) > 0 {
		lookup := map[string]any{
			"status":               "ready",
			"available_shops":      items,
			"available_shop_count": len(items),
			"merchant_id":          firstNonEmpty(asString(currentContext["merchant_id"]), asString(currentContext["seller_id"])),
		}
		if primary := items[0]; len(primary) > 0 {
			mergeTikTokValueIfEmpty(lookup, "shop_id", primary["shop_id"])
			mergeTikTokValueIfEmpty(lookup, "shop_cipher", primary["shop_cipher"], primary["third_shop_id"])
			mergeTikTokValueIfEmpty(lookup, "third_shop_id", primary["third_shop_id"], primary["shop_cipher"])
			mergeTikTokValueIfEmpty(lookup, "shop_name", primary["shop_name"])
			mergeTikTokValueIfEmpty(lookup, "shop_region", primary["shop_region"])
		}
		patch["tiktok_shop_lookup"] = lookup
	}

	if err := s.mergeChannelConnectSessionPayload(ctx, session.ID, patch); err != nil {
		return nil, err
	}

	session.CallbackPayload = callbackPayload
	for key, value := range patch {
		session.CallbackPayload[key] = value
	}
	if hydratedPayload, hydrateErr := s.hydrateTikTokConnectSessionPayload(ctx, session); hydrateErr == nil {
		session.CallbackPayload = hydratedPayload
	}

	prefill := mergeTikTokSessionAuthSnapshot(map[string]any{}, session.CallbackPayload)
	return map[string]any{
		"status":          "accepted",
		"channel":         "tiktok",
		"state_token":     stateToken,
		"merchant_id":     firstNonEmpty(asString(prefill["merchant_id"]), asString(prefill["seller_id"])),
		"shop_id":         firstNonEmpty(asString(prefill["shop_id"]), asString(prefill["shop_cipher"])),
		"shop_name":       asString(prefill["shop_name"]),
		"shop_region":     asString(prefill["shop_region"]),
		"available_shops": asItemsFromAny(prefill["available_shops"]),
	}, nil
}

func normalizeStringSliceAny(value any) []string {
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
		for _, raw := range typed {
			if item := strings.TrimSpace(asString(raw)); item != "" {
				out = append(out, item)
			}
		}
		return out
	default:
		if item := strings.TrimSpace(asString(value)); item != "" {
			return []string{item}
		}
		return []string{}
	}
}

func firstNonNil(values ...any) any {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}
