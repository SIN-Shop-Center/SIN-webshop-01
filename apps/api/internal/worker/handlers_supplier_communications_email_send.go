package worker

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (p *Processor) handleSupplierCommunicationEmailSendRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid supplier communication payload", ErrPermanent)
	}

	communicationID := normalizeUUID(asString(payload["communication_id"]))
	if communicationID == "" {
		return fmt.Errorf("%w: supplier_communication_id_missing", ErrPermanent)
	}

	var supplierID string
	var channel string
	var direction string
	var subject string
	var body string
	var recipient string
	var status string
	var externalID string
	if err := p.pool.QueryRow(ctx, `
select supplier_id::text,
       coalesce(channel, ''),
       coalesce(direction, ''),
       coalesce(subject, ''),
       coalesce(body, ''),
       coalesce(recipient, ''),
       coalesce(status, ''),
       coalesce(external_id, '')
from public.supplier_communications
where id::text = $1
limit 1
`, communicationID).Scan(&supplierID, &channel, &direction, &subject, &body, &recipient, &status, &externalID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("%w: supplier_communication_not_found", ErrPermanent)
		}
		return err
	}

	if strings.ToLower(strings.TrimSpace(channel)) != "email" || strings.ToLower(strings.TrimSpace(direction)) != "outbound" {
		return fmt.Errorf("%w: supplier_communication_not_outbound_email", ErrPermanent)
	}
	if strings.TrimSpace(recipient) == "" {
		return fmt.Errorf("%w: supplier_communication_recipient_missing", ErrPermanent)
	}
	if strings.TrimSpace(body) == "" {
		return fmt.Errorf("%w: supplier_communication_body_missing", ErrPermanent)
	}
	if strings.TrimSpace(externalID) != "" || strings.ToLower(strings.TrimSpace(status)) == "sent" {
		return nil
	}

	_, err = p.pool.Exec(ctx, `
update public.supplier_communications
set status = 'processing',
    updated_at = now()
where id::text = $1
  and coalesce(external_id, '') = ''
  and status <> 'sent'
`, communicationID)
	if err != nil {
		return err
	}

	messageID, err := p.sendMail(ctx, recipient, subject, body, nil)
	if err != nil {
		reason := truncateErr(err)
		_ = p.markSupplierCommunicationFailed(ctx, communicationID, reason)
		_ = p.appendSupplierActivity(ctx, supplierID, "communication.email.failed", "error", "Supplier email send failed", map[string]any{
			"communication_id": communicationID,
			"recipient":        recipient,
			"subject":          subject,
			"error":            reason,
			"failed_at":        time.Now().UTC().Format(time.RFC3339),
		})
		return err
	}

	if err := p.markSupplierCommunicationSent(ctx, communicationID, messageID); err != nil {
		return err
	}
	_ = p.appendSupplierActivity(ctx, supplierID, "communication.email.sent", "info", "Supplier email sent", map[string]any{
		"communication_id": communicationID,
		"recipient":        recipient,
		"subject":          subject,
		"external_id":      messageID,
		"sent_at":          time.Now().UTC().Format(time.RFC3339),
	})
	return nil
}

func (p *Processor) markSupplierCommunicationSent(ctx context.Context, communicationID, externalID string) error {
	_, err := p.pool.Exec(ctx, `
update public.supplier_communications
set status = 'sent',
    external_id = $2,
    metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{provider}', to_jsonb('gmail'::text), true),
    updated_at = now()
where id::text = $1
`, communicationID, externalID)
	return err
}

func (p *Processor) markSupplierCommunicationFailed(ctx context.Context, communicationID, reason string) error {
	_, err := p.pool.Exec(ctx, `
update public.supplier_communications
set status = 'failed',
    metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{last_error}', to_jsonb($2::text), true),
    updated_at = now()
where id::text = $1
`, communicationID, reason)
	return err
}
