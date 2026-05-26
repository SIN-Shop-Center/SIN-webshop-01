package worker

import (
	"context"
	"strings"
)

func (p *Processor) handleFulfillmentStarted(ctx context.Context, job Job) error {
	orderID, payload, err := orderIDFromPayload(job)
	if err != nil {
		return err
	}

	_, err = p.pool.Exec(ctx, `
insert into shop.shipments (order_id, carrier, status)
select $1::uuid, 'dhl', 'label_created'
where not exists (select 1 from shop.shipments where order_id::text = $1)
`, orderID)
	if err != nil {
		return err
	}

	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) handleShipmentUpdated(ctx context.Context, job Job) error {
	orderID, payload, err := orderIDFromPayload(job)
	if err != nil {
		return err
	}

	status := sanitizeIdentifier(asString(payload["status"]), "updated")
	trackingNumber := strings.TrimSpace(asString(payload["tracking_number"]))
	if trackingNumber == "" {
		trackingNumber = strings.TrimSpace(asString(payload["trackingNumber"]))
	}
	trackingURL := strings.TrimSpace(asString(payload["tracking_url"]))
	if trackingURL == "" {
		trackingURL = strings.TrimSpace(asString(payload["trackingUrl"]))
	}

	recipient, oldStatus, err := p.readOrderEmailAndStatus(ctx, orderID)
	if err != nil {
		return err
	}

	nextOrderStatus := orderStatusFromShipment(status, oldStatus)
	statusChanged := false
	if normalizeStatus(nextOrderStatus) != normalizeStatus(oldStatus) {
		changed, err := p.transitionOrderStatus(ctx, orderID, nextOrderStatus)
		if err != nil {
			return err
		}
		statusChanged = changed
	}

	_, err = p.pool.Exec(ctx, `
update shop.orders
set tracking_number = nullif($2, ''),
    tracking_url = nullif($3, ''),
    updated_at = now()
where id::text = $1
`, orderID, trackingNumber, trackingURL)
	if err != nil {
		return err
	}
	if !statusChanged {
		return p.postAutomationEvent(ctx, job.JobType, payload)
	}

	subject, body := buildShipmentEmail(orderID, status, trackingNumber, trackingURL)
	emailType := "shipment_" + strings.ToLower(status)
	logID, alreadySent, err := p.acquireEmailSlot(ctx, orderID, recipient, emailType, subject)
	if err != nil {
		return err
	}
	if !alreadySent {
		messageID, sendErr := p.sendMail(ctx, recipient, subject, body, nil)
		if sendErr != nil {
			_ = p.markEmailFailed(ctx, logID, sendErr.Error())
			return sendErr
		}
		if err := p.markEmailSent(ctx, logID, messageID); err != nil {
			return err
		}
	}

	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) readOrderEmailAndStatus(ctx context.Context, orderID string) (string, string, error) {
	var email string
	var status string
	err := p.pool.QueryRow(ctx, `
select email, status
from shop.orders
where id::text = $1
limit 1
`, orderID).Scan(&email, &status)
	if err != nil {
		return "", "", err
	}
	return email, status, nil
}

func orderStatusFromShipment(shipmentStatus, fallback string) string {
	switch strings.ToLower(strings.TrimSpace(shipmentStatus)) {
	case "label_created", "processing":
		return "processing"
	case "supplier_ordered":
		return "supplier_ordered"
	case "shipped", "in_transit":
		return "shipped"
	case "delivered":
		return "delivered"
	case "failed", "exception":
		return normalizeStatus(fallback)
	default:
		return normalizeStatus(fallback)
	}
}
