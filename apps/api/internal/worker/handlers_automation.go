package worker

import (
	"context"
	"fmt"
	"strings"
	"time"
)

func (p *Processor) handleAutomationRun(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid automation payload", ErrPermanent)
	}

	target := automationTarget(job.JobType, payload)
	var runErr error
	switch target {
	case "trend":
		runErr = p.handleTrendRun(ctx, job, payload)
	case "supplier":
		runErr = p.handleSupplierRun(ctx, job, payload)
	case "social":
		runErr = p.handleSocialRun(ctx, job, payload)
	default:
		return fmt.Errorf("%w: unsupported automation target %s", ErrPermanent, target)
	}
	if runErr != nil {
		return runErr
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) handleTrendRun(ctx context.Context, job Job, payload map[string]any) error {
	title := defaultText(asString(payload["title"]), "Trend report")
	summary := defaultText(asString(payload["summary"]), "Automated trend run")
	score := asFloat(payload["score"])

	_, err := p.pool.Exec(ctx, `
insert into shop.trends (id, source, title, summary, score, metadata, report_date)
values ($1::uuid, 'automation.trend', $2, $3, $4, $5::jsonb, $6)
on conflict (id) do update
set summary = excluded.summary,
    score = excluded.score,
    metadata = excluded.metadata,
    report_date = excluded.report_date
`, job.ID, title, summary, score, string(job.Payload), time.Now().UTC().Format("2006-01-02"))
	return err
}

func (p *Processor) handleSupplierRun(ctx context.Context, job Job, payload map[string]any) error {
	title := defaultText(asString(payload["title"]), "Supplier research")
	summary := defaultText(asString(payload["summary"]), "Automated supplier run")

	_, err := p.pool.Exec(ctx, `
insert into shop.trends (id, source, title, summary, score, metadata, report_date)
values ($1::uuid, 'automation.supplier', $2, $3, null, $4::jsonb, $5)
on conflict (id) do update
set summary = excluded.summary,
    metadata = excluded.metadata,
    report_date = excluded.report_date
`, job.ID, title, summary, string(job.Payload), time.Now().UTC().Format("2006-01-02"))
	return err
}

func (p *Processor) handleSocialRun(ctx context.Context, job Job, payload map[string]any) error {
	channel := strings.ToLower(defaultText(asString(payload["channel"]), "instagram"))
	content := defaultText(asString(payload["content"]), "Automated social draft")

	_, err := p.pool.Exec(ctx, `
insert into shop.social_posts (id, channel, status, content, media_urls, metadata)
values ($1::uuid, $2, 'draft', $3, '{}'::text[], $4::jsonb)
on conflict (id) do update
set channel = excluded.channel,
    content = excluded.content,
    metadata = excluded.metadata,
    updated_at = now()
`, job.ID, channel, content, string(job.Payload))
	return err
}

func automationTarget(jobType string, payload map[string]any) string {
	if target := asString(payload["target"]); target != "" {
		return strings.ToLower(target)
	}
	parts := strings.Split(jobType, ".")
	if len(parts) >= 3 {
		return strings.ToLower(parts[1])
	}
	return ""
}

func defaultText(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func (p *Processor) handleTrendRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid trend payload", ErrPermanent)
	}
	if err := p.handleTrendRun(ctx, job, payload); err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) handleSupplierRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid supplier payload", ErrPermanent)
	}
	if err := p.handleSupplierRun(ctx, job, payload); err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) handleSocialPostRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid social payload", ErrPermanent)
	}
	if err := p.handleSocialRun(ctx, job, payload); err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}
