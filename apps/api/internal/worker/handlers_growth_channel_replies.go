package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

func (p *Processor) handleChannelCommunityReplyRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid channel community reply payload", ErrPermanent)
	}

	taskID := sanitizeIdentifier(asString(payload["task_id"]), job.ID)
	channel := strings.TrimSpace(asString(payload["channel"]))
	replyText := strings.TrimSpace(asString(payload["reply_text"]))
	if taskID == "" || channel == "" || replyText == "" {
		return fmt.Errorf("%w: channel community reply missing task, channel or reply", ErrPermanent)
	}

	account, err := p.loadConnectedChannelAccount(ctx, channel)
	if err != nil {
		return err
	}

	dispatchMode := "automation_bridge"
	resultPayload := map[string]any{
		"task_id":       taskID,
		"channel":       channel,
		"reply_text":    replyText,
		"processed_at":  time.Now().UTC().Format(time.RFC3339),
		"dispatch_mode": dispatchMode,
	}

	if channel == "tiktok" && p.shouldUseTikTokBrowserRuntime(channel, account.AuthSnapshot) {
		browserPayload := map[string]any{
			"browser_session_ref": asString(account.AuthSnapshot["browser_session_ref"]),
			"target_url": firstNonEmptyWorker(
				asString(payload["source_url"]),
				asString(asMap(payload["source_payload"])["source_url"]),
				asString(asMap(payload["source_payload"])["url"]),
				asString(asMap(payload["source_payload"])["permalink"]),
				asString(account.AuthSnapshot["browser_reply_target_url"]),
			),
			"candidate_urls": firstNonEmptySlice(
				workerStringSlice(payload["candidate_urls"]),
				workerStringSlice(asMap(payload["source_payload"])["candidate_urls"]),
				workerStringSlice(account.AuthSnapshot["browser_reply_candidate_urls"]),
			),
			"browser_recipe": firstNonEmptyMap(
				asMap(payload["browser_recipe"]),
				asMap(account.AuthSnapshot["community_reply_browser_recipe"]),
			),
			"request_payload":  payload,
			"reply_text":       replyText,
			"comment_id":       asString(payload["comment_id"]),
			"conversation_key": asString(payload["conversation_key"]),
			"post_id":          asString(payload["post_id"]),
			"author_handle":    asString(payload["author_handle"]),
		}
		replyResult, browserErr := p.dispatchTikTokBrowserAction(ctx, "/api/automation/tiktok-shop/community-reply", browserPayload)
		if browserErr == nil {
			dispatchMode = "browser_runner"
			resultPayload["dispatch_mode"] = dispatchMode
			resultPayload["provider_result"] = replyResult
			if asBool(payload["mark_done"], true) {
				_ = p.setCRMTaskStatus(ctx, taskID, "done")
			}
			_ = p.appendCRMActivity(ctx, "channel", channel, "channel.reply.dispatched", "info", "automation", "Community-Antwort wurde über den TikTok Browser-Runner ausgeliefert.", resultPayload)
			_ = p.appendCRMNote(ctx, "channel", channel, "Antwort versendet\n"+replyText, map[string]any{
				"task_id":         taskID,
				"dispatch_mode":   dispatchMode,
				"provider_result": replyResult,
			})
			return nil
		}
	}

	endpoint := resolveChannelCommunityReplyEndpoint(channel, account.AuthSnapshot)
	if endpoint != "" {
		dispatchMode = "direct_endpoint"
		resultPayload["dispatch_mode"] = dispatchMode
		resultPayload["endpoint"] = endpoint
		replyResult, err := p.dispatchChannelCommunityReply(ctx, endpoint, account.AuthSnapshot, payload)
		if err != nil {
			_ = p.setCRMTaskStatus(ctx, taskID, "blocked")
			_ = p.appendCRMActivity(ctx, "channel", channel, "channel.reply.dispatch_failed", "error", "automation", "Community-Antwort konnte nicht ausgeliefert werden.", map[string]any{
				"task_id":        taskID,
				"channel":        channel,
				"reply_text":     replyText,
				"dispatch_mode":  dispatchMode,
				"dispatch_error": truncateErr(err),
			})
			return err
		}
		resultPayload["provider_result"] = replyResult
		if asBool(payload["mark_done"], true) {
			_ = p.setCRMTaskStatus(ctx, taskID, "done")
		}
		_ = p.appendCRMActivity(ctx, "channel", channel, "channel.reply.dispatched", "info", "automation", "Community-Antwort wurde ausgeliefert.", resultPayload)
		_ = p.appendCRMNote(ctx, "channel", channel, "Antwort versendet\n"+replyText, map[string]any{
			"task_id":         taskID,
			"dispatch_mode":   dispatchMode,
			"provider_result": replyResult,
		})
		return nil
	}

	if err := p.postAutomationEvent(ctx, "channel.community.reply.requested", payload); err != nil {
		_ = p.setCRMTaskStatus(ctx, taskID, "blocked")
		_ = p.appendCRMActivity(ctx, "channel", channel, "channel.reply.bridge_failed", "error", "automation", "Community-Antwort konnte nicht an die Automation-Bridge gesendet werden.", map[string]any{
			"task_id":        taskID,
			"channel":        channel,
			"reply_text":     replyText,
			"dispatch_mode":  dispatchMode,
			"dispatch_error": truncateErr(err),
		})
		return err
	}

	_ = p.setCRMTaskStatus(ctx, taskID, "in_progress")
	_ = p.appendCRMActivity(ctx, "channel", channel, "channel.reply.bridge_requested", "info", "automation", "Community-Antwort an Automation-Bridge weitergegeben.", resultPayload)
	_ = p.appendCRMNote(ctx, "channel", channel, "Antwortversand angefordert\n"+replyText, map[string]any{
		"task_id":       taskID,
		"dispatch_mode": dispatchMode,
	})
	return nil
}

func (p *Processor) dispatchChannelCommunityReply(ctx context.Context, endpoint string, auth map[string]any, payload map[string]any) (map[string]any, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if token := extractChannelAccessToken(auth); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*512))
	response := map[string]any{}
	_ = json.Unmarshal(raw, &response)
	if len(response) == 0 && strings.TrimSpace(string(raw)) != "" {
		response["raw_body"] = string(raw)
	}
	response["status_code"] = resp.StatusCode
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != 429 {
			return nil, fmt.Errorf("%w: channel_reply_non_2xx:%d", ErrPermanent, resp.StatusCode)
		}
		return nil, fmt.Errorf("channel_reply_non_2xx:%d", resp.StatusCode)
	}
	return response, nil
}

func resolveChannelCommunityReplyEndpoint(channel string, auth map[string]any) string {
	candidates := []string{
		asString(auth["community_reply_endpoint"]),
		asString(auth["message_reply_endpoint"]),
		asString(auth["comment_reply_endpoint"]),
	}
	if channel == "tiktok" {
		candidates = append(candidates, asString(auth["tiktok_reply_endpoint"]))
	}
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate != "" {
			return candidate
		}
	}
	return ""
}

func (p *Processor) setCRMTaskStatus(ctx context.Context, taskID, status string) error {
	_, err := p.pool.Exec(ctx, `
update public.crm_tasks
set status = $2,
    updated_at = now()
where id::text = $1
`, taskID, status)
	return err
}

func (p *Processor) appendCRMActivity(ctx context.Context, entityType, entityID, activityType, severity, actorType, message string, metadata map[string]any) error {
	_, err := p.pool.Exec(ctx, `
insert into public.crm_activities (entity_type, entity_id, activity_type, severity, actor_type, message, metadata)
values ($1, $2, $3, $4, $5, $6, $7::jsonb)
`, entityType, entityID, activityType, severity, actorType, message, mustJSON(metadata))
	return err
}

func (p *Processor) appendCRMNote(ctx context.Context, entityType, entityID, note string, metadata map[string]any) error {
	_, err := p.pool.Exec(ctx, `
insert into public.crm_notes (entity_type, entity_id, note, visibility, metadata)
values ($1, $2, $3, 'internal', $4::jsonb)
`, entityType, entityID, note, mustJSON(metadata))
	return err
}
