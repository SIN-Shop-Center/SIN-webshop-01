package worker

import (
	"context"
	"fmt"
)

func (p *Processor) handleAIProviderTest(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid ai provider payload", ErrPermanent)
	}
	_, err = p.pool.Exec(ctx, `
insert into shop.ai_chat_audit (session_id, request_message, response_message, provider, status, metadata, processed_at)
values ($1, 'provider_test', null, coalesce(nullif($2, ''), 'provider_test'), 'processed', $3::jsonb, now())
`, sanitizeIdentifier(asString(payload["session_id"]), job.ID), asString(payload["provider"]), mustJSON(payload))
	return err
}

func (p *Processor) handleAIChatRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid ai chat payload", ErrPermanent)
	}

	sessionID := sanitizeIdentifier(asString(payload["session_id"]), job.ID)
	message := sanitizeIdentifier(asString(payload["message"]), "(empty)")
	response := asString(payload["response"])
	provider := sanitizeIdentifier(asString(payload["provider"]), "local")
	userID := normalizeUUID(asString(payload["user_id"]))

	_, err = p.pool.Exec(ctx, `
insert into shop.ai_chat_audit (
  session_id, user_id, request_message, response_message, provider, status, metadata, processed_at
)
values (
  $1, nullif($2, '')::uuid, $3, nullif($4, ''), $5, 'processed', $6::jsonb, now()
)
`, sessionID, userID, message, response, provider, mustJSON(payload))
	if err != nil {
		return err
	}

	return p.postAutomationEvent(ctx, job.JobType, payload)
}
