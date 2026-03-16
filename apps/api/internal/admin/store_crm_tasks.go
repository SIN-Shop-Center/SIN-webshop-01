package admin

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListCRMTasks(ctx context.Context, page, limit int, entityType, entityID, status, ownerID string) (CRMPage, error) {
	where := []string{"1=1"}
	args := make([]any, 0, 8)

	if value := strings.TrimSpace(entityType); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("entity_type = $%d", len(args)))
	}
	if value := strings.TrimSpace(entityID); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("entity_id = $%d", len(args)))
	}
	if value := strings.TrimSpace(status); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	}
	if value := validUUIDOrEmpty(ownerID); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("owner_id::text = $%d", len(args)))
	}

	whereClause := strings.Join(where, " and ")
	var total int
	if err := s.pool.QueryRow(ctx, "select count(*) from public.crm_tasks where "+whereClause, args...).Scan(&total); err != nil {
		return CRMPage{}, err
	}

	args = append(args, limit, (page-1)*limit)
	query := fmt.Sprintf(`
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
  from public.crm_tasks
  where %s
  order by updated_at desc, created_at desc
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

func (s *Store) CreateCRMTask(ctx context.Context, body map[string]any, actorID string) (map[string]any, error) {
	entityType := strings.TrimSpace(asString(body["entity_type"]))
	entityID := strings.TrimSpace(asString(body["entity_id"]))
	title := strings.TrimSpace(asString(body["title"]))
	if entityType == "" || entityID == "" || title == "" {
		return nil, errInvalidInput
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}
	ownerID := validUUIDOrEmpty(asString(body["owner_id"]))
	var ownerParam any
	if ownerID != "" {
		ownerParam = ownerID
	}

	const query = `
select row_to_json(t)::jsonb
from (
  insert into public.crm_tasks (
    entity_type, entity_id, title, description, status, priority, owner_id, due_at, source, metadata, created_by
  ) values (
    $1, $2, $3, nullif($4, ''), $5, $6, $7::uuid, nullif($8, '')::timestamptz, $9, coalesce($10::jsonb, '{}'::jsonb), $11::uuid
  )
  returning id::text as id,
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
) t
`
	return queryJSONObject(ctx, s.pool, query,
		entityType,
		entityID,
		title,
		asString(body["description"]),
		defaultString(body["status"], "open"),
		defaultString(body["priority"], "medium"),
		ownerParam,
		asString(body["due_at"]),
		defaultString(body["source"], "manual"),
		body["metadata"],
		actorParam,
	)
}
