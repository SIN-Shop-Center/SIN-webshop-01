package admin

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListCRMActivities(ctx context.Context, page, limit int, entityType, entityID string) (CRMPage, error) {
	where := []string{"1=1"}
	args := make([]any, 0, 6)
	if value := strings.TrimSpace(entityType); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("entity_type = $%d", len(args)))
	}
	if value := strings.TrimSpace(entityID); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("entity_id = $%d", len(args)))
	}
	whereClause := strings.Join(where, " and ")

	var total int
	if err := s.pool.QueryRow(ctx, "select count(*) from public.crm_activities where "+whereClause, args...).Scan(&total); err != nil {
		return CRMPage{}, err
	}

	args = append(args, limit, (page-1)*limit)
	query := fmt.Sprintf(`
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
  from public.crm_activities
  where %s
  order by created_at desc
  limit $%d offset $%d
) t
`, whereClause, len(args)-1, len(args))
	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return CRMPage{}, err
	}
	return CRMPage{
		Items: items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *Store) CreateCRMActivity(ctx context.Context, body map[string]any, actorID string) (map[string]any, error) {
	entityType := strings.TrimSpace(asString(body["entity_type"]))
	entityID := strings.TrimSpace(asString(body["entity_id"]))
	activityType := strings.TrimSpace(asString(body["activity_type"]))
	message := strings.TrimSpace(asString(body["message"]))
	if entityType == "" || entityID == "" || activityType == "" || message == "" {
		return nil, errInvalidInput
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}

	const query = `
select row_to_json(t)::jsonb
from (
  insert into public.crm_activities (
    entity_type, entity_id, activity_type, severity, actor_type, actor_id, message, metadata
  ) values (
    $1, $2, $3, $4, $5, $6::uuid, $7, coalesce($8::jsonb, '{}'::jsonb)
  )
  returning id::text as id,
            entity_type,
            entity_id,
            activity_type,
            severity,
            actor_type,
            actor_id::text as actor_id,
            message,
            metadata,
            created_at
) t
`
	return queryJSONObject(ctx, s.pool, query,
		entityType,
		entityID,
		activityType,
		defaultString(body["severity"], "info"),
		defaultString(body["actor_type"], "admin"),
		actorParam,
		message,
		body["metadata"],
	)
}
