package admin

import (
	"net/url"
	"testing"
)

func TestBuildTikTokShopConnectURLRequiresExplicitScopes(t *testing.T) {
	t.Setenv("TIKTOK_SHOP_CLIENT_KEY", "client-key")
	t.Setenv("TIKTOK_SHOP_REDIRECT_URI", "https://example.com/callback")
	t.Setenv("TIKTOK_SHOP_CODE_VERIFIER", "abcdefghijklmnopqrstuvwxyz1234567890")
	t.Setenv("TIKTOK_SHOP_CODE_CHALLENGE", "")
	t.Setenv("TIKTOK_SHOP_CONNECT_SCOPES", "")
	t.Setenv("TIKTOK_SHOP_CONNECT_URL", "")

	if got := buildTikTokShopConnectURL("state-1", "/admin/channels"); got != "" {
		t.Fatalf("expected empty connect url without explicit scopes, got %q", got)
	}
}

func TestBuildTikTokShopConnectURLUsesConfiguredScopes(t *testing.T) {
	t.Setenv("TIKTOK_SHOP_CLIENT_KEY", "client-key")
	t.Setenv("TIKTOK_SHOP_REDIRECT_URI", "https://example.com/callback")
	t.Setenv("TIKTOK_SHOP_CODE_VERIFIER", "abcdefghijklmnopqrstuvwxyz1234567890")
	t.Setenv("TIKTOK_SHOP_CODE_CHALLENGE", "")
	t.Setenv("TIKTOK_SHOP_CONNECT_SCOPES", "seller.authorization, product.basic  seller.authorization")
	t.Setenv("TIKTOK_SHOP_CONNECT_URL", "")

	raw := buildTikTokShopConnectURL("state-2", "/admin/channels")
	if raw == "" {
		t.Fatal("expected connect url")
	}

	parsed, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("parse connect url: %v", err)
	}
	query := parsed.Query()
	if got := query.Get("scope"); got != "seller.authorization,product.basic" {
		t.Fatalf("expected normalized merchant scopes, got %q", got)
	}
	if got := query.Get("client_key"); got != "client-key" {
		t.Fatalf("expected client key, got %q", got)
	}
	if got := query.Get("state"); got != "state-2" {
		t.Fatalf("expected state token, got %q", got)
	}
	if got := query.Get("code_challenge_method"); got != "S256" {
		t.Fatalf("expected pkce challenge method, got %q", got)
	}
	if query.Get("code_challenge") == "" {
		t.Fatal("expected pkce challenge")
	}
}

func TestEnrichChannelConnectPayloadSignalsIncompleteTikTokConfig(t *testing.T) {
	t.Setenv("TIKTOK_SHOP_CLIENT_KEY", "")
	t.Setenv("TIKTOK_SHOP_REDIRECT_URI", "")
	t.Setenv("TIKTOK_SHOP_CODE_VERIFIER", "")
	t.Setenv("TIKTOK_SHOP_CODE_CHALLENGE", "")
	t.Setenv("TIKTOK_SHOP_CONNECT_SCOPES", "")
	t.Setenv("TIKTOK_SHOP_CONNECT_URL", "")

	payload := enrichChannelConnectPayload("tiktok", map[string]any{
		"state_token": "state-x",
	})

	if payload["connect_ready"] != false {
		t.Fatalf("expected connect_ready false, got %#v", payload["connect_ready"])
	}
	if payload["connect_issue"] != "tiktok_shop_connect_config_incomplete" {
		t.Fatalf("expected connect_issue marker, got %#v", payload["connect_issue"])
	}
	if payload["oauth_guide_url"] != defaultTikTokGuideURL {
		t.Fatalf("expected creator guide url override, got %#v", payload["oauth_guide_url"])
	}
	if payload["merchant_auth_guide_url"] != defaultTikTokShopGuideURL {
		t.Fatalf("expected shop guide url, got %#v", payload["merchant_auth_guide_url"])
	}
	if payload["provider_mode"] != "sin_a2a_tiktok_shop" {
		t.Fatalf("expected A2A provider mode, got %#v", payload["provider_mode"])
	}
}
