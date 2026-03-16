package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	defaultSinSolverRoot             = "/Users/jeremy/dev/SIN-Solver"
	defaultTikTokGuideURL            = "https://sin-solver.delqhi.com/agents/sin-tiktok"
	defaultTikTokShopGuideURL        = "https://sin-solver.delqhi.com/agents/sin-tiktok-shop"
	defaultTikTokShopTeamGuideURL    = "https://a2a.delqhi.com/silicon-workforce"
	defaultTikTokShopReferenceTabURL = "https://docs.google.com/document/d/1RtoHn4I0GntuEEOHHkqoh_dMuGzgMwQz7_8oxAOpQbw/edit?tab=t.jlwvzsgk9njg"
)

func resolveSinSolverRoot() string {
	for _, candidate := range []string{
		strings.TrimSpace(os.Getenv("SIN_SOLVER_ROOT")),
		strings.TrimSpace(os.Getenv("SIMONE_SIN_SOLVER_ROOT")),
		defaultSinSolverRoot,
	} {
		if candidate == "" {
			continue
		}
		return candidate
	}
	return defaultSinSolverRoot
}

func runSinA2AAction(ctx context.Context, binaryName string, payload map[string]any) (map[string]any, error) {
	actionBody, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	actionCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	command := exec.CommandContext(actionCtx, filepath.Join(resolveSinSolverRoot(), "bin", binaryName), "run-action", string(actionBody))
	command.Env = os.Environ()
	raw, err := command.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("%s_failed:%s", binaryName, truncateSinA2AOutput(raw))
	}

	out := map[string]any{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("%s_invalid_json:%s", binaryName, truncateSinA2AOutput(raw))
	}
	return out, nil
}

func truncateSinA2AOutput(raw []byte) string {
	text := strings.TrimSpace(string(raw))
	if text == "" {
		return "command_failed"
	}
	if len(text) > 240 {
		return text[:240]
	}
	return text
}

func collectTikTokA2AState(ctx context.Context) map[string]any {
	out := map[string]any{
		"creator_guide_url":      defaultTikTokGuideURL,
		"shop_guide_url":         defaultTikTokShopGuideURL,
		"shop_team_guide_url":    defaultTikTokShopTeamGuideURL,
		"shop_reference_tab_url": defaultTikTokShopReferenceTabURL,
	}
	if shouldSkipSinA2AExternalCalls() {
		out["skipped"] = true
		out["skip_reason"] = "unit_test_runtime"
		return out
	}

	if creatorConnect, err := runSinA2AAction(ctx, "sin-tiktok", map[string]any{"action": "sin.tiktok.connect.status"}); err == nil {
		out["creator"] = creatorConnect
	} else {
		out["creator_error"] = err.Error()
	}
	if creatorSession, err := runSinA2AAction(ctx, "sin-tiktok", map[string]any{"action": "sin.tiktok.session.status"}); err == nil {
		out["creator_session"] = creatorSession
	} else {
		out["creator_session_error"] = err.Error()
	}
	if creatorInfo, err := runSinA2AAction(ctx, "sin-tiktok", map[string]any{"action": "sin.tiktok.creator_info.query"}); err == nil {
		out["creator_info"] = creatorInfo
	} else {
		out["creator_info_error"] = err.Error()
	}

	if shopConnect, err := runSinA2AAction(ctx, "sin-tiktok-shop", map[string]any{"action": "sin.tiktok_shop.connect.status"}); err == nil {
		out["shop"] = shopConnect
	} else {
		out["shop_error"] = err.Error()
	}
	if shopSession, err := runSinA2AAction(ctx, "sin-tiktok-shop", map[string]any{"action": "sin.tiktok_shop.session.status"}); err == nil {
		out["shop_session"] = shopSession
	} else {
		out["shop_session_error"] = err.Error()
	}
	if shopOnboarding, err := runSinA2AAction(ctx, "sin-tiktok-shop", map[string]any{"action": "sin.tiktok_shop.onboarding.status"}); err == nil {
		out["shop_onboarding"] = shopOnboarding
	} else {
		out["shop_onboarding_error"] = err.Error()
	}
	if shopsQuery, err := runSinA2AAction(ctx, "sin-tiktok-shop", map[string]any{"action": "sin.tiktok_shop.shops.query"}); err == nil {
		out["shop_query"] = shopsQuery
	} else {
		out["shop_query_error"] = err.Error()
	}

	return out
}

func shouldSkipSinA2AExternalCalls() bool {
	if strings.TrimSpace(os.Getenv("SIMONE_ENABLE_SIN_A2A_BRIDGE")) == "0" {
		return true
	}
	return strings.HasSuffix(os.Args[0], ".test")
}

func enrichTikTokSnapshotsWithA2A(ctx context.Context, auth, health map[string]any) (map[string]any, map[string]any) {
	state := collectTikTokA2AState(ctx)
	auth["sin_a2a"] = state
	health["sin_a2a"] = state

	creator := asMap(state["creator"])
	creatorInfo := asMap(state["creator_info"])
	creatorSession := asMap(state["creator_session"])
	shop := asMap(state["shop"])
	shopSession := asMap(state["shop_session"])
	shopOnboarding := asMap(state["shop_onboarding"])
	shopQuery := asMap(state["shop_query"])
	shopOnboardingState := asMap(shopOnboarding["state"])

	auth["creator_guide_url"] = defaultTikTokGuideURL
	auth["shop_guide_url"] = defaultTikTokShopGuideURL
	auth["shop_team_guide_url"] = defaultTikTokShopTeamGuideURL

	if username := firstNonEmpty(asString(creatorInfo["creator_username"]), asString(creatorInfo["username"])); username != "" {
		auth["creator_username"] = username
		health["creator_username"] = username
	}
	if nickname := firstNonEmpty(asString(creatorInfo["creator_nickname"]), asString(creatorInfo["display_name"])); nickname != "" {
		auth["creator_nickname"] = nickname
		health["creator_nickname"] = nickname
	}
	if handle := firstNonEmpty(asString(creatorInfo["creator_username"]), asString(shopOnboardingState["handle"]), asString(asMap(creatorSession["state"])["handle"])); handle != "" {
		auth["creator_handle"] = handle
		health["creator_handle"] = handle
	}

	if shopName := firstNonEmpty(asString(shopOnboardingState["shopName"]), asString(auth["shop_name"])); shopName != "" {
		auth["shop_name"] = shopName
		health["shop_name"] = shopName
	}
	if shopCode := firstNonEmpty(asString(shopOnboardingState["shopCode"]), asString(auth["shop_code"])); shopCode != "" {
		auth["shop_code"] = shopCode
		health["shop_code"] = shopCode
	}
	if market := firstNonEmpty(asString(shopOnboardingState["market"]), asString(auth["shop_region"]), asString(health["shop_region"])); market != "" {
		auth["shop_region"] = market
		health["shop_region"] = market
	}
	if businessType := asString(shopOnboardingState["businessType"]); businessType != "" {
		auth["business_type"] = businessType
		health["business_type"] = businessType
	}
	if sellerType := asString(shopOnboardingState["sellerType"]); sellerType != "" {
		auth["seller_type"] = sellerType
		health["seller_type"] = sellerType
	}
	if logoReviewStatus := asString(shopOnboardingState["logoReviewStatus"]); logoReviewStatus != "" {
		auth["logo_review_status"] = logoReviewStatus
		health["logo_review_status"] = logoReviewStatus
	}

	if len(asItemsFromAny(shopQuery["shops"])) > 0 {
		shops := asItemsFromAny(shopQuery["shops"])
		auth["available_shops"] = shops
		health["available_shop_count"] = len(shops)
		primary := shops[0]
		if merchantID := firstNonEmpty(asString(primary["merchant_id"]), asString(auth["merchant_id"]), asString(auth["seller_id"])); merchantID != "" {
			auth["merchant_id"] = merchantID
			if asString(auth["seller_id"]) == "" {
				auth["seller_id"] = merchantID
			}
		}
		if shopID := firstNonEmpty(asString(primary["shop_id"]), asString(primary["shop_cipher"]), asString(auth["shop_id"]), asString(auth["shop_cipher"])); shopID != "" {
			auth["shop_id"] = shopID
		}
		if shopCipher := firstNonEmpty(asString(primary["shop_cipher"]), asString(primary["third_shop_id"]), asString(auth["shop_cipher"])); shopCipher != "" {
			auth["shop_cipher"] = shopCipher
		}
		if shopName := firstNonEmpty(asString(primary["shop_name"]), asString(auth["shop_name"])); shopName != "" {
			auth["shop_name"] = shopName
			health["shop_name"] = shopName
		}
		if shopRegion := firstNonEmpty(asString(primary["shop_region"]), asString(auth["shop_region"])); shopRegion != "" {
			auth["shop_region"] = shopRegion
			health["shop_region"] = shopRegion
		}
		auth["metadata_refresh_source"] = "sin_tiktok_shop_a2a"
		auth["metadata_refreshed_at"] = time.Now().UTC().Format(time.RFC3339)
	}

	health["a2a_creator"] = creator
	health["a2a_creator_session"] = creatorSession
	health["a2a_shop"] = shop
	health["a2a_shop_session"] = shopSession
	health["a2a_shop_onboarding"] = shopOnboarding
	health["a2a_creator_ready"] = creator["ok"] == true && creator["connectReady"] == true
	health["a2a_shop_ready"] = shop["ok"] == true && shop["connectReady"] == true
	health["a2a_creator_issue"] = asString(creator["connectIssue"])
	health["a2a_shop_issue"] = asString(shop["connectIssue"])
	return auth, health
}
