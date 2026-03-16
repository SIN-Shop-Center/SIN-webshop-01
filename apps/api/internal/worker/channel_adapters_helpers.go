package worker

import "strings"

func resolveChannelEndpoint(channel, syncType string, auth map[string]any) string {
	if channel == "tiktok" {
		if syncType == "catalog" {
			if endpoint := strings.TrimSpace(asString(auth["product_save_endpoint"])); endpoint != "" {
				return endpoint
			}
		}
		if syncType == "campaign_publish" {
			if endpoint := strings.TrimSpace(asString(auth["content_post_endpoint"])); endpoint != "" {
				return endpoint
			}
		}
	}
	byType := map[string]string{
		"catalog":          asString(auth["catalog_sync_endpoint"]),
		"campaign_publish": asString(auth["campaign_publish_endpoint"]),
	}
	if endpoint := strings.TrimSpace(byType[syncType]); endpoint != "" {
		return endpoint
	}
	base := strings.TrimSuffix(strings.TrimSpace(asString(auth["api_base_url"])), "/")
	if base == "" {
		base = strings.TrimSuffix(strings.TrimSpace(asString(auth["base_url"])), "/")
	}
	if base == "" {
		return ""
	}
	if syncType == "campaign_publish" {
		return base + "/campaigns/publish"
	}
	return base + "/catalog/sync"
}

func extractChannelAccessToken(auth map[string]any) string {
	candidates := []string{
		asString(auth["access_token"]),
		asString(auth["api_token"]),
		asString(auth["api_key"]),
	}
	for _, token := range candidates {
		if strings.TrimSpace(token) != "" {
			return strings.TrimSpace(token)
		}
	}
	return ""
}

func extractExternalCampaignID(payload map[string]any) string {
	provider := asMap(payload["provider_result"])
	candidates := []string{
		asString(payload["external_campaign_id"]),
		asString(provider["campaign_id"]),
		asString(provider["external_campaign_id"]),
		asString(provider["id"]),
	}
	for _, value := range candidates {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
