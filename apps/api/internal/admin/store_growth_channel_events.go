package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

func (s *Store) IngestChannelEvents(ctx context.Context, channel string, items []map[string]any) (ChannelEventsIngestResult, error) {
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 || len(items) == 0 {
		return ChannelEventsIngestResult{}, errInvalidInput
	}
	channel = normalized[0]
	result := ChannelEventsIngestResult{Channel: channel, Received: len(items), At: time.Now().UTC()}

	for _, item := range items {
		inserted, projected, err := s.insertChannelEvent(ctx, channel, item)
		if err != nil {
			return ChannelEventsIngestResult{}, err
		}
		if inserted {
			result.Inserted++
		} else {
			result.Duplicates++
		}
		if projected {
			result.Projected++
		} else {
			result.ProjectionErrors++
		}
	}
	return result, nil
}

func (s *Store) insertChannelEvent(ctx context.Context, channel string, item map[string]any) (bool, bool, error) {
	eventID := asString(item["event_id"])
	if eventID == "" {
		eventID = asString(item["id"])
	}
	if eventID == "" {
		return false, false, errInvalidInput
	}
	payload, err := json.Marshal(item)
	if err != nil {
		return false, false, err
	}

	const rawInsert = `
insert into shop.channel_events_raw (channel, event_id, payload, status)
values ($1, $2, $3::jsonb, 'ingested')
on conflict (event_id) do nothing
`
	inserted, err := s.pool.Exec(ctx, rawInsert, channel, eventID, string(payload))
	if err != nil {
		return false, false, err
	}
	if inserted.RowsAffected() == 0 {
		projected, err := s.retryChannelEventProjection(ctx, channel, eventID, item)
		return false, projected, err
	}

	if err := s.insertAttributionTouchpoint(ctx, channel, eventID, item); err != nil {
		return false, false, err
	}
	projected, err := s.projectChannelEvent(ctx, channel, eventID, item)
	return true, projected, err
}

func (s *Store) retryChannelEventProjection(ctx context.Context, channel, eventID string, item map[string]any) (bool, error) {
	const statusQuery = `
select status
from shop.channel_events_raw
where event_id = $1
limit 1
`
	var status string
	if err := s.pool.QueryRow(ctx, statusQuery, eventID).Scan(&status); err != nil {
		return false, err
	}
	status = strings.ToLower(strings.TrimSpace(status))
	if status != "ingested" && status != "error" {
		return true, nil
	}
	return s.projectChannelEvent(ctx, channel, eventID, item)
}

func (s *Store) insertAttributionTouchpoint(ctx context.Context, channel, eventID string, item map[string]any) error {
	orderID := validUUIDOrEmpty(asString(item["order_id"]))
	campaignID := validUUIDOrEmpty(asString(item["campaign_id"]))
	sessionID := asString(item["session_id"])
	if orderID == "" && campaignID == "" && sessionID == "" {
		return nil
	}
	touchType := asString(item["touch_type"])
	if touchType == "" {
		touchType = "click"
	}
	touchedAt := asString(item["touched_at"])
	if touchedAt == "" {
		touchedAt = time.Now().UTC().Format(time.RFC3339)
	}
	meta, err := json.Marshal(asMap(item["metadata"]))
	if err != nil {
		return err
	}

	const touchInsert = `
insert into shop.attribution_touchpoints (
  order_id, session_id, channel, campaign_id, touch_type, touched_at, dedupe_key, metadata
)
values (
  nullif($1, '')::uuid,
  nullif($2, ''),
  $3,
  nullif($4, '')::uuid,
  $5,
  $6::timestamptz,
  $7,
  $8::jsonb
)
on conflict (dedupe_key) do nothing
`
	_, err = s.pool.Exec(ctx, touchInsert, orderID, sessionID, channel, campaignID, touchType, touchedAt, eventID, string(meta))
	return err
}

func (s *Store) projectChannelEvent(ctx context.Context, channel, eventID string, item map[string]any) (bool, error) {
	if err := s.ensureChannelCommunityProjection(ctx, channel, eventID, item); err != nil {
		_ = s.markChannelEventProjectionState(ctx, eventID, "error", truncateChannelProjectionError(err))
		return false, nil
	}
	if err := s.markChannelEventProjectionState(ctx, eventID, "projected", ""); err != nil {
		return false, err
	}
	return true, nil
}

func (s *Store) ensureChannelCommunityProjection(ctx context.Context, channel, eventID string, item map[string]any) error {
	eventType := normalizeChannelEventType(item)
	text := normalizeChannelEventText(item)
	conversationKey := normalizeChannelConversationKey(eventID, item)
	authorHandle := normalizeChannelAuthorHandle(item)
	authorName := normalizeChannelAuthorName(item)
	actorLabel := authorHandle
	if actorLabel == "" {
		actorLabel = authorName
	}
	if actorLabel == "" {
		actorLabel = "Unbekannt"
	}
	occurredAt := normalizeChannelOccurredAt(item)
	requiresResponse := normalizeChannelRequiresResponse(eventType, text, item)
	priority := normalizeChannelTaskPriority(eventType, text, item)
	severity := normalizeChannelActivitySeverity(eventType, text, item)
	postID := normalizeChannelPostID(item)
	productRef := normalizeChannelProductRef(item)

	metadata := map[string]any{
		"channel":            channel,
		"event_id":           eventID,
		"event_type":         eventType,
		"conversation_key":   conversationKey,
		"author_handle":      authorHandle,
		"author_name":        authorName,
		"author_id":          normalizeChannelAuthorID(item),
		"post_id":            postID,
		"product_ref":        productRef,
		"requires_response":  requiresResponse,
		"occurred_at":        occurredAt,
		"text_preview":       truncateChannelPreview(text, 280),
		"source_payload":     item,
		"priority_hint":      priority,
		"community_channel":  channel,
		"community_platform": channel,
	}

	if _, err := s.CreateCRMActivity(ctx, map[string]any{
		"entity_type":   "channel",
		"entity_id":     channel,
		"activity_type": buildChannelActivityType(eventType),
		"severity":      severity,
		"actor_type":    "automation",
		"message":       buildChannelActivityMessage(channel, actorLabel, eventType, text),
		"metadata":      metadata,
	}, ""); err != nil {
		return err
	}

	if text != "" {
		if _, err := s.CreateCRMNote(ctx, map[string]any{
			"entity_type": "channel",
			"entity_id":   channel,
			"note":        text,
			"visibility":  "internal",
			"metadata":    metadata,
		}, ""); err != nil {
			return err
		}
	}

	if !requiresResponse {
		return nil
	}
	_, err := s.ensureChannelCommunityTask(ctx, channel, conversationKey, buildChannelTaskPayload(channel, eventType, actorLabel, text, occurredAt, priority, metadata))
	return err
}

func (s *Store) ensureChannelCommunityTask(ctx context.Context, channel, conversationKey string, payload map[string]any) (map[string]any, error) {
	const existingTaskQuery = `
select id::text
from shop.crm_tasks
where entity_type = 'channel'
  and entity_id = $1
  and source = 'community_worker'
  and status = any($2::text[])
  and coalesce(metadata->>'conversation_key', '') = $3
order by updated_at desc
limit 1
`
	statuses := []string{"open", "in_progress", "blocked"}
	var existingID string
	err := s.pool.QueryRow(ctx, existingTaskQuery, channel, statuses, conversationKey).Scan(&existingID)
	if err == nil {
		return s.PatchCRMTask(ctx, existingID, map[string]any{
			"title":       payload["title"],
			"description": payload["description"],
			"priority":    payload["priority"],
			"status":      defaultString(payload["status"], "open"),
			"metadata":    payload["metadata"],
		})
	}
	if !notFound(err) {
		return nil, err
	}
	return s.CreateCRMTask(ctx, map[string]any{
		"entity_type": "channel",
		"entity_id":   channel,
		"title":       payload["title"],
		"description": payload["description"],
		"status":      defaultString(payload["status"], "open"),
		"priority":    payload["priority"],
		"source":      "community_worker",
		"metadata":    payload["metadata"],
	}, "")
}

func buildChannelTaskPayload(channel, eventType, actorLabel, text, occurredAt, priority string, metadata map[string]any) map[string]any {
	description := fmt.Sprintf("Inbound %s von %s auf %s. Eingegangen: %s.", displayChannelEventType(eventType), actorLabel, strings.ToUpper(channel), occurredAt)
	if strings.TrimSpace(text) != "" {
		description += " Inhalt: " + truncateChannelPreview(text, 360)
	}
	return map[string]any{
		"title":       buildChannelTaskTitle(channel, eventType),
		"description": description,
		"status":      "open",
		"priority":    priority,
		"metadata":    metadata,
	}
}

func buildChannelTaskTitle(channel, eventType string) string {
	eventType = strings.ToLower(strings.TrimSpace(eventType))
	switch {
	case strings.Contains(eventType, "message"), strings.Contains(eventType, "dm"), strings.Contains(eventType, "inbox"):
		return strings.ToUpper(channel) + " Direktnachricht beantworten"
	case strings.Contains(eventType, "comment"), strings.Contains(eventType, "reply"):
		return strings.ToUpper(channel) + " Kommentar beantworten"
	case strings.Contains(eventType, "mention"), strings.Contains(eventType, "tag"):
		return strings.ToUpper(channel) + " Erwähnung prüfen"
	default:
		return strings.ToUpper(channel) + " Community-Anfrage prüfen"
	}
}

func buildChannelActivityType(eventType string) string {
	eventType = strings.Trim(strings.ToLower(strings.TrimSpace(eventType)), "_-. ")
	if eventType == "" {
		return "channel.event.received"
	}
	return "channel.event." + strings.ReplaceAll(eventType, " ", "_")
}

func buildChannelActivityMessage(channel, actorLabel, eventType, text string) string {
	base := fmt.Sprintf("%s Event von %s", strings.ToUpper(channel), actorLabel)
	if label := displayChannelEventType(eventType); label != "" {
		base += ": " + label
	}
	if strings.TrimSpace(text) == "" {
		return base
	}
	return base + " - " + truncateChannelPreview(text, 180)
}

func displayChannelEventType(eventType string) string {
	value := strings.TrimSpace(eventType)
	if value == "" {
		return "Event"
	}
	value = strings.NewReplacer("_", " ", "-", " ", ".", " ").Replace(value)
	value = strings.TrimSpace(value)
	if value == "" {
		return "Event"
	}
	return strings.ToUpper(value[:1]) + value[1:]
}

func (s *Store) markChannelEventProjectionState(ctx context.Context, eventID, status, lastError string) error {
	const query = `
update shop.channel_events_raw
set status = $2,
    processed_at = now(),
    last_error = nullif($3, ''),
    payload = payload
where event_id = $1
`
	_, err := s.pool.Exec(ctx, query, eventID, status, lastError)
	return err
}

func normalizeChannelEventType(item map[string]any) string {
	return firstNonEmpty(
		asString(item["event_type"]),
		asString(item["type"]),
		asString(item["kind"]),
		asString(item["topic"]),
		asString(item["activity_type"]),
	)
}

func normalizeChannelEventText(item map[string]any) string {
	return firstNonEmpty(
		asString(item["text"]),
		asString(item["message"]),
		asString(item["body"]),
		asString(item["comment"]),
		asString(item["content"]),
		asString(item["caption"]),
	)
}

func normalizeChannelConversationKey(eventID string, item map[string]any) string {
	return firstNonEmpty(
		asString(item["conversation_id"]),
		asString(item["thread_id"]),
		asString(item["message_thread_id"]),
		asString(item["comment_id"]),
		asString(item["message_id"]),
		asString(item["reply_to_id"]),
		eventID,
	)
}

func normalizeChannelAuthorHandle(item map[string]any) string {
	return firstNonEmpty(
		asString(item["author_handle"]),
		asString(item["author_username"]),
		asString(item["user_handle"]),
		asString(item["username"]),
		asString(item["handle"]),
	)
}

func normalizeChannelAuthorName(item map[string]any) string {
	return firstNonEmpty(
		asString(item["author_name"]),
		asString(item["user_name"]),
		asString(item["display_name"]),
		asString(item["name"]),
	)
}

func normalizeChannelAuthorID(item map[string]any) string {
	return firstNonEmpty(
		asString(item["author_id"]),
		asString(item["user_id"]),
		asString(item["sender_id"]),
	)
}

func normalizeChannelOccurredAt(item map[string]any) string {
	return firstNonEmpty(
		asString(item["occurred_at"]),
		asString(item["event_at"]),
		asString(item["created_at"]),
		asString(item["published_at"]),
		time.Now().UTC().Format(time.RFC3339),
	)
}

func normalizeChannelPostID(item map[string]any) string {
	return firstNonEmpty(
		asString(item["post_id"]),
		asString(item["video_id"]),
		asString(item["content_id"]),
		asString(item["media_id"]),
	)
}

func normalizeChannelProductRef(item map[string]any) string {
	return firstNonEmpty(
		asString(item["product_id"]),
		asString(item["sku"]),
		asString(item["offer_id"]),
	)
}

func normalizeChannelRequiresResponse(eventType, text string, item map[string]any) bool {
	if flag, ok := item["requires_response"].(bool); ok {
		return flag
	}
	loweredType := strings.ToLower(strings.TrimSpace(eventType))
	if strings.Contains(loweredType, "message") || strings.Contains(loweredType, "comment") || strings.Contains(loweredType, "reply") || strings.Contains(loweredType, "mention") || strings.Contains(loweredType, "dm") {
		return true
	}
	loweredText := strings.ToLower(strings.TrimSpace(text))
	return strings.Contains(loweredText, "?")
}

func normalizeChannelTaskPriority(eventType, text string, item map[string]any) string {
	if raw := strings.ToLower(strings.TrimSpace(asString(item["priority"]))); raw != "" {
		switch raw {
		case "low", "medium", "high", "urgent":
			return raw
		}
	}
	lowered := strings.ToLower(eventType + " " + text)
	switch {
	case strings.Contains(lowered, "refund"), strings.Contains(lowered, "betrug"), strings.Contains(lowered, "scam"), strings.Contains(lowered, "chargeback"):
		return "urgent"
	case strings.Contains(lowered, "kaputt"), strings.Contains(lowered, "defekt"), strings.Contains(lowered, "problem"), strings.Contains(lowered, "late"), strings.Contains(lowered, "support"), strings.Contains(lowered, "cancel"):
		return "high"
	case strings.Contains(strings.ToLower(eventType), "message"), strings.Contains(strings.ToLower(eventType), "dm"):
		return "high"
	default:
		return "medium"
	}
}

func normalizeChannelActivitySeverity(eventType, text string, item map[string]any) string {
	if raw := strings.ToLower(strings.TrimSpace(asString(item["severity"]))); raw != "" {
		switch raw {
		case "info", "warning", "error", "critical":
			return raw
		}
	}
	lowered := strings.ToLower(eventType + " " + text)
	switch {
	case strings.Contains(lowered, "refund"), strings.Contains(lowered, "fraud"), strings.Contains(lowered, "chargeback"):
		return "critical"
	case strings.Contains(lowered, "problem"), strings.Contains(lowered, "defekt"), strings.Contains(lowered, "late"), strings.Contains(lowered, "cancel"), strings.Contains(lowered, "complaint"):
		return "warning"
	default:
		return "info"
	}
}

func truncateChannelPreview(value string, limit int) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= limit || limit <= 0 {
		return trimmed
	}
	return strings.TrimSpace(trimmed[:limit-1]) + "…"
}

func truncateChannelProjectionError(err error) string {
	if err == nil {
		return ""
	}
	message := strings.TrimSpace(err.Error())
	if len(message) <= 500 {
		return message
	}
	return message[:500]
}
