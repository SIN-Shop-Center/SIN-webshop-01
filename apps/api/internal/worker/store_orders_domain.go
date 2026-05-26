package worker

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

func (p *Processor) loadOrderAggregate(ctx context.Context, orderID string) (*orderAggregate, error) {
	const orderQuery = `
select id::text,
       email,
       currency,
       status,
       payment_status,
       coalesce(subtotal_amount, round(coalesce(subtotal, 0) * 100)::int, 0),
       coalesce(shipping_amount, round(coalesce(shipping_cost, 0) * 100)::int, 0),
       coalesce(tax_amount, round(coalesce(tax, 0) * 100)::int, 0),
       coalesce(total_amount, round(coalesce(total, 0) * 100)::int, 0),
       coalesce(shipping_address, '{}'::jsonb)::text,
       created_at
from shop.orders
where id::text = $1
limit 1
`

	var out orderAggregate
	var shippingJSON string
	err := p.pool.QueryRow(ctx, orderQuery, orderID).Scan(
		&out.ID,
		&out.Email,
		&out.Currency,
		&out.Status,
		&out.PaymentStatus,
		&out.SubtotalAmount,
		&out.ShippingAmount,
		&out.TaxAmount,
		&out.TotalAmount,
		&shippingJSON,
		&out.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	out.ShippingRaw = []byte(shippingJSON)

	const itemsQuery = `
select coalesce(sku, ''),
       coalesce(title, ''),
       quantity,
       coalesce(unit_price_amount, round(coalesce(price, 0) * 100)::int, 0)
from shop.order_items
where order_id::text = $1
order by created_at asc
`
	rows, err := p.pool.Query(ctx, itemsQuery, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]orderItemAggregate, 0, 8)
	for rows.Next() {
		var item orderItemAggregate
		if err := rows.Scan(&item.SKU, &item.Title, &item.Quantity, &item.UnitPriceAmount); err != nil {
			return nil, err
		}
		if item.Quantity <= 0 || item.UnitPriceAmount <= 0 {
			continue
		}
		if item.Title == "" {
			item.Title = item.SKU
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out.Items = items

	if out.SubtotalAmount <= 0 {
		subtotal := 0
		for _, item := range out.Items {
			subtotal += item.Quantity * item.UnitPriceAmount
		}
		out.SubtotalAmount = subtotal
	}
	if out.TotalAmount <= 0 {
		out.TotalAmount = out.SubtotalAmount + out.ShippingAmount
	}
	if out.TaxAmount <= 0 {
		out.TaxAmount = estimateTaxAmount(out.TotalAmount)
	}

	return &out, nil
}

func estimateTaxAmount(grossAmount int) int {
	if grossAmount <= 0 {
		return 0
	}
	// Launch default: gross prices with 19% VAT portion.
	net := (grossAmount * 100) / 119
	return grossAmount - net
}
