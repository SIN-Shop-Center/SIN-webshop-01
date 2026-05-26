package worker

import "context"

func (p *Processor) acquireEmailSlot(ctx context.Context, orderID, recipient, emailType, subject string) (string, bool, error) {
	const query = `
insert into shop.email_log (order_id, recipient, email_type, subject, status, provider_message_id, last_error)
values ($1::uuid, $2, $3, $4, 'processing', null, null)
on conflict (order_id, email_type)
do update set
  recipient = excluded.recipient,
  subject = excluded.subject,
  status = case when shop.email_log.status = 'sent' then shop.email_log.status else 'processing' end,
  last_error = null,
  updated_at = now()
returning id::text, status
`
	var id string
	var status string
	if err := p.pool.QueryRow(ctx, query, orderID, recipient, emailType, subject).Scan(&id, &status); err != nil {
		return "", false, err
	}
	return id, status == "sent", nil
}

func (p *Processor) markEmailSent(ctx context.Context, logID, messageID string) error {
	_, err := p.pool.Exec(ctx, `
update shop.email_log
set status = 'sent',
    provider_message_id = $2,
    gmail_message_id = $2,
    last_error = null,
    updated_at = now()
where id::text = $1
`, logID, messageID)
	return err
}

func (p *Processor) markEmailFailed(ctx context.Context, logID, reason string) error {
	_, err := p.pool.Exec(ctx, `
update shop.email_log
set status = 'failed',
    last_error = $2,
    updated_at = now()
where id::text = $1
`, logID, reason)
	return err
}

func (p *Processor) markInvoiceEmailed(ctx context.Context, orderID string) error {
	_, err := p.pool.Exec(ctx, `
update shop.invoices
set emailed_at = now(), updated_at = now()
where order_id::text = $1
`, orderID)
	return err
}
