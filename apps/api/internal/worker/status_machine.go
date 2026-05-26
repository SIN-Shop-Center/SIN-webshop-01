package worker

import (
	"context"
	"fmt"
	"strings"
)

var allowedOrderTransitions = map[string]map[string]struct{}{
	"created": {
		"payment_pending": {},
		"confirmed":       {},
	},
	"payment_pending": {
		"confirmed": {},
	},
	"confirmed": {
		"processing": {},
	},
	"processing": {
		"supplier_ordered": {},
		"shipped":          {},
	},
	"supplier_ordered": {
		"shipped":   {},
		"delivered": {},
	},
	"shipped": {
		"delivered": {},
	},
}

func (p *Processor) transitionOrderStatus(ctx context.Context, orderID, nextStatus string) (bool, error) {
	next := normalizeStatus(nextStatus)
	if next == "" {
		return false, fmt.Errorf("%w: empty_target_status", ErrPermanent)
	}

	current, err := p.readOrderStatus(ctx, orderID)
	if err != nil {
		return false, err
	}
	current = normalizeStatus(current)
	if current == next {
		return false, nil
	}
	if !isAllowedOrderTransition(current, next) {
		return false, fmt.Errorf("%w: invalid_status_transition_%s_to_%s", ErrPermanent, current, next)
	}

	result, err := p.pool.Exec(ctx, `
update shop.orders
set status = $2,
    updated_at = now()
where id::text = $1
  and status = $3
`, orderID, next, current)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (p *Processor) readOrderStatus(ctx context.Context, orderID string) (string, error) {
	var status string
	err := p.pool.QueryRow(ctx, `
select status
from shop.orders
where id::text = $1
limit 1
`, orderID).Scan(&status)
	return status, err
}

func isAllowedOrderTransition(current, next string) bool {
	allowed, ok := allowedOrderTransitions[current]
	if !ok {
		return false
	}
	_, ok = allowed[next]
	return ok
}

func normalizeStatus(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}
