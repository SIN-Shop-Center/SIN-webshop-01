package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

type auditExecer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type AuditLogPage struct {
	Items []map[string]any
	Total int
	Page  int
	Limit int
}

func (s *Store) ListSupplierAuditLog(ctx context.Context, supplierID string, page, limit int) (AuditLogPage, error) {
	var total int
	if err := s.pool.QueryRow(ctx, `select count(*) from shop.audit_log where supplier_id::text = $1`, supplierID).Scan(&total); err != nil {
		return AuditLogPage{}, err
	}

	query := `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         supplier_id::text as supplier_id,
         coalesce(actor_id::text, '') as actor_id,
         coalesce(actor_role, '') as actor_role,
         coalesce(request_id, '') as request_id,
         action,
         entity_type,
         coalesce(entity_id, '') as entity_id,
         before,
         after,
         metadata,
         created_at
  from shop.audit_log
  where supplier_id::text = $1
  order by created_at desc
  limit $2 offset $3
) t
`
	items, err := queryJSONRows(ctx, s.pool, query, supplierID, limit, (page-1)*limit)
	if err != nil {
		return AuditLogPage{}, err
	}

	return AuditLogPage{Items: items, Total: total, Page: page, Limit: limit}, nil
}

func (s *Store) insertAuditLog(
	ctx context.Context,
	db auditExecer,
	supplierID, action, entityType, entityID string,
	before any,
	after any,
	actorID, actorRole, requestID string,
	metadata map[string]any,
) error {
	beforeJSON, err := marshalAuditJSON(before)
	if err != nil {
		return err
	}
	afterJSON, err := marshalAuditJSON(after)
	if err != nil {
		return err
	}
	metaJSON, err := marshalAuditJSON(metadata)
	if err != nil {
		return err
	}
	if metaJSON == nil {
		metaJSON = "{}"
	}

	_, err = db.Exec(ctx, `
insert into shop.audit_log (
  supplier_id,
  actor_id,
  actor_role,
  request_id,
  action,
  entity_type,
  entity_id,
  before,
  after,
  metadata
) values (
  $1::uuid,
  nullif($2, '')::uuid,
  nullif($3, ''),
  nullif($4, ''),
  $5,
  $6,
  nullif($7, ''),
  $8::jsonb,
  $9::jsonb,
  coalesce($10::jsonb, '{}'::jsonb)
)
`, supplierID, strings.TrimSpace(actorID), strings.TrimSpace(actorRole), strings.TrimSpace(requestID), action, entityType, strings.TrimSpace(entityID), beforeJSON, afterJSON, metaJSON)
	return err
}

func marshalAuditJSON(value any) (any, error) {
	if value == nil {
		return nil, nil
	}
	blob, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	trimmed := strings.TrimSpace(string(blob))
	if trimmed == "" || trimmed == "null" {
		return nil, nil
	}
	return trimmed, nil
}

func auditAction(entityType, verb string) string {
	entityType = strings.TrimSpace(entityType)
	verb = strings.TrimSpace(verb)
	if entityType == "" {
		entityType = "entity"
	}
	if verb == "" {
		verb = "updated"
	}
	return fmt.Sprintf("%s.%s", entityType, verb)
}
