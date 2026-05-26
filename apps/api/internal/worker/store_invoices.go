package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

func (p *Processor) getInvoiceByOrderID(ctx context.Context, orderID string) (*invoiceRecord, error) {
	const query = `
select order_id::text, invoice_number, currency, subtotal_amount, shipping_amount, tax_amount, total_amount, pdf_path, pdf_sha256
from shop.invoices
where order_id::text = $1
limit 1
`
	var out invoiceRecord
	err := p.pool.QueryRow(ctx, query, orderID).Scan(
		&out.OrderID,
		&out.InvoiceNumber,
		&out.Currency,
		&out.Subtotal,
		&out.Shipping,
		&out.Tax,
		&out.Total,
		&out.PDFPath,
		&out.PDFSHA256,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (p *Processor) insertInvoice(ctx context.Context, order *orderAggregate, pdfPath, pdfSHA256 string) (*invoiceRecord, error) {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	year := time.Now().UTC().Year()
	number, err := nextInvoiceNumber(ctx, tx, year)
	if err != nil {
		return nil, err
	}
	invoiceNumber := fmt.Sprintf("SIM-%d-%06d", year, number)
	itemsJSON, err := json.Marshal(order.Items)
	if err != nil {
		return nil, err
	}
	addressJSON := string(order.ShippingRaw)
	if addressJSON == "" {
		addressJSON = "{}"
	}

	const query = `
insert into shop.invoices (
  order_id, invoice_number, status, issue_date, performance_date,
  currency, subtotal_amount, shipping_amount, tax_amount, total_amount,
  customer_email, customer_name, customer_address, line_items, pdf_path, pdf_sha256
)
values (
  $1::uuid, $2, 'issued', now()::date, now()::date,
  $3, $4, $5, $6, $7,
  $8, $9, $10::jsonb, $11::jsonb, $12, $13
)
returning order_id::text, invoice_number, currency, subtotal_amount, shipping_amount, tax_amount, total_amount, pdf_path, pdf_sha256
`
	var out invoiceRecord
	err = tx.QueryRow(ctx, query,
		order.ID,
		invoiceNumber,
		order.Currency,
		order.SubtotalAmount,
		order.ShippingAmount,
		order.TaxAmount,
		order.TotalAmount,
		order.Email,
		fullNameFromShipping(order.shippingAddressMap()),
		addressJSON,
		string(itemsJSON),
		pdfPath,
		pdfSHA256,
	).Scan(
		&out.OrderID,
		&out.InvoiceNumber,
		&out.Currency,
		&out.Subtotal,
		&out.Shipping,
		&out.Tax,
		&out.Total,
		&out.PDFPath,
		&out.PDFSHA256,
	)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &out, nil
}

func nextInvoiceNumber(ctx context.Context, tx pgx.Tx, year int) (int, error) {
	if _, err := tx.Exec(ctx, `
insert into shop.invoice_sequences (year, next_value)
values ($1, 1)
on conflict (year) do nothing
`, year); err != nil {
		return 0, err
	}

	var next int
	err := tx.QueryRow(ctx, `
update shop.invoice_sequences
set next_value = next_value + 1, updated_at = now()
where year = $1
returning next_value - 1
`, year).Scan(&next)
	return next, err
}
