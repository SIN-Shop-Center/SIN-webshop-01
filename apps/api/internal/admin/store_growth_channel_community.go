package admin

import (
	"context"
	"encoding/json"
	"strings"
)

func (s *Store) GetChannelCommunityQueue(ctx context.Context, channel string, limit int) (map[string]any, error) {
	normalized := normalizeChannels([]string{channel})
	if len(normalized) == 0 {
		return nil, errInvalidInput
	}
	channel = normalized[0]
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	tasks, err := s.listChannelCommunityTasks(ctx, channel, limit)
	if err != nil {
		return nil, err
	}
	activities, err := s.listChannelCommunityActivities(ctx, channel, limit)
	if err != nil {
		return nil, err
	}
	notes, err := s.listChannelCommunityNotes(ctx, channel, limit)
	if err != nil {
		return nil, err
	}
	events, err := s.listChannelCommunityEvents(ctx, channel, limit)
	if err != nil {
		return nil, err
	}
	summary, err := s.getChannelCommunitySummary(ctx, channel)
	if err != nil {
		return nil, err
	}
	health, err := s.GetChannelHealth(ctx, channel)
	if err != nil && !IsNotFound(err) && err != errNotConnected {
		return nil, err
	}
	if health == nil {
		health = map[string]any{
			"channel":         channel,
			"status":          "disconnected",
			"connection_mode": channelConnectMode(channel),
			"healthy":         false,
		}
	}

	return map[string]any{
		"channel":           channel,
		"health":            health,
		"summary":           summary,
		"open_tasks":        tasks,
		"recent_activities": activities,
		"recent_notes":      notes,
		"recent_events":     events,
	}, nil
}

func (s *Store) listChannelCommunityTasks(ctx context.Context, channel string, limit int) ([]map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         entity_type,
         entity_id,
         title,
         description,
         status,
         priority,
         owner_id::text as owner_id,
         due_at,
         source,
         metadata,
         created_by::text as created_by,
         created_at,
         updated_at
  from shop.crm_tasks
  where entity_type = 'channel'
    and entity_id = $1
    and status = any($2::text[])
  order by
    case priority
      when 'urgent' then 4
      when 'high' then 3
      when 'medium' then 2
      else 1
    end desc,
    updated_at desc
  limit $3
) t
`
	return queryJSONRows(ctx, s.pool, query, channel, []string{"open", "in_progress", "blocked"}, limit)
}

func (s *Store) listChannelCommunityActivities(ctx context.Context, channel string, limit int) ([]map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         entity_type,
         entity_id,
         activity_type,
         severity,
         actor_type,
         actor_id::text as actor_id,
         message,
         metadata,
         created_at
  from shop.crm_activities
  where entity_type = 'channel'
    and entity_id = $1
  order by created_at desc
  limit $2
) t
`
	return queryJSONRows(ctx, s.pool, query, channel, limit)
}

func (s *Store) listChannelCommunityNotes(ctx context.Context, channel string, limit int) ([]map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         entity_type,
         entity_id,
         note,
         visibility,
         author_id::text as author_id,
         metadata,
         created_at,
         updated_at
  from shop.crm_notes
  where entity_type = 'channel'
    and entity_id = $1
  order by created_at desc
  limit $2
) t
`
	return queryJSONRows(ctx, s.pool, query, channel, limit)
}

func (s *Store) listChannelCommunityEvents(ctx context.Context, channel string, limit int) ([]map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         channel,
         event_id,
         status,
         received_at,
         processed_at,
         last_error,
         payload
  from shop.channel_events_raw
  where channel = $1
  order by received_at desc
  limit $2
) t
`
	items, err := queryJSONRows(ctx, s.pool, query, channel, limit)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		payload := asMap(item["payload"])
		item["event_type"] = normalizeChannelEventType(payload)
		item["author_handle"] = normalizeChannelAuthorHandle(payload)
		item["author_name"] = normalizeChannelAuthorName(payload)
		item["text_preview"] = truncateChannelPreview(normalizeChannelEventText(payload), 220)
		item["conversation_key"] = normalizeChannelConversationKey(asString(item["event_id"]), payload)
		item["requires_response"] = normalizeChannelRequiresResponse(asString(item["event_type"]), asString(item["text_preview"]), payload)
	}
	return items, nil
}

func (s *Store) getChannelCommunitySummary(ctx context.Context, channel string) (map[string]any, error) {
	const taskQuery = `
select
  count(*) filter (where status = 'open')::int as open_count,
  count(*) filter (where status = 'in_progress')::int as in_progress_count,
  count(*) filter (where priority = 'urgent' and status = any($2::text[]))::int as urgent_count
from shop.crm_tasks
where entity_type = 'channel'
  and entity_id = $1
`
	summary := map[string]any{
		"open_count":        0,
		"in_progress_count": 0,
		"urgent_count":      0,
		"events_24h":        0,
		"projection_errors": 0,
	}
	var openCount int
	var inProgressCount int
	var urgentCount int
	if err := s.pool.QueryRow(ctx, taskQuery, channel, []string{"open", "in_progress", "blocked"}).Scan(
		&openCount,
		&inProgressCount,
		&urgentCount,
	); err != nil {
		return nil, err
	}
	summary["open_count"] = openCount
	summary["in_progress_count"] = inProgressCount
	summary["urgent_count"] = urgentCount

	const eventsQuery = `
select
  count(*)::int as events_24h,
  count(*) filter (where status = 'error')::int as projection_errors
from shop.channel_events_raw
where channel = $1
  and received_at >= now() - interval '24 hours'
`
	var events24h int
	var projectionErrors int
	if err := s.pool.QueryRow(ctx, eventsQuery, channel).Scan(
		&events24h,
		&projectionErrors,
	); err != nil {
		return nil, err
	}
	summary["events_24h"] = events24h
	summary["projection_errors"] = projectionErrors

	const accountQuery = `
select status, connection_mode, auth_snapshot::text
from shop.channel_accounts
where channel = $1
order by updated_at desc
limit 1
`
	var status string
	var mode string
	var authRaw string
	if err := s.pool.QueryRow(ctx, accountQuery, channel).Scan(&status, &mode, &authRaw); err == nil {
		auth := map[string]any{}
		if strings.TrimSpace(authRaw) != "" {
			_ = json.Unmarshal([]byte(authRaw), &auth)
		}
		summary["account_status"] = status
		summary["connection_mode"] = mode
		summary["shop_id"] = firstNonEmpty(asString(auth["shop_id"]), asString(auth["shop_cipher"]))
		summary["merchant_id"] = firstNonEmpty(asString(auth["merchant_id"]), asString(auth["seller_id"]))
	}

	return summary, nil
}
