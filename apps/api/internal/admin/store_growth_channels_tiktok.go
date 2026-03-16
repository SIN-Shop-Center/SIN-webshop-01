package admin

import (
	"crypto/sha256"
	"encoding/base64"
	"net/url"
	"os"
	"strings"
)

const tiktokShopMerchantAuthGuideURL = "https://developers.tiktok.com/doc/obtain-access-token-for-apis"
const tiktokShopProductContentGuideURL = "https://developers.tiktok.com/doc/prepare-product-content"

func channelConnectMode(channel string) string {
	if channel == "tiktok" {
		return "browser_oauth"
	}
	return "oauth"
}

func enrichChannelConnectPayload(channel string, payload map[string]any) map[string]any {
	if channel != "tiktok" {
		payload["connection_mode"] = channelConnectMode(channel)
		return payload
	}

	payload["provider"] = "tiktok_shop"
	payload["connection_mode"] = channelConnectMode(channel)
	payload["auth_method"] = "sin_a2a_broker_oauth"
	payload["provider_mode"] = "sin_a2a_tiktok_shop"
	payload["oauth_guide_url"] = defaultTikTokGuideURL
	payload["merchant_auth_guide_url"] = defaultTikTokShopGuideURL
	payload["product_content_guide_url"] = tiktokShopProductContentGuideURL
	payload["creator_guide_url"] = defaultTikTokGuideURL
	payload["shop_guide_url"] = defaultTikTokShopGuideURL
	payload["shop_team_guide_url"] = defaultTikTokShopTeamGuideURL
	payload["shop_reference_tab_url"] = defaultTikTokShopReferenceTabURL
	payload["required_steps"] = []string{
		"SIN-TikTok fuer Creator-Identitaet und Posting-Berechtigungen pruefen oder verbinden",
		"SIN-TikTok-Shop fuer Seller-/Partner-Center-Kontext und Shop-Metadaten verwenden",
		"Danach Katalogspiegelung und Content-Pipeline auf Basis der A2A-Agenten freigeben",
	}

	if connectURL := buildTikTokShopConnectURL(asString(payload["state_token"]), asString(payload["redirect_url"])); connectURL != "" {
		payload["connect_url"] = connectURL
		payload["connect_ready"] = true
	} else {
		payload["connect_ready"] = false
		payload["connect_issue"] = "tiktok_shop_connect_config_incomplete"
	}

	return payload
}

func buildTikTokShopConnectURL(stateToken, redirectPath string) string {
	explicit := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CONNECT_URL"))
	if explicit != "" {
		if strings.Contains(explicit, "{STATE_TOKEN}") {
			return strings.ReplaceAll(explicit, "{STATE_TOKEN}", url.QueryEscape(stateToken))
		}
		parsed, err := url.Parse(explicit)
		if err != nil {
			return explicit
		}
		query := parsed.Query()
		if stateToken != "" && query.Get("state") == "" {
			query.Set("state", stateToken)
		}
		parsed.RawQuery = query.Encode()
		return parsed.String()
	}

	clientKey := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CLIENT_KEY"))
	redirectURI := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_REDIRECT_URI"))
	if clientKey == "" || redirectURI == "" {
		return ""
	}
	codeChallenge := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CODE_CHALLENGE"))
	if codeChallenge == "" {
		codeChallenge = computeTikTokCodeChallenge(strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CODE_VERIFIER")))
	}
	if codeChallenge == "" {
		return ""
	}
	scopes := normalizeTikTokShopConnectScopes(os.Getenv("TIKTOK_SHOP_CONNECT_SCOPES"))
	if scopes == "" {
		return ""
	}
	parsed, _ := url.Parse("https://www.tiktok.com/v2/auth/authorize/")
	query := parsed.Query()
	query.Set("client_key", clientKey)
	query.Set("response_type", "code")
	query.Set("scope", scopes)
	query.Set("redirect_uri", redirectURI)
	query.Set("state", stateToken)
	query.Set("code_challenge", codeChallenge)
	query.Set("code_challenge_method", "S256")
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func normalizeTikTokShopConnectScopes(value string) string {
	fields := strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == '\n' || r == '\r' || r == '\t' || r == ' '
	})
	if len(fields) == 0 {
		return ""
	}
	out := make([]string, 0, len(fields))
	seen := map[string]struct{}{}
	for _, field := range fields {
		scope := strings.TrimSpace(field)
		if scope == "" {
			continue
		}
		if _, exists := seen[scope]; exists {
			continue
		}
		seen[scope] = struct{}{}
		out = append(out, scope)
	}
	return strings.Join(out, ",")
}

func computeTikTokCodeChallenge(codeVerifier string) string {
	codeVerifier = strings.TrimSpace(codeVerifier)
	if codeVerifier == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(codeVerifier))
	return strings.TrimRight(base64.RawURLEncoding.EncodeToString(sum[:]), "=")
}
