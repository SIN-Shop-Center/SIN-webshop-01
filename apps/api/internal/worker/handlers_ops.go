package worker

import (
	"context"
	"fmt"
)

func (p *Processor) handleInventoryLow(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid inventory payload", ErrPermanent)
	}
	_, err = p.pool.Exec(ctx, `
insert into shop.support_tickets (email, subject, message, status, priority, metadata)
values ('ops@simone.local', 'Inventory low', 'Automatischer Warnhinweis aus Worker', 'open', 'high', $1::jsonb)
`, mustJSON(payload))
	return err
}

func (p *Processor) handleOpsWeeklyReport(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid report payload", ErrPermanent)
	}
	_, err = p.pool.Exec(ctx, `
insert into shop.trends (id, source, title, summary, metadata, report_date)
values ($1::uuid, 'automation.ops', 'Weekly Ops Report', 'Automatisch erzeugter Ops-Report', $2::jsonb, now()::date)
on conflict (id) do update
set metadata = excluded.metadata,
    report_date = excluded.report_date
`, job.ID, mustJSON(payload))
	if err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}
