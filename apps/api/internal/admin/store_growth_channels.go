package admin

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

func (s *Store) ListChannelAccounts(ctx context.Context) ([]ChannelAccountSummary, error) {
	const query = `
select id::text, channel, account_name, status, connection_mode, last_connected_at, last_health_at, updated_at
from public.channel_accounts
order by channel asc, updated_at desc
`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ChannelAccountSummary, 0, 8)
	for rows.Next() {
		var row ChannelAccountSummary
		if err := rows.Scan(&row.ID, &row.Channel, &row.AccountName, &row.Status, &row.ConnectionMode, &row.LastConnectedAt, &row.LastHealthAt, &row.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (s *Store) StartChannelConnect(ctx context.Context, channel string) (map[string]any, error) {
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 {
		return nil, errInvalidInput
	}
	channel = normalized[0]

	stateToken := uuid.NewString()
	redirect := "/admin/channels?channel=" + channel + "&state=" + stateToken
	_, err := s.pool.Exec(ctx, `
insert into public.channel_accounts (channel, account_name, status, connection_mode)
values ($1, 'default', 'disconnected', $2)
on conflict (channel, account_name) do nothing
`, channel, channelConnectMode(channel))
	if err != nil {
		return nil, err
	}
	payload := map[string]any{
		"status":               "pending",
		"channel":              channel,
		"state_token":          stateToken,
		"redirect_url":         redirect,
		"expires_at":           time.Now().UTC().Add(30 * time.Minute),
		"required_auth_fields": channelProfile(channel).RequiredAuthFields,
		"optional_auth_fields": channelProfile(channel).OptionalAuthFields,
	}
	payload = enrichChannelConnectPayload(channel, payload)
	body, err := json.Marshal(map[string]any{"redirect_url": redirect})
	if err != nil {
		return nil, err
	}
	_, err = s.pool.Exec(ctx, `
insert into public.channel_connection_sessions (channel, state_token, status, redirect_url, callback_payload)
values ($1, $2, 'pending', $3, $4::jsonb)
`, payload["channel"], stateToken, redirect, string(body))
	if err != nil {
		return nil, err
	}
	return payload, nil
}
