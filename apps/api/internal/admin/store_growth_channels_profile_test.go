package admin

import "testing"

func TestNormalizeChannelAuthSnapshotAcceptsTikTokBrowserOAuthPayload(t *testing.T) {
	auth, err := normalizeChannelAuthSnapshot("tiktok", map[string]any{
		"access_token":          "secret",
		"merchant_id":           "merchant-1",
		"shop_id":               "shop-1",
		"product_save_endpoint": "https://api.example.com/products/save",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if auth["access_token"] != "secret" {
		t.Fatalf("expected access_token fallback, got %#v", auth["access_token"])
	}
	if auth["merchant_id"] != "merchant-1" || auth["shop_id"] != "shop-1" {
		t.Fatalf("unexpected tiktok identity payload: %#v", auth)
	}
}

func TestNormalizeChannelAuthSnapshotRejectsMissingToken(t *testing.T) {
	_, err := normalizeChannelAuthSnapshot("meta", map[string]any{
		"api_base_url": "https://api.example.com",
	})
	if err == nil {
		t.Fatalf("expected token validation error")
	}
}

func TestNormalizeChannelAuthSnapshotRejectsInvalidEndpoint(t *testing.T) {
	_, err := normalizeChannelAuthSnapshot("meta", map[string]any{
		"access_token":              "token",
		"catalog_sync_endpoint":     "http://insecure.example.com/catalog",
		"campaign_publish_endpoint": "https://api.example.com/campaigns",
	})
	if err == nil {
		t.Fatalf("expected invalid endpoint error")
	}
}

func TestNormalizeChannelAuthSnapshotRejectsMissingTikTokMerchant(t *testing.T) {
	_, err := normalizeChannelAuthSnapshot("tiktok", map[string]any{
		"access_token": "secret",
		"shop_id":      "shop-1",
	})
	if err == nil {
		t.Fatalf("expected merchant validation error")
	}
}

func TestChannelProfileHasRequiredFields(t *testing.T) {
	profile := channelProfile("youtube_google")
	if len(profile.RequiredAuthFields) == 0 {
		t.Fatalf("expected required fields for channel profile")
	}
}
