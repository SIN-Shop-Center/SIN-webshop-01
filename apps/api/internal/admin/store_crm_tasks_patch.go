package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

func (s *Store) PatchCRMTask(ctx context.Context, id string, body map[string]any) (map[string]any, error) {
	setParts := make([]string, 0, 8)
	args := make([]any, 0, 10)

	appendField := func(column string, value any) {
		args = append(args, value)
		setParts = append(setParts, fmt.Sprintf("%s = $%d", column, len(args)))
	}

	if value, ok := body["title"]; ok {
		appendField("title", asString(value))
	}
	if value, ok := body["description"]; ok {
		appendField("description", asNullableString(value))
	}
	if value, ok := body["status"]; ok {
		appendField("status", asString(value))
	}
	if value, ok := body["priority"]; ok {
		appendField("priority", asString(value))
	}
	if value, ok := body["owner_id"]; ok {
		ownerID := validUUIDOrEmpty(asString(value))
		if ownerID == "" {
			appendField("owner_id", nil)
		} else {
			appendField("owner_id", ownerID)
		}
	}
	if value, ok := body["due_at"]; ok {
		if strings.TrimSpace(asString(value)) == "" {
			appendField("due_at", nil)
		} else {
			appendField("due_at", asString(value))
		}
	}
	if value, ok := body["metadata"]; ok {
		blob, err := json.Marshal(value)
		if err != nil {
			return nil, err
		}
		appendField("metadata", string(blob))
		setParts[len(setParts)-1] = fmt.Sprintf("metadata = coalesce(metadata, '{}'::jsonb) || $%d::jsonb", len(args))
	}

	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}
	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)

	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  update shop.crm_tasks
  set %s
  where id::text = $%d
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
`, strings.Join(setParts, ",\n      "), len(args))
	return queryJSONObject(ctx, s.pool, query, args...)
}
