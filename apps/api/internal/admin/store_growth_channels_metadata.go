package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type channelAccountRecord struct {
	ID                string
	Channel           string
	AccountName       string
	AccountExternalID string
	Status            string
	ConnectionMode    string
	AuthSnapshot      map[string]any
	HealthSnapshot    map[string]any
}

func (s *Store) RefreshChannelMetadata(ctx context.Context, channel string) (map[string]any, error) {
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 {
		return nil, errInvalidInput
	}
	channel = normalized[0]
	if channel != "tiktok" {
		return nil, errInvalidInput
	}

	account, err := s.loadLatestChannelAccount(ctx, channel)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotConnected
	}
	if err != nil {
		return nil, err
	}

	authSnapshot, healthSnapshot, accountExternalID, err := refreshTikTokChannelMetadata(ctx, account.AuthSnapshot, account.HealthSnapshot, account.AccountExternalID)
	if err != nil {
		return nil, err
	}
	if err := s.updateChannelAccountSnapshots(ctx, account.ID, accountExternalID, authSnapshot, healthSnapshot); err != nil {
		return nil, err
	}
	return s.GetChannelHealth(ctx, channel)
}

func (s *Store) loadLatestChannelAccount(ctx context.Context, channel string) (*channelAccountRecord, error) {
	var record channelAccountRecord
	var authRaw string
	var healthRaw string
	err := s.pool.QueryRow(ctx, `
select id::text,
       channel,
       account_name,
       coalesce(account_external_id, ''),
       status,
       connection_mode,
       auth_snapshot::text,
       health_snapshot::text
from shop.channel_accounts
where channel = $1
order by updated_at desc
limit 1
`, channel).Scan(
		&record.ID,
		&record.Channel,
		&record.AccountName,
		&record.AccountExternalID,
		&record.Status,
		&record.ConnectionMode,
		&authRaw,
		&healthRaw,
	)
	if err != nil {
		return nil, err
	}
	record.AuthSnapshot = map[string]any{}
	record.HealthSnapshot = map[string]any{}
	if strings.TrimSpace(authRaw) != "" {
		_ = json.Unmarshal([]byte(authRaw), &record.AuthSnapshot)
	}
	if strings.TrimSpace(healthRaw) != "" {
		_ = json.Unmarshal([]byte(healthRaw), &record.HealthSnapshot)
	}
	return &record, nil
}

func (s *Store) updateChannelAccountSnapshots(ctx context.Context, accountID, accountExternalID string, authSnapshot, healthSnapshot map[string]any) error {
	authBlob, err := json.Marshal(authSnapshot)
	if err != nil {
		return err
	}
	healthBlob, err := json.Marshal(healthSnapshot)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
update shop.channel_accounts
set account_external_id = nullif($2, ''),
    status = case when status = 'disconnected' then 'connected' else status end,
    auth_snapshot = $3::jsonb,
    health_snapshot = $4::jsonb,
    last_health_at = now(),
    updated_at = now()
where id::text = $1
`, accountID, accountExternalID, string(authBlob), string(healthBlob))
	return err
}

func refreshTikTokChannelMetadata(ctx context.Context, authSnapshot, healthSnapshot map[string]any, currentAccountExternalID string) (map[string]any, map[string]any, string, error) {
	auth := map[string]any{}
	for key, value := range authSnapshot {
		auth[key] = value
	}
	health := map[string]any{}
	for key, value := range healthSnapshot {
		health[key] = value
	}
	auth, health = enrichTikTokSnapshotsWithA2A(ctx, auth, health)

	oauthAccessToken := firstNonEmpty(
		asString(auth["oauth_access_token"]),
		asString(auth["tiktok_oauth_access_token"]),
	)
	merchantID := firstNonEmpty(asString(auth["merchant_id"]), asString(auth["seller_id"]))
	if oauthAccessToken != "" && merchantID != "" {
		shops, err := queryTikTokProductOptShops(ctx, oauthAccessToken, merchantID)
		if err != nil {
			return nil, nil, "", errors.New("tiktok_shop_metadata_refresh_failed: " + truncateChannelProjectionError(err))
		}
		auth = mergeTikTokShopLookup(auth, merchantID, shops)
		auth["metadata_refresh_source"] = "tiktok_product_opt_shops"
		auth["metadata_refreshed_at"] = time.Now().UTC().Format(time.RFC3339)
	}

	health["status"] = defaultString(health["status"], "healthy")
	health["merchant_id"] = firstNonEmpty(asString(auth["merchant_id"]), asString(auth["seller_id"]))
	health["seller_id"] = asString(auth["seller_id"])
	health["shop_id"] = firstNonEmpty(asString(auth["shop_id"]), asString(auth["shop_cipher"]))
	health["shop_cipher"] = firstNonEmpty(asString(auth["shop_cipher"]), asString(auth["third_shop_id"]))
	health["shop_region"] = asString(auth["shop_region"])
	health["shop_name"] = asString(auth["shop_name"])
	health["available_shop_count"] = len(asItemsFromAny(auth["available_shops"]))
	health["metadata_refreshed_at"] = auth["metadata_refreshed_at"]

	accountExternalID := firstNonEmpty(
		asString(auth["account_external_id"]),
		asString(auth["shop_code"]),
		asString(auth["shop_id"]),
		asString(auth["shop_cipher"]),
		asString(auth["third_shop_id"]),
		currentAccountExternalID,
		merchantID,
	)

	if accountExternalID == "" {
		return nil, nil, "", errors.New("missing_channel_merchant")
	}
	return auth, health, accountExternalID, nil
}
