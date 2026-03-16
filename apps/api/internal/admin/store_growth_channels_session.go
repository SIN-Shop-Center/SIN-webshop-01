package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type channelConnectSessionRecord struct {
	ID              string
	Channel         string
	Status          string
	RedirectURL     string
	CallbackPayload map[string]any
	ExpiresAt       time.Time
	CompletedAt     *time.Time
}

type tiktokOAuthTokenResponse struct {
	AccessToken      string `json:"access_token"`
	ExpiresIn        int64  `json:"expires_in"`
	OpenID           string `json:"open_id"`
	RefreshExpiresIn int64  `json:"refresh_expires_in"`
	RefreshToken     string `json:"refresh_token"`
	Scope            string `json:"scope"`
	TokenType        string `json:"token_type"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

type tiktokMerchantTokenResponse struct {
	AccessToken      string `json:"access_token"`
	ExpiresIn        int64  `json:"expires_in"`
	RefreshExpiresIn int64  `json:"refresh_expires_in"`
	RefreshToken     string `json:"refresh_token"`
	Error            string `json:"error"`
	Message          string `json:"message"`
}

func (s *Store) GetChannelConnectSession(ctx context.Context, channel, stateToken string) (map[string]any, error) {
	session, err := s.loadChannelConnectSession(ctx, channel, stateToken)
	if err != nil {
		return nil, err
	}
	if session.Channel == "tiktok" {
		if hydratedPayload, hydrateErr := s.hydrateTikTokConnectSessionPayload(ctx, session); hydrateErr == nil {
			session.CallbackPayload = hydratedPayload
		}
	}
	out := map[string]any{
		"id":               session.ID,
		"channel":          session.Channel,
		"state_token":      stateToken,
		"status":           session.Status,
		"redirect_url":     session.RedirectURL,
		"callback_payload": session.CallbackPayload,
		"expires_at":       session.ExpiresAt.Format(time.RFC3339),
	}
	if session.CompletedAt != nil {
		out["completed_at"] = session.CompletedAt.Format(time.RFC3339)
	}
	return out, nil
}

func (s *Store) HandleTikTokConnectCallback(ctx context.Context, stateToken, code, scopes, callbackError, callbackErrorDescription string, callbackContext map[string]any) (string, error) {
	session, err := s.loadChannelConnectSession(ctx, "tiktok", stateToken)
	if errors.Is(err, pgx.ErrNoRows) {
		return buildTikTokConnectRedirect("/admin/channels?channel=tiktok", stateToken, "invalid_state"), nil
	}
	if err != nil {
		return "", err
	}

	oauthPayload := map[string]any{
		"state_token": stateToken,
		"received_at": time.Now().UTC().Format(time.RFC3339),
	}
	if scopes = strings.TrimSpace(scopes); scopes != "" {
		oauthPayload["scope"] = scopes
	}
	connectContext := normalizeTikTokCallbackContext(callbackContext)

	status := "received"
	if strings.TrimSpace(callbackError) != "" || strings.TrimSpace(code) == "" {
		status = "error"
		oauthPayload["status"] = status
		oauthPayload["error"] = firstNonEmpty(
			strings.TrimSpace(callbackError),
			"oauth_callback_failed",
		)
		oauthPayload["error_description"] = strings.TrimSpace(callbackErrorDescription)
		patch := map[string]any{"tiktok_oauth": oauthPayload}
		if len(connectContext) > 0 {
			patch["tiktok_connect_context"] = connectContext
		}
		if err := s.mergeChannelConnectSessionPayload(ctx, session.ID, patch); err != nil {
			return "", err
		}
		return buildTikTokConnectRedirect(session.RedirectURL, stateToken, status), nil
	}

	tokenBundle, err := exchangeTikTokOAuthCode(ctx, code)
	if err != nil {
		oauthPayload["status"] = "error"
		oauthPayload["error"] = "oauth_token_exchange_failed"
		oauthPayload["error_description"] = err.Error()
		if mergeErr := s.mergeChannelConnectSessionPayload(ctx, session.ID, map[string]any{"tiktok_oauth": oauthPayload}); mergeErr != nil {
			return "", mergeErr
		}
		return buildTikTokConnectRedirect(session.RedirectURL, stateToken, "error"), nil
	}

	oauthPayload["status"] = status
	oauthPayload["access_token"] = tokenBundle.AccessToken
	oauthPayload["refresh_token"] = tokenBundle.RefreshToken
	oauthPayload["open_id"] = tokenBundle.OpenID
	oauthPayload["scope"] = firstNonEmpty(tokenBundle.Scope, scopes)
	oauthPayload["token_type"] = tokenBundle.TokenType
	if tokenBundle.ExpiresIn > 0 {
		oauthPayload["expires_in"] = tokenBundle.ExpiresIn
		oauthPayload["access_token_expires_at"] = durationSecondsToRFC3339(tokenBundle.ExpiresIn)
	}
	if tokenBundle.RefreshExpiresIn > 0 {
		oauthPayload["refresh_expires_in"] = tokenBundle.RefreshExpiresIn
		oauthPayload["refresh_token_expires_at"] = durationSecondsToRFC3339(tokenBundle.RefreshExpiresIn)
	}

	patch := map[string]any{"tiktok_oauth": oauthPayload}
	if len(connectContext) > 0 {
		patch["tiktok_connect_context"] = connectContext
	}
	if err := s.mergeChannelConnectSessionPayload(ctx, session.ID, patch); err != nil {
		return "", err
	}
	return buildTikTokConnectRedirect(session.RedirectURL, stateToken, status), nil
}

func (s *Store) completeChannelAuthSnapshot(ctx context.Context, channel string, authSnapshot, sessionPayload map[string]any) (map[string]any, error) {
	if channel != "tiktok" {
		return authSnapshot, nil
	}
	out := mergeTikTokSessionAuthSnapshot(authSnapshot, sessionPayload)

	oauthAccessToken := firstNonEmpty(
		asString(out["oauth_access_token"]),
		asString(out["tiktok_oauth_access_token"]),
	)
	if oauthAccessToken == "" && strings.TrimSpace(asString(out["merchant_access_token"])) == "" {
		oauthAccessToken = asString(out["access_token"])
	}
	if oauthAccessToken != "" {
		out["oauth_access_token"] = oauthAccessToken
		out["tiktok_oauth_access_token"] = oauthAccessToken
	}

	merchantID := firstNonEmpty(asString(out["merchant_id"]), asString(out["seller_id"]))
	if merchantID != "" && oauthAccessToken != "" {
		if shops, err := queryTikTokProductOptShops(ctx, oauthAccessToken, merchantID); err == nil {
			out = mergeTikTokShopLookup(out, merchantID, shops)
		} else if len(asItemsFromAny(out["available_shops"])) == 0 {
			out["shop_lookup_error"] = truncateChannelProjectionError(err)
		}
	}

	if merchantAccessToken := strings.TrimSpace(asString(out["merchant_access_token"])); merchantAccessToken != "" {
		out["access_token"] = merchantAccessToken
		out["token_origin"] = defaultString(out["token_origin"], "merchant_oauth_manual")
		return out, nil
	}

	if merchantID != "" {
		tokenBundle, err := exchangeTikTokMerchantAccessToken(ctx, merchantID)
		if err == nil {
			out["merchant_id"] = merchantID
			if asString(out["seller_id"]) == "" {
				out["seller_id"] = merchantID
			}
			out["merchant_access_token"] = tokenBundle.AccessToken
			out["access_token"] = tokenBundle.AccessToken
			out["token_origin"] = "merchant_oauth"
			if tokenBundle.RefreshToken != "" {
				out["refresh_token"] = tokenBundle.RefreshToken
			}
			if tokenBundle.ExpiresIn > 0 {
				out["access_token_expires_at"] = unixToRFC3339(tokenBundle.ExpiresIn)
			}
			if tokenBundle.RefreshExpiresIn > 0 {
				out["refresh_token_expires_at"] = unixToRFC3339(tokenBundle.RefreshExpiresIn)
			}
			return out, nil
		}
		if oauthAccessToken == "" {
			return nil, errors.New("tiktok_merchant_token_exchange_failed: " + truncateChannelProjectionError(err))
		}
		out["merchant_token_exchange_error"] = truncateChannelProjectionError(err)
	}

	if oauthAccessToken != "" {
		out["access_token"] = oauthAccessToken
		out["token_origin"] = defaultString(out["token_origin"], "oauth_callback_or_manual")
	}
	return out, nil
}

func (s *Store) loadChannelConnectSession(ctx context.Context, channel, stateToken string) (*channelConnectSessionRecord, error) {
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 || strings.TrimSpace(stateToken) == "" {
		return nil, errInvalidInput
	}
	channel = normalized[0]
	var record channelConnectSessionRecord
	var callbackRaw string
	err := s.pool.QueryRow(ctx, `
select id::text,
       channel,
       status,
       coalesce(redirect_url, ''),
       callback_payload::text,
       expires_at,
       completed_at
from public.channel_connection_sessions
where channel = $1
  and state_token = $2
limit 1
`, channel, stateToken).Scan(
		&record.ID,
		&record.Channel,
		&record.Status,
		&record.RedirectURL,
		&callbackRaw,
		&record.ExpiresAt,
		&record.CompletedAt,
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

func (s *Store) mergeChannelConnectSessionPayload(ctx context.Context, sessionID string, patch map[string]any) error {
	current := map[string]any{}
	var raw string
	if err := s.pool.QueryRow(ctx, `
select callback_payload::text
from public.channel_connection_sessions
where id::text = $1
limit 1
`, sessionID).Scan(&raw); err != nil {
		return err
	}
	if strings.TrimSpace(raw) != "" {
		if err := json.Unmarshal([]byte(raw), &current); err != nil {
			return err
		}
	}
	for key, value := range patch {
		current[key] = value
	}
	body, err := json.Marshal(current)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
update public.channel_connection_sessions
set callback_payload = $2::jsonb,
    updated_at = now()
where id::text = $1
	`, sessionID, string(body))
	return err
}

func exchangeTikTokOAuthCode(ctx context.Context, code string) (*tiktokOAuthTokenResponse, error) {
	clientKey := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CLIENT_KEY"))
	clientSecret := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CLIENT_SECRET"))
	redirectURI := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_REDIRECT_URI"))
	if clientKey == "" || clientSecret == "" || redirectURI == "" {
		return nil, errors.New("tiktok_oauth_env_missing")
	}
	form := url.Values{}
	form.Set("client_key", clientKey)
	form.Set("client_secret", clientSecret)
	form.Set("code", strings.TrimSpace(code))
	form.Set("grant_type", "authorization_code")
	form.Set("redirect_uri", redirectURI)
	if codeVerifier := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CODE_VERIFIER")); codeVerifier != "" {
		form.Set("code_verifier", codeVerifier)
	}
	endpoint := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_TOKEN_URL"))
	if endpoint == "" {
		endpoint = "https://open.tiktokapis.com/v2/oauth/token/"
	}
	return doTikTokTokenRequest[tiktokOAuthTokenResponse](ctx, endpoint, form)
}

func exchangeTikTokMerchantAccessToken(ctx context.Context, merchantID string) (*tiktokMerchantTokenResponse, error) {
	clientKey := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CLIENT_KEY"))
	clientSecret := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_CLIENT_SECRET"))
	if clientKey == "" || clientSecret == "" {
		return nil, errors.New("tiktok_merchant_env_missing")
	}
	form := url.Values{}
	form.Set("client_key", clientKey)
	form.Set("client_secret", clientSecret)
	form.Set("merchant_id", strings.TrimSpace(merchantID))
	form.Set("grant_type", "access_token")
	endpoint := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_MERCHANT_TOKEN_URL"))
	if endpoint == "" {
		endpoint = "https://open.tiktokapis.com/merchant/oauth/token/"
	}
	return doTikTokTokenRequest[tiktokMerchantTokenResponse](ctx, endpoint, form)
}

func (s *Store) hydrateTikTokConnectSessionPayload(ctx context.Context, session *channelConnectSessionRecord) (map[string]any, error) {
	if session == nil {
		return map[string]any{}, nil
	}
	callbackPayload := asMap(session.CallbackPayload)
	if len(asMap(callbackPayload["tiktok_shop_lookup"])) > 0 {
		return callbackPayload, nil
	}

	oauthPayload := asMap(callbackPayload["tiktok_oauth"])
	connectContext := asMap(callbackPayload["tiktok_connect_context"])
	oauthAccessToken := firstNonEmpty(asString(oauthPayload["access_token"]), asString(oauthPayload["oauth_access_token"]))
	merchantID := firstNonEmpty(
		asString(connectContext["merchant_id"]),
		asString(connectContext["seller_id"]),
		asString(oauthPayload["merchant_id"]),
		asString(oauthPayload["seller_id"]),
	)
	if oauthAccessToken == "" || merchantID == "" {
		return callbackPayload, nil
	}

	shops, err := queryTikTokProductOptShops(ctx, oauthAccessToken, merchantID)
	lookupPayload := map[string]any{
		"merchant_id": merchantID,
	}
	if err != nil {
		lookupPayload["status"] = "error"
		lookupPayload["error"] = truncateChannelProjectionError(err)
		if mergeErr := s.mergeChannelConnectSessionPayload(ctx, session.ID, map[string]any{"tiktok_shop_lookup": lookupPayload}); mergeErr != nil {
			return callbackPayload, mergeErr
		}
		callbackPayload["tiktok_shop_lookup"] = lookupPayload
		return callbackPayload, err
	}

	lookupPayload["status"] = "ready"
	lookupPayload["available_shops"] = shops
	if len(shops) > 0 {
		primary := shops[0]
		mergeTikTokValueIfEmpty(lookupPayload, "shop_id", primary["shop_id"])
		mergeTikTokValueIfEmpty(lookupPayload, "shop_cipher", primary["shop_cipher"], primary["third_shop_id"])
		mergeTikTokValueIfEmpty(lookupPayload, "third_shop_id", primary["third_shop_id"], primary["shop_cipher"])
		mergeTikTokValueIfEmpty(lookupPayload, "shop_name", primary["shop_name"])
		mergeTikTokValueIfEmpty(lookupPayload, "shop_region", primary["shop_region"])
	}
	if mergeErr := s.mergeChannelConnectSessionPayload(ctx, session.ID, map[string]any{"tiktok_shop_lookup": lookupPayload}); mergeErr != nil {
		return callbackPayload, mergeErr
	}
	callbackPayload["tiktok_shop_lookup"] = lookupPayload
	return callbackPayload, nil
}

func queryTikTokProductOptShops(ctx context.Context, oauthAccessToken, merchantID string) ([]map[string]any, error) {
	oauthAccessToken = strings.TrimSpace(oauthAccessToken)
	merchantID = strings.TrimSpace(merchantID)
	if oauthAccessToken == "" || merchantID == "" {
		return nil, errors.New("tiktok_product_opt_shops_missing_identity")
	}
	endpoint := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_PRODUCT_OPT_SHOPS_URL"))
	if endpoint == "" {
		endpoint = "https://open.tiktokapis.com/v2/localservice/saas/product_opt_shops/query/"
	}
	body, err := json.Marshal(map[string]any{
		"merchant_id": merchantID,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+oauthAccessToken)
	req.Header.Set("Content-Type", "application/json")
	if targetIDC := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_TARGET_IDC")); targetIDC != "" {
		req.Header.Set("x-tt-target-idc", targetIDC)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	decoder := json.NewDecoder(resp.Body)
	decoder.UseNumber()
	parsed := map[string]any{}
	if err := decoder.Decode(&parsed); err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.New("tiktok_product_opt_shops_non_2xx:" + strconv.Itoa(resp.StatusCode))
	}
	if code := strings.TrimSpace(stringFromAny(parsed["code"])); code != "" && code != "0" && !strings.EqualFold(code, "ok") {
		return nil, errors.New("tiktok_product_opt_shops_api_error:" + code)
	}

	shops := extractTikTokShopOptions(parsed["data"])
	if len(shops) == 0 {
		return nil, errors.New("tiktok_product_opt_shops_empty")
	}
	return shops, nil
}

func doTikTokTokenRequest[T any](ctx context.Context, endpoint string, form url.Values) (*T, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if targetIDC := strings.TrimSpace(os.Getenv("TIKTOK_SHOP_TARGET_IDC")); targetIDC != "" {
		req.Header.Set("x-tt-target-idc", targetIDC)
	} else if strings.Contains(endpoint, "/merchant/oauth/token/") {
		req.Header.Set("x-tt-target-idc", "alisg")
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var parsed T
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.New("tiktok_token_non_2xx:" + strconv.Itoa(resp.StatusCode))
	}
	return &parsed, nil
}

func buildTikTokConnectRedirect(redirectPath, stateToken, status string) string {
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("SITE_URL")), "/")
	target := redirectPath
	if strings.TrimSpace(target) == "" {
		target = "/admin/channels?channel=tiktok"
	}
	if !strings.HasPrefix(target, "/") {
		target = "/admin/channels?channel=tiktok"
	}
	redirectTarget := target
	if base != "" {
		if parsedBase, err := url.Parse(base); err == nil && parsedBase.Scheme != "" && parsedBase.Host != "" {
			redirectTarget = base + target
		}
	}
	parsed, err := url.Parse(redirectTarget)
	if err != nil {
		return "/admin/channels?channel=tiktok"
	}
	query := parsed.Query()
	if query.Get("channel") == "" {
		query.Set("channel", "tiktok")
	}
	if strings.TrimSpace(stateToken) != "" {
		query.Set("state", stateToken)
	}
	if strings.TrimSpace(status) != "" {
		query.Set("oauth_status", status)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func unixToRFC3339(value int64) string {
	if value <= 0 {
		return ""
	}
	return time.Unix(value, 0).UTC().Format(time.RFC3339)
}

func durationSecondsToRFC3339(value int64) string {
	if value <= 0 {
		return ""
	}
	return time.Now().UTC().Add(time.Duration(value) * time.Second).Format(time.RFC3339)
}

func mergeTikTokSessionAuthSnapshot(authSnapshot, sessionPayload map[string]any) map[string]any {
	out := map[string]any{}
	for key, value := range authSnapshot {
		out[key] = value
	}
	callbackPayload := asMap(sessionPayload)
	oauthPayload := asMap(callbackPayload["tiktok_oauth"])
	connectContext := asMap(callbackPayload["tiktok_connect_context"])
	shopLookup := asMap(callbackPayload["tiktok_shop_lookup"])

	mergeTikTokValueIfEmpty(out, "oauth_access_token", oauthPayload["access_token"], out["access_token"])
	mergeTikTokValueIfEmpty(out, "tiktok_oauth_access_token", oauthPayload["access_token"], out["access_token"])
	mergeTikTokValueIfEmpty(out, "access_token", oauthPayload["access_token"])
	mergeTikTokValueIfEmpty(out, "refresh_token", oauthPayload["refresh_token"])
	mergeTikTokValueIfEmpty(out, "access_token_expires_at", oauthPayload["access_token_expires_at"])
	mergeTikTokValueIfEmpty(out, "refresh_token_expires_at", oauthPayload["refresh_token_expires_at"])
	mergeTikTokValueIfEmpty(out, "open_id", oauthPayload["open_id"])
	mergeTikTokValueIfEmpty(out, "scope", oauthPayload["scope"])
	mergeTikTokValueIfEmpty(out, "token_type", oauthPayload["token_type"])

	for _, source := range []map[string]any{connectContext, oauthPayload, shopLookup} {
		mergeTikTokValueIfEmpty(out, "merchant_id", source["merchant_id"], source["seller_id"])
		mergeTikTokValueIfEmpty(out, "seller_id", source["seller_id"], source["merchant_id"])
		mergeTikTokValueIfEmpty(out, "shop_id", source["shop_id"])
		mergeTikTokValueIfEmpty(out, "shop_cipher", source["shop_cipher"], source["third_shop_id"])
		mergeTikTokValueIfEmpty(out, "third_shop_id", source["third_shop_id"], source["shop_cipher"])
		mergeTikTokValueIfEmpty(out, "shop_region", source["shop_region"], source["region"])
		mergeTikTokValueIfEmpty(out, "shop_name", source["shop_name"])
		mergeTikTokValueIfEmpty(out, "account_external_id", source["account_external_id"])
	}
	if len(asItemsFromAny(out["available_shops"])) == 0 {
		if items := asItemsFromAny(shopLookup["available_shops"]); len(items) > 0 {
			out["available_shops"] = items
		}
	}
	return out
}

func mergeTikTokShopLookup(authSnapshot map[string]any, merchantID string, shops []map[string]any) map[string]any {
	if len(shops) == 0 {
		return authSnapshot
	}
	out := map[string]any{}
	for key, value := range authSnapshot {
		out[key] = value
	}
	out["available_shops"] = shops
	out["available_shop_count"] = len(shops)
	primary := shops[0]
	mergeTikTokValueIfEmpty(out, "merchant_id", merchantID, primary["merchant_id"], primary["seller_id"])
	mergeTikTokValueIfEmpty(out, "seller_id", merchantID, primary["seller_id"], primary["merchant_id"])
	mergeTikTokValueIfEmpty(out, "shop_id", primary["shop_id"])
	mergeTikTokValueIfEmpty(out, "shop_cipher", primary["shop_cipher"], primary["third_shop_id"])
	mergeTikTokValueIfEmpty(out, "third_shop_id", primary["third_shop_id"], primary["shop_cipher"])
	mergeTikTokValueIfEmpty(out, "shop_name", primary["shop_name"])
	mergeTikTokValueIfEmpty(out, "shop_region", primary["shop_region"])
	return out
}

func extractTikTokShopOptions(value any) []map[string]any {
	switch x := value.(type) {
	case []any:
		out := make([]map[string]any, 0, len(x))
		for _, item := range x {
			if normalized := normalizeTikTokShopOption(item); len(normalized) > 0 {
				out = append(out, normalized)
			}
		}
		return out
	case map[string]any:
		for _, key := range []string{"available_shops", "shops", "shop_list", "product_opt_shops", "shop_base_infos", "shop_infos", "items"} {
			if items := extractTikTokShopOptions(x[key]); len(items) > 0 {
				return items
			}
		}
		if normalized := normalizeTikTokShopOption(x); len(normalized) > 0 {
			return []map[string]any{normalized}
		}
	}
	return nil
}

func normalizeTikTokShopOption(value any) map[string]any {
	item := asMap(value)
	if len(item) == 0 {
		return nil
	}
	if base := asMap(item["shop_base_info"]); len(base) > 0 {
		for key, value := range item {
			if _, exists := base[key]; !exists {
				base[key] = value
			}
		}
		item = base
	}

	merchantID := firstNonEmpty(stringFromAny(item["merchant_id"]), stringFromAny(item["seller_id"]))
	shopID := firstNonEmpty(stringFromAny(item["shop_id"]), stringFromAny(item["id"]))
	thirdShopID := firstNonEmpty(stringFromAny(item["third_shop_id"]), stringFromAny(item["shop_cipher"]))
	shopName := firstNonEmpty(
		stringFromAny(item["shop_name"]),
		stringFromAny(item["shop_name_local"]),
		stringFromAny(item["shop_name_en"]),
		stringFromAny(item["name"]),
	)
	shopRegion := firstNonEmpty(
		stringFromAny(item["shop_region"]),
		stringFromAny(item["region"]),
		stringFromAny(item["country"]),
		stringFromAny(item["country_code"]),
	)
	if merchantID == "" && shopID == "" && thirdShopID == "" && shopName == "" {
		return nil
	}
	out := map[string]any{}
	if merchantID != "" {
		out["merchant_id"] = merchantID
		out["seller_id"] = merchantID
	}
	if shopID != "" {
		out["shop_id"] = shopID
	}
	if thirdShopID != "" {
		out["third_shop_id"] = thirdShopID
		out["shop_cipher"] = thirdShopID
	}
	if shopName != "" {
		out["shop_name"] = shopName
	}
	if shopRegion != "" {
		out["shop_region"] = shopRegion
	}
	return out
}

func normalizeTikTokCallbackContext(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, value := range input {
		trimmed := strings.TrimSpace(strings.ToLower(key))
		if trimmed == "" {
			continue
		}
		if text := strings.TrimSpace(stringFromAny(value)); text != "" {
			out[trimmed] = text
		}
	}
	return out
}

func mergeTikTokValueIfEmpty(out map[string]any, key string, values ...any) {
	if strings.TrimSpace(stringFromAny(out[key])) != "" {
		return
	}
	for _, value := range values {
		if text := strings.TrimSpace(stringFromAny(value)); text != "" {
			out[key] = text
			return
		}
	}
}

func asItemsFromAny(value any) []map[string]any {
	items, ok := value.([]map[string]any)
	if ok {
		return items
	}
	rawItems, ok := value.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(rawItems))
	for _, item := range rawItems {
		if normalized := asMap(item); len(normalized) > 0 {
			out = append(out, normalized)
		}
	}
	return out
}

func stringFromAny(value any) string {
	if value == nil {
		return ""
	}
	switch x := value.(type) {
	case string:
		return strings.TrimSpace(x)
	case fmt.Stringer:
		return strings.TrimSpace(x.String())
	case json.Number:
		return strings.TrimSpace(x.String())
	default:
		text := strings.TrimSpace(fmt.Sprint(x))
		if text == "<nil>" {
			return ""
		}
		return text
	}
}
