package checkout

import (
	"context"
	"encoding/json"
)

type CreateOrderInput struct {
	OrderID          string
	CustomerID       string
	Email            string
	Currency         string
	ShippingMethod   string
	CustomerType     string
	CompanyName      string
	VATID            string
	PurchaseOrderRef string
	ShippingAddress  ShippingAddress
	Items            []PricedItem
	SubtotalAmount   int
	ShippingAmount   int
	TotalAmount      int
}

func (s *Store) EnsurePendingOrder(ctx context.Context, in CreateOrderInput) error {
	shippingJSON, err := json.Marshal(map[string]any{
		"first_name":         in.ShippingAddress.FirstName,
		"last_name":          in.ShippingAddress.LastName,
		"street1":            in.ShippingAddress.Street1,
		"street2":            in.ShippingAddress.Street2,
		"city":               in.ShippingAddress.City,
		"zip":                in.ShippingAddress.Zip,
		"country":            in.ShippingAddress.Country,
		"phone":              in.ShippingAddress.Phone,
		"customer_type":      in.CustomerType,
		"company_name":       in.CompanyName,
		"vat_id":             in.VATID,
		"purchase_order_ref": in.PurchaseOrderRef,
	})
	if err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	res, err := tx.Exec(ctx, `
insert into shop.orders (
  id, user_id, customer_id, email, status, payment_status, payment_provider, currency,
  subtotal_amount, shipping_amount, tax_amount, total_amount,
  shipping_method, shipping_address
)
values (
  $1::uuid, nullif($2, '')::uuid, null, $3, 'payment_pending', 'pending', 'stripe', $4,
  $5, $6, 0, $7, $8, $9::jsonb
)
on conflict (id) do nothing
`, in.OrderID, in.CustomerID, in.Email, in.Currency, in.SubtotalAmount, in.ShippingAmount, in.TotalAmount, in.ShippingMethod, string(shippingJSON))
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return tx.Commit(ctx)
	}

	for _, item := range in.Items {
		_, err := tx.Exec(ctx, `
insert into shop.order_items (order_id, product_id, sku, title, quantity, unit_price_amount)
values ($1::uuid, nullif($2, '')::uuid, $3, $4, $5, $6)
`, in.OrderID, item.ProductID, item.SKU, item.Title, item.Quantity, item.UnitPriceAmount)
		if err != nil {
			return err
		}
	}

	eventBody, err := json.Marshal(map[string]any{
		"order_id":         in.OrderID,
		"email":            in.Email,
		"currency":         in.Currency,
		"total_amount":     in.TotalAmount,
		"shipping_method":  in.ShippingMethod,
		"customer_type":    in.CustomerType,
		"purchase_order":   in.PurchaseOrderRef,
		"company_name":     in.CompanyName,
		"customer_vat_id":  in.VATID,
		"shipping_address": in.ShippingAddress,
	})
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('order.created', 'order', $1, $2::jsonb, 'pending')
`, in.OrderID, string(eventBody))
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
