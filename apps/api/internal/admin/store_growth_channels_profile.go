package admin

import (
	"fmt"
	"net/url"
	"strings"
)

type channelConnectProfile struct {
	RequiredAuthFields []string
	OptionalAuthFields []string
}

func channelProfile(channel string) channelConnectProfile {
	base := channelConnectProfile{
		RequiredAuthFields: []string{
			"access_token_or_api_key",
			"catalog_sync_endpoint_or_api_base_url",
			"campaign_publish_endpoint_or_api_base_url",
		},
		OptionalAuthFields: []string{
			"account_name",
			"api_base_url",
			"catalog_sync_endpoint",
			"campaign_publish_endpoint",
			"access_token",
			"api_token",
			"api_key",
		},
	}
	switch channel {
	case "tiktok":
		base.RequiredAuthFields = []string{
			"official_browser_oauth_access_token",
			"merchant_id_or_seller_id",
			"shop_id_or_shop_cipher",
		}
		base.OptionalAuthFields = append(base.OptionalAuthFields,
			"auth_method",
			"provider_mode",
			"merchant_id",
			"seller_id",
			"shop_id",
			"shop_cipher",
			"shop_region",
			"catalog_id",
			"ad_account_id",
			"refresh_token",
			"refresh_token_expires_at",
			"access_token_expires_at",
			"product_save_endpoint",
			"product_sync_mode",
			"browser_session_ref",
			"seller_center_region",
			"catalog_browser_recipe",
			"community_reply_browser_recipe",
			"browser_catalog_target_url",
			"browser_reply_target_url",
		)
	case "meta":
		base.OptionalAuthFields = append(base.OptionalAuthFields, "business_id", "catalog_id", "ad_account_id", "pixel_id")
	case "youtube_google":
		base.OptionalAuthFields = append(base.OptionalAuthFields, "merchant_id", "customer_id", "conversion_action")
	case "pinterest":
		base.OptionalAuthFields = append(base.OptionalAuthFields, "ad_account_id", "catalog_id", "tag_id")
	case "snapchat":
		base.OptionalAuthFields = append(base.OptionalAuthFields, "ad_account_id", "pixel_id")
	}
	return base
}

func normalizeChannelAuthSnapshot(channel string, input map[string]any) (map[string]any, error) {
	if input == nil {
		input = map[string]any{}
	}
	out := map[string]any{}
	for key, value := range input {
		trimmed := strings.TrimSpace(strings.ToLower(key))
		if trimmed == "" {
			continue
		}
		out[trimmed] = value
	}
	accountName := asString(out["account_name"])
	if accountName == "" {
		if channel == "tiktok" {
			accountName = "tiktok-shop"
		} else {
			accountName = "default"
		}
	}
	out["account_name"] = accountName

	token := firstNonEmpty(
		asString(out["access_token"]),
		asString(out["merchant_access_token"]),
		asString(out["api_token"]),
		asString(out["api_key"]),
	)
	if token == "" {
		return nil, fmt.Errorf("%w: missing_channel_access_token", errInvalidInput)
	}
	if asString(out["access_token"]) == "" {
		out["access_token"] = token
	}

	apiBaseURL := normalizeURL(asString(out["api_base_url"]))
	catalogEndpoint := normalizeURL(asString(out["catalog_sync_endpoint"]))
	campaignEndpoint := normalizeURL(asString(out["campaign_publish_endpoint"]))

	if channel == "tiktok" {
		merchantID := firstNonEmpty(asString(out["merchant_id"]), asString(out["seller_id"]))
		shopID := firstNonEmpty(asString(out["shop_id"]), asString(out["shop_cipher"]))
		if merchantID == "" {
			return nil, fmt.Errorf("%w: missing_channel_merchant", errInvalidInput)
		}
		if shopID == "" {
			return nil, fmt.Errorf("%w: missing_channel_shop", errInvalidInput)
		}
		out["merchant_id"] = merchantID
		if asString(out["seller_id"]) == "" {
			out["seller_id"] = merchantID
		}
		out["shop_id"] = shopID
		out["auth_method"] = defaultString(out["auth_method"], "official_browser_oauth")
		out["provider_mode"] = defaultString(out["provider_mode"], "tiktok_shop_browser")
		if apiBaseURL != "" {
			out["api_base_url"] = apiBaseURL
		}
		if catalogEndpoint != "" && !isValidHTTPSURL(catalogEndpoint) {
			return nil, fmt.Errorf("%w: invalid_channel_endpoint", errInvalidInput)
		}
		if campaignEndpoint != "" && !isValidHTTPSURL(campaignEndpoint) {
			return nil, fmt.Errorf("%w: invalid_channel_endpoint", errInvalidInput)
		}
		if catalogEndpoint != "" {
			out["catalog_sync_endpoint"] = catalogEndpoint
		}
		if campaignEndpoint != "" {
			out["campaign_publish_endpoint"] = campaignEndpoint
		}
		out["channel"] = channel
		return out, nil
	}

	if apiBaseURL == "" && (catalogEndpoint == "" || campaignEndpoint == "") {
		return nil, fmt.Errorf("%w: missing_channel_endpoints", errInvalidInput)
	}
	if apiBaseURL != "" {
		out["api_base_url"] = apiBaseURL
	}
	if catalogEndpoint == "" && apiBaseURL != "" {
		catalogEndpoint = strings.TrimRight(apiBaseURL, "/") + "/catalog/sync"
	}
	if campaignEndpoint == "" && apiBaseURL != "" {
		campaignEndpoint = strings.TrimRight(apiBaseURL, "/") + "/campaigns/publish"
	}
	if !isValidHTTPSURL(catalogEndpoint) || !isValidHTTPSURL(campaignEndpoint) {
		return nil, fmt.Errorf("%w: invalid_channel_endpoint", errInvalidInput)
	}
	out["catalog_sync_endpoint"] = catalogEndpoint
	out["campaign_publish_endpoint"] = campaignEndpoint
	out["channel"] = channel
	return out, nil
}

func normalizeChannelHealthSnapshot(input map[string]any) map[string]any {
	if input == nil {
		input = map[string]any{}
	}
	out := map[string]any{}
	for key, value := range input {
		trimmed := strings.TrimSpace(strings.ToLower(key))
		if trimmed == "" {
			continue
		}
		out[trimmed] = value
	}
	if asString(out["status"]) == "" {
		out["status"] = "healthy"
	}
	return out
}

func normalizeURL(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	return strings.TrimRight(value, "/")
}

func isValidHTTPSURL(raw string) bool {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	return parsed.Scheme == "https" && parsed.Host != ""
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
