package worker

import (
	"context"
	"fmt"
	"os"
)

func (p *Processor) ensureInvoice(ctx context.Context, order *orderAggregate) (*invoiceRecord, error) {
	existing, err := p.getInvoiceByOrderID(ctx, order.ID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

	prefix := order.ID
	if len(prefix) > 8 {
		prefix = prefix[:8]
	}
	nextNumberPreview := fmt.Sprintf("SIM-%d-%s-preview", order.CreatedAt.UTC().Year(), prefix)
	pdf := buildInvoicePDF(order, nextNumberPreview, p.options)
	pdfPath, pdfSHA, err := writeInvoicePDF(p.options.InvoiceOutputDir, nextNumberPreview, pdf)
	if err != nil {
		return nil, err
	}

	created, err := p.insertInvoice(ctx, order, pdfPath, pdfSHA)
	if err != nil {
		_ = os.Remove(pdfPath)
		if isUniqueViolation(err) {
			return p.getInvoiceByOrderID(ctx, order.ID)
		}
		return nil, err
	}

	realPDF := buildInvoicePDF(order, created.InvoiceNumber, p.options)
	realPath, realSHA, err := writeInvoicePDF(p.options.InvoiceOutputDir, created.InvoiceNumber, realPDF)
	if err != nil {
		return nil, err
	}
	if realPath != pdfPath {
		_ = os.Remove(pdfPath)
	}

	_, err = p.pool.Exec(ctx, `
update shop.invoices
set pdf_path = $2, pdf_sha256 = $3, updated_at = now()
where order_id::text = $1
`, order.ID, realPath, realSHA)
	if err != nil {
		return nil, err
	}

	created.PDFPath = realPath
	created.PDFSHA256 = realSHA
	return created, nil
}

func (p *Processor) sendOrderConfirmationEmail(ctx context.Context, order *orderAggregate, invoice *invoiceRecord) error {
	subject, body := buildOrderConfirmationEmail(order, invoice)
	logID, alreadySent, err := p.acquireEmailSlot(ctx, order.ID, order.Email, "order_confirmation", subject)
	if err != nil || alreadySent {
		return err
	}

	messageID, sendErr := p.sendMail(ctx, order.Email, subject, body, nil)
	if sendErr != nil {
		_ = p.markEmailFailed(ctx, logID, sendErr.Error())
		return sendErr
	}
	return p.markEmailSent(ctx, logID, messageID)
}

func (p *Processor) sendInvoiceEmail(ctx context.Context, order *orderAggregate, invoice *invoiceRecord) error {
	subject, body := buildInvoiceEmail(order, invoice)
	logID, alreadySent, err := p.acquireEmailSlot(ctx, order.ID, order.Email, "invoice", subject)
	if err != nil || alreadySent {
		return err
	}

	pdfBytes, err := os.ReadFile(invoice.PDFPath)
	if err != nil {
		_ = p.markEmailFailed(ctx, logID, err.Error())
		return err
	}

	messageID, sendErr := p.sendMail(ctx, order.Email, subject, body, []mailAttachment{
		{
			Filename:    invoice.InvoiceNumber + ".pdf",
			ContentType: "application/pdf",
			Data:        pdfBytes,
		},
	})
	if sendErr != nil {
		_ = p.markEmailFailed(ctx, logID, sendErr.Error())
		return sendErr
	}

	if err := p.markEmailSent(ctx, logID, messageID); err != nil {
		return err
	}
	return p.markInvoiceEmailed(ctx, order.ID)
}
