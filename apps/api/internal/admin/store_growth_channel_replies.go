package admin

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *Store) RequestChannelCommunityReply(ctx context.Context, channel string, body map[string]any, actorID string) (map[string]any, error) {
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 {
		return nil, errInvalidInput
	}
	channel = normalized[0]

	taskID := asString(body["task_id"])
	if taskID == "" {
		return nil, errInvalidInput
	}
	task, err := s.getChannelCommunityTask(ctx, channel, taskID)
	if err != nil {
		return nil, err
	}

	replyText := asString(body["reply_text"])
	if replyText == "" {
		replyText, err = s.getLatestChannelReplyDraft(ctx, channel, taskID)
		if err != nil {
			return nil, err
		}
	}
	if replyText == "" {
		return nil, errInvalidInput
	}

	metadata := asMap(task["metadata"])
	payload := map[string]any{
		"task_id":          taskID,
		"channel":          channel,
		"reply_text":       replyText,
		"conversation_key": asString(metadata["conversation_key"]),
		"event_type":       asString(metadata["event_type"]),
		"author_handle":    asString(metadata["author_handle"]),
		"author_name":      asString(metadata["author_name"]),
		"author_id":        asString(metadata["author_id"]),
		"comment_id":       firstNonEmpty(asString(metadata["comment_id"]), asString(metadata["message_id"])),
		"post_id":          asString(metadata["post_id"]),
		"product_ref":      asString(metadata["product_ref"]),
		"source_payload":   asMap(metadata["source_payload"]),
		"source_url": firstNonEmpty(
			asString(metadata["source_url"]),
			asString(asMap(metadata["source_payload"])["source_url"]),
			asString(asMap(metadata["source_payload"])["url"]),
			asString(asMap(metadata["source_payload"])["permalink"]),
			asString(asMap(metadata["source_payload"])["thread_url"]),
		),
		"requested_at": time.Now().UTC().Format(time.RFC3339),
		"requested_by": actorID,
		"source":       "admin_channels_page",
	}
	if targetURL := asString(body["target_url"]); targetURL != "" {
		payload["target_url"] = targetURL
	}
	if candidateURLs := normalizeStringSliceAny(body["candidate_urls"]); len(candidateURLs) > 0 {
		payload["candidate_urls"] = candidateURLs
	}
	if browserRecipe := asMap(body["browser_recipe"]); len(browserRecipe) > 0 {
		payload["browser_recipe"] = browserRecipe
	}
	if markDone, ok := body["mark_done"].(bool); ok {
		payload["mark_done"] = markDone
	} else {
		payload["mark_done"] = true
	}

	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	_, err = s.pool.Exec(ctx, `
insert into public.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('channel.community.reply.requested', 'channel_reply', $1, $2::jsonb, 'pending')
`, taskID, string(rawPayload))
	if err != nil {
		return nil, err
	}

	if _, err := s.CreateCRMActivity(ctx, map[string]any{
		"entity_type":   "channel",
		"entity_id":     channel,
		"activity_type": "channel.reply.dispatch_requested",
		"severity":      "info",
		"actor_type":    "admin",
		"message":       "Community-Antwort wurde zur Ausspielung angefordert.",
		"metadata":      payload,
	}, actorID); err != nil {
		return nil, err
	}

	if asString(task["status"]) == "open" {
		if _, err := s.PatchCRMTask(ctx, taskID, map[string]any{"status": "in_progress"}); err != nil {
			return nil, err
		}
	}

	return map[string]any{
		"status":   "queued",
		"dispatch": payload,
	}, nil
}

func (s *Store) getChannelCommunityTask(ctx context.Context, channel, taskID string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         status,
         title,
         description,
         metadata,
         updated_at
  from public.crm_tasks
  where id::text = $1
    and entity_type = 'channel'
    and entity_id = $2
  limit 1
) t
`
	return queryJSONObject(ctx, s.pool, query, taskID, channel)
}

func (s *Store) getLatestChannelReplyDraft(ctx context.Context, channel, taskID string) (string, error) {
	const query = `
select note
from public.crm_notes
where entity_type = 'channel'
  and entity_id = $1
  and coalesce(metadata->>'task_id', '') = $2
  and coalesce(metadata->>'draft_type', '') = 'community_reply'
order by created_at desc
limit 1
`
	var note string
	if err := s.pool.QueryRow(ctx, query, channel, taskID).Scan(&note); err != nil {
		if err == pgx.ErrNoRows {
			return "", errInvalidInput
		}
		return "", err
	}
	note = strings.TrimSpace(note)
	note = strings.TrimPrefix(note, "Antwortentwurf\n")
	return strings.TrimSpace(note), nil
}
