package worker

import (
	"context"
	"encoding/json"
	"fmt"
)

func (p *Processor) handleCheckoutSession(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid checkout payload", ErrPermanent)
	}

	email := asString(payload["email"])
	if email == "" {
		return fmt.Errorf("%w: missing email", ErrPermanent)
	}

	orderID := normalizeUUID(job.DedupeKey)
	if orderID == "" {
		orderID = normalizeUUID(job.ID)
	}
	if orderID == "" {
		return fmt.Errorf("%w: invalid order id", ErrPermanent)
	}

	currency := asString(payload["currency"])
	if currency == "" {
		currency = "EUR"
	}
	shippingMethod := asString(payload["shipping_method"])
	if shippingMethod == "" {
		shippingMethod = "express"
	}
	userID := normalizeUUID(asString(payload["user_id"]))
	itemsRaw, ok := payload["items"].([]any)
	if !ok || len(itemsRaw) == 0 {
		return fmt.Errorf("%w: checkout items required", ErrPermanent)
	}

	subtotal := 0
	items := make([]map[string]any, 0, len(itemsRaw))
	for _, raw := range itemsRaw {
		item := asMap(raw)
		sku := asString(item["sku"])
		qty := int(asFloat(item["quantity"]))
		unit := int(asFloat(item["unit_price_amount"]))
		if sku == "" || qty <= 0 || unit <= 0 {
			continue
		}
		items = append(items, map[string]any{
			"sku":              sku,
			"title":            asString(item["title"]),
			"quantity":         qty,
			"unit_price_amount": unit,
		})
		subtotal += qty * unit
	}
	if len(items) == 0 {
		return fmt.Errorf("%w: no valid checkout items", ErrPermanent)
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var exists bool
	if err := tx.QueryRow(ctx, `select exists(select 1 from shop.orders where id = $1::uuid)`, orderID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return tx.Commit(ctx)
	}

	_, err = tx.Exec(ctx, `
insert into shop.orders (
  id, user_id, email, status, payment_status, currency,
  subtotal_amount, shipping_amount, tax_amount, total_amount,
  shipping_method
)
values (
  $1::uuid,
  nullif($2, '')::uuid,
  $3,
  'created',
  'pending',
  $4,
  $5,
  0,
  0,
  $5,
  $6
)
`, orderID, userID, email, currency, subtotal, shippingMethod)
	if err != nil {
		return err
	}

	for _, item := range items {
		_, err := tx.Exec(ctx, `
insert into shop.order_items (order_id, sku, title, quantity, unit_price_amount)
values ($1::uuid, $2, nullif($3, ''), $4, $5)
`, orderID, item["sku"], item["title"], item["quantity"], item["unit_price_amount"])
		if err != nil {
			return err
		}
	}

	eventPayload, err := json.Marshal(map[string]any{
		"order_id": orderID,
		"email":    email,
		"items":    items,
	})
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('order.created', 'order', $1, $2::jsonb, 'pending')
`, orderID, string(eventPayload))
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
