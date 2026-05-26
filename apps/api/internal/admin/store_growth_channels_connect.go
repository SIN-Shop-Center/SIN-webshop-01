package admin

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *Store) CompleteChannelConnect(ctx context.Context, channel, stateToken, accountExternalID string, authSnapshot, healthSnapshot map[string]any) (*ChannelAccountSummary, error) {
	var err error
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 {
		return nil, errInvalidInput
	}
	channel = normalized[0]
	if asString(stateToken) == "" {
		return nil, errInvalidInput
	}

	session, err := s.loadChannelConnectSession(ctx, channel, stateToken)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errBlocked
	}
	if err != nil {
		return nil, err
	}

	authSnapshot, err = s.completeChannelAuthSnapshot(ctx, channel, authSnapshot, session.CallbackPayload)
	if err != nil {
		return nil, err
	}
	authSnapshot, err = normalizeChannelAuthSnapshot(channel, authSnapshot)
	if err != nil {
		return nil, err
	}
	healthSnapshot = normalizeChannelHealthSnapshot(healthSnapshot)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var sessionID string
	err = tx.QueryRow(ctx, `
select id::text
from shop.channel_connection_sessions
where channel = $1
  and state_token = $2
  and status = 'pending'
  and expires_at > now()
limit 1
`, channel, stateToken).Scan(&sessionID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errBlocked
	}
	if err != nil {
		return nil, err
	}

	accountName := asString(authSnapshot["account_name"])
	authBlob, err := json.Marshal(authSnapshot)
	if err != nil {
		return nil, err
	}
	healthBlob, err := json.Marshal(healthSnapshot)
	if err != nil {
		return nil, err
	}

	row, accountID, err := s.upsertChannelAccount(ctx, tx, channel, accountName, accountExternalID, string(authBlob), string(healthBlob))
	if err != nil {
		return nil, err
	}
	callbackPayload, err := json.Marshal(map[string]any{
		"state_token":         stateToken,
		"account_external_id": accountExternalID,
		"auth_snapshot":       authSnapshot,
		"health_snapshot":     healthSnapshot,
		"completed_at":        time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return nil, err
	}
	if err := s.markChannelConnectSessionComplete(ctx, tx, sessionID, accountID, string(callbackPayload)); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Store) upsertChannelAccount(ctx context.Context, tx pgx.Tx, channel, accountName, accountExternalID, authBlob, healthBlob string) (*ChannelAccountSummary, string, error) {
	row := &ChannelAccountSummary{}
	var accountID string
	connectionMode := channelConnectMode(channel)
	err := tx.QueryRow(ctx, `
insert into shop.channel_accounts (
  channel, account_name, account_external_id, status, connection_mode, auth_snapshot, health_snapshot, last_connected_at, last_health_at
)
values ($1, $2, nullif($3, ''), 'connected', $4, $5::jsonb, $6::jsonb, now(), now())
on conflict (channel, account_name) do update
set account_external_id = excluded.account_external_id,
    status = 'connected',
    connection_mode = excluded.connection_mode,
    auth_snapshot = excluded.auth_snapshot,
    health_snapshot = excluded.health_snapshot,
    last_connected_at = now(),
    last_health_at = now(),
    updated_at = now()
returning id::text, id::text, channel, account_name, status, connection_mode, last_connected_at, last_health_at, updated_at
`, channel, accountName, accountExternalID, connectionMode, authBlob, healthBlob).Scan(
		&accountID,
		&row.ID,
		&row.Channel,
		&row.AccountName,
		&row.Status,
		&row.ConnectionMode,
		&row.LastConnectedAt,
		&row.LastHealthAt,
		&row.UpdatedAt,
	)
	if err != nil {
		return nil, "", err
	}
	return row, accountID, nil
}

func (s *Store) markChannelConnectSessionComplete(ctx context.Context, tx pgx.Tx, sessionID, accountID, callbackPayload string) error {
	_, err := tx.Exec(ctx, `
update shop.channel_connection_sessions
set status = 'completed',
    account_id = $2::uuid,
    callback_payload = $3::jsonb,
    completed_at = now(),
    updated_at = now()
where id::text = $1
`, sessionID, accountID, callbackPayload)
	return err
}
