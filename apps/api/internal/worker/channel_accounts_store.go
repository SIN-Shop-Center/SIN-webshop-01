package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

func (p *Processor) loadConnectedChannelAccount(ctx context.Context, channel string) (*channelAccountRuntime, error) {
	const query = `
select connection_mode, auth_snapshot::text
from shop.channel_accounts
where channel = $1
  and status = any($2::text[])
order by updated_at desc
limit 1
`
	statuses := []string{"connected", "degraded"}
	var mode string
	var authRaw string
	err := p.pool.QueryRow(ctx, query, channel, statuses).Scan(&mode, &authRaw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("%w: channel_not_connected", ErrPermanent)
	}
	if err != nil {
		return nil, err
	}
	auth := map[string]any{}
	if authRaw != "" {
		_ = json.Unmarshal([]byte(authRaw), &auth)
	}
	return &channelAccountRuntime{
		ConnectionMode: mode,
		AuthSnapshot:   auth,
	}, nil
}
