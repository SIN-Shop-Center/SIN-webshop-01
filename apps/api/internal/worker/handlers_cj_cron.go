package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

func (p *Processor) handleCJTrackingPoll(ctx context.Context, job Job) error {
	apiKey := strings.TrimSpace(p.cfg.CJAPIKey)
	if apiKey == "" {
		return fmt.Errorf("%w: cj_api_key_missing", ErrPermanent)
	}

	client := newCJClient(apiKey)
	rows, err := p.pool.Query(ctx, `
select so.external_order_id, so.order_id::text, o.status as order_status
from shop.supplier_orders so
join shop.orders o on o.id::text = so.order_id::text
where so.supplier_id::text = 'afe83509-b0d5-44fb-85b8-1bd5ce0df2ab'
  and so.status = 'placed'
  and so.external_order_id is not null
  and so.external_order_id <> ''
  and o.status not in ('delivered', 'cancelled', 'refunded')
order by so.placed_at desc
limit 50
`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type pendingOrder struct {
		ExternalID string
		OrderID    string
		OldStatus  string
	}
	var pending []pendingOrder
	for rows.Next() {
		var po pendingOrder
		if err := rows.Scan(&po.ExternalID, &po.OrderID, &po.OldStatus); err != nil {
			return err
		}
		pending = append(pending, po)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	pollCount := 0
	updateCount := 0
	for _, po := range pending {
		detail, err := client.getOrderDetail(ctx, po.ExternalID)
		if err != nil {
			p.logf("cj_tracking_poll: order=%s error=%s", po.ExternalID, err.Error())
			continue
		}
		pollCount++
		if detail.Data == nil {
			continue
		}

		cjStatus := strings.ToLower(strings.TrimSpace(detail.Data.OrderStatus))
		trackingNumber := strings.TrimSpace(detail.Data.TrackNumber)
		trackingURL := strings.TrimSpace(detail.Data.TrackingURL)

		newStatus := mapCJStatusToOrder(cjStatus)
		if newStatus == "" || newStatus == po.OldStatus {
			continue
		}

		updateCount++
		eventPayload, _ := json.Marshal(map[string]any{
			"order_id":        po.OrderID,
			"status":          newStatus,
			"tracking_number": trackingNumber,
			"tracking_url":    trackingURL,
			"source":          "cj_tracking_poll",
			"polled_at":       time.Now().UTC().Format(time.RFC3339),
		})

		_, err = p.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('shipment.updated', 'order', $1, $2::jsonb, 'pending')
`, po.OrderID, string(eventPayload))
		if err != nil {
			p.logf("cj_tracking_poll: event_outbox_insert order=%s error=%s", po.OrderID, err.Error())
		}
	}

	p.logf("cj_tracking_poll: polled=%d updated=%d", pollCount, updateCount)
	_ = p.postAutomationEvent(ctx, job.JobType, map[string]any{
		"polled":    pollCount,
		"updated":   updateCount,
		"pending":   len(pending),
		"polled_at": time.Now().UTC().Format(time.RFC3339),
	})
	return nil
}

func mapCJStatusToOrder(cjStatus string) string {
	switch cjStatus {
	case "placed", "pending", "confirmed":
		return "processing"
	case "processing":
		return "processing"
	case "shipped", "in_transit", "in transit":
		return "shipped"
	case "delivered":
		return "delivered"
	case "cancelled", "failed", "returned":
		return "cancelled"
	default:
		return ""
	}
}

func (p *Processor) handleCJProductSync(ctx context.Context, job Job) error {
	supplierID := "afe83509-b0d5-44fb-85b8-1bd5ce0df2ab"
	eventPayload, _ := json.Marshal(map[string]any{
		"supplier_id":    supplierID,
		"catalog_status": "new",
		"triggered_by":   "cron",
	})
	_, err := p.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('supplier.catalog.sync.requested', 'supplier', $1, $2::jsonb, 'pending')
`, supplierID, string(eventPayload))
	if err != nil {
		return err
	}
	p.logf("cj_product_sync: event_outbox_inserted supplier_id=%s", supplierID)
	_ = p.postAutomationEvent(ctx, job.JobType, map[string]any{
		"supplier_id": supplierID,
		"triggered":   true,
	})
	return nil
}

func (p *Processor) handleCJBalanceCheck(ctx context.Context, job Job) error {
	apiKey := strings.TrimSpace(p.cfg.CJAPIKey)
	if apiKey == "" {
		return fmt.Errorf("%w: cj_api_key_missing", ErrPermanent)
	}

	client := newCJClient(apiKey)
	balance, err := client.getBalance(ctx)
	if err != nil {
		return err
	}

	alertThreshold := 20.0
	alertLevel := "ok"
	if balance < alertThreshold {
		alertLevel = "low"
	} else if balance < 50.0 {
		alertLevel = "warning"
	}

	resultPayload := map[string]any{
		"balance":     balance,
		"alert_level": alertLevel,
		"threshold":   alertThreshold,
		"checked_at":  time.Now().UTC().Format(time.RFC3339),
	}

	p.logf("cj_balance_check: balance=%.2f alert=%s", balance, alertLevel)

	if alertLevel != "ok" {
		_, _ = p.pool.Exec(ctx, `
insert into shop.support_tickets (email, subject, message, status, priority, metadata)
values ('ops@delqhi.com', 'CJ Balance Alert', $1, 'open', 'high', $2::jsonb)
`, fmt.Sprintf("CJ Balance is $%.2f (below $%.0f threshold)", balance, alertThreshold), mustJSON(resultPayload))
	}

	_ = p.postAutomationEvent(ctx, job.JobType, resultPayload)
	return nil
}
