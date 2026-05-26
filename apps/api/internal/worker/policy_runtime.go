package worker

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (p *Processor) isSupplierFulfillmentEnabled(ctx context.Context) (bool, error) {
	const query = `
select coalesce((value->'automation_policy'->>'supplier_fulfillment_enabled')::boolean, true)
from shop.settings
where key = 'shop_settings'
limit 1
`
	var enabled bool
	err := p.pool.QueryRow(ctx, query).Scan(&enabled)
	if err == pgx.ErrNoRows {
		return true, nil
	}
	return enabled, err
}

func (p *Processor) isGrowthKillSwitchEnabled(ctx context.Context, domain string) (bool, error) {
	key := strings.TrimSpace(domain)
	if key == "" {
		return false, nil
	}
	const query = `
select coalesce((value->'growth_kill_switch'->>$1)::boolean, false)
from shop.settings
where key = 'shop_settings'
limit 1
`
	var enabled bool
	err := p.pool.QueryRow(ctx, query, key).Scan(&enabled)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	return enabled, err
}
