package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCompleteChannelAuthSnapshotHydratesTikTokShopFromSessionLookup(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer oauth-token" {
			t.Fatalf("expected bearer token, got %q", got)
		}

		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		if body["merchant_id"] != "merchant-1" {
			t.Fatalf("expected merchant_id in request, got %#v", body["merchant_id"])
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"code": "0",
			"data": map[string]any{
				"shops": []map[string]any{
					{
						"shop_base_info": map[string]any{
							"merchant_id":   "merchant-1",
							"shop_id":       "shop-1",
							"third_shop_id": "cipher-1",
							"shop_name":     "Demo Shop",
							"region":        "DE",
						},
					},
				},
			},
		})
	}))
	defer server.Close()

	t.Setenv("TIKTOK_SHOP_PRODUCT_OPT_SHOPS_URL", server.URL)
	t.Setenv("TIKTOK_SHOP_CLIENT_KEY", "")
	t.Setenv("TIKTOK_SHOP_CLIENT_SECRET", "")

	store := &Store{}
	out, err := store.completeChannelAuthSnapshot(context.Background(), "tiktok", map[string]any{
		"product_save_endpoint": "https://api.example.com/products/save",
	}, map[string]any{
		"tiktok_oauth": map[string]any{
			"access_token":  "oauth-token",
			"refresh_token": "refresh-token",
		},
		"tiktok_connect_context": map[string]any{
			"merchant_id": "merchant-1",
		},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if out["oauth_access_token"] != "oauth-token" {
		t.Fatalf("expected oauth access token hydration, got %#v", out["oauth_access_token"])
	}
	if out["merchant_id"] != "merchant-1" {
		t.Fatalf("expected merchant_id hydration, got %#v", out["merchant_id"])
	}
	if out["shop_id"] != "shop-1" {
		t.Fatalf("expected shop_id hydration, got %#v", out["shop_id"])
	}
	if out["shop_cipher"] != "cipher-1" {
		t.Fatalf("expected shop cipher hydration, got %#v", out["shop_cipher"])
	}
	if out["shop_name"] != "Demo Shop" {
		t.Fatalf("expected shop name hydration, got %#v", out["shop_name"])
	}
	if out["shop_region"] != "DE" {
		t.Fatalf("expected shop region hydration, got %#v", out["shop_region"])
	}

	availableShops := asItemsFromAny(out["available_shops"])
	if len(availableShops) != 1 {
		t.Fatalf("expected one available shop, got %#v", out["available_shops"])
	}
}

func TestRefreshTikTokChannelMetadataHydratesHealthSnapshot(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"code": "0",
			"data": map[string]any{
				"shops": []map[string]any{
					{
						"shop_base_info": map[string]any{
							"merchant_id":   "merchant-7",
							"shop_id":       "shop-7",
							"third_shop_id": "cipher-7",
							"shop_name":     "TikTok Berlin",
							"region":        "DE",
						},
					},
				},
			},
		})
	}))
	defer server.Close()

	t.Setenv("TIKTOK_SHOP_PRODUCT_OPT_SHOPS_URL", server.URL)

	auth, health, accountExternalID, err := refreshTikTokChannelMetadata(context.Background(), map[string]any{
		"oauth_access_token": "oauth-token",
		"merchant_id":        "merchant-7",
	}, map[string]any{
		"status": "healthy",
	}, "")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if accountExternalID != "shop-7" {
		t.Fatalf("expected account external id fallback, got %q", accountExternalID)
	}
	if auth["shop_name"] != "TikTok Berlin" {
		t.Fatalf("expected shop name in auth snapshot, got %#v", auth["shop_name"])
	}
	if health["shop_name"] != "TikTok Berlin" {
		t.Fatalf("expected shop name in health snapshot, got %#v", health["shop_name"])
	}
	if health["available_shop_count"] != 1 {
		t.Fatalf("expected available shop count 1, got %#v", health["available_shop_count"])
	}
	if asText := asString(health["shop_region"]); asText != "DE" {
		t.Fatalf("expected shop region DE, got %q", asText)
	}
}
