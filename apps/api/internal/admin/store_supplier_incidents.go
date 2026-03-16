package admin

import (
	"context"
	"fmt"
	"strings"
)

type SupplierIncidentsPage struct {
	Items []map[string]any
	Total int
	Page  int
	Limit int
}

func (s *Store) ListSupplierIncidents(ctx context.Context, supplierID string, page, limit int) (SupplierIncidentsPage, error) {
	var total int
	if err := s.pool.QueryRow(ctx, "select count(*) from public.supplier_incidents where supplier_id::text = $1", supplierID).Scan(&total); err != nil {
		return SupplierIncidentsPage{}, err
	}

	const query = `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         supplier_id::text as supplier_id,
         order_id::text as order_id,
         incident_type,
         severity,
         title,
         description,
         status,
         root_cause,
         corrective_action,
         preventive_action,
         metadata,
         created_by::text as created_by,
         resolved_at,
         resolved_by::text as resolved_by,
         created_at,
         updated_at
  from public.supplier_incidents
  where supplier_id::text = $1
  order by created_at desc
  limit $2 offset $3
) t
`
	items, err := queryJSONRows(ctx, s.pool, query, supplierID, limit, (page-1)*limit)
	if err != nil {
		return SupplierIncidentsPage{}, err
	}

	return SupplierIncidentsPage{Items: items, Total: total, Page: page, Limit: limit}, nil
}

func (s *Store) CreateSupplierIncident(ctx context.Context, supplierID string, body map[string]any, actorID, actorRole, requestID string) (map[string]any, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const query = `
select row_to_json(t)::jsonb
from (
  insert into public.supplier_incidents (
    supplier_id,
    order_id,
    incident_type,
    severity,
    title,
    description,
    metadata,
    created_by
  ) values (
    $1::uuid,
    nullif($2, '')::uuid,
    $3,
    $4,
    $5,
    $6,
    coalesce($7::jsonb, '{}'::jsonb),
    $8::uuid
  )
  returning id::text as id, supplier_id::text as supplier_id, order_id::text as order_id,
            incident_type, severity, title, description, status, metadata, created_at
) t
`
	item, err := queryJSONObject(ctx, tx, query,
		supplierID,
		asNullableString(body["order_id"]),
		asString(body["incident_type"]),
		defaultString(body["severity"], "medium"),
		asString(body["title"]),
		asNullableString(body["description"]),
		body["metadata"],
		validUUIDOrEmpty(actorID),
	)
	if err != nil {
		return nil, err
	}

	if err := s.insertAuditLog(ctx, tx, supplierID, "supplier.incident.created", "supplier_incident", asString(item["id"]), nil, item, actorID, actorRole, requestID, nil); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Store) UpdateSupplierIncident(ctx context.Context, supplierID, incidentID string, body map[string]any, actorID, actorRole, requestID string) (map[string]any, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	before, err := queryJSONObject(ctx, tx, "select row_to_json(t)::jsonb from (select * from public.supplier_incidents where id::text = $1) t", incidentID)
	if err != nil {
		return nil, err
	}

	setParts := make([]string, 0, 8)
	args := []any{incidentID}
	
	appendField := func(col, key string) {
		if v, ok := body[key]; ok {
			args = append(args, v)
			setParts = append(setParts, fmt.Sprintf("%s = $%d", col, len(args)))
		}
	}

	appendField("status", "status")
	appendField("severity", "severity")
	appendField("title", "title")
	appendField("description", "description")
	appendField("root_cause", "root_cause")
	appendField("corrective_action", "corrective_action")
	appendField("preventive_action", "preventive_action")

	if asString(body["status"]) == "resolved" && asString(before["status"]) != "resolved" {
		args = append(args, validUUIDOrEmpty(actorID))
		setParts = append(setParts, fmt.Sprintf("resolved_at = now(), resolved_by = $%d", len(args)))
	}

	if len(setParts) == 0 {
		return before, nil
	}

	setParts = append(setParts, "updated_at = now()")
	query := fmt.Sprintf("update public.supplier_incidents set %s where id::text = $1 returning id::text as id", strings.Join(setParts, ", "))
	
	var outID string
	if err := tx.QueryRow(ctx, query, args...).Scan(&outID); err != nil {
		return nil, err
	}

	after, err := queryJSONObject(ctx, tx, `
select row_to_json(t)::jsonb
from (
  select id::text as id, status, severity, title, description, root_cause, corrective_action, preventive_action, updated_at
  from public.supplier_incidents
  where id::text = $1
) t
`, outID)
	if err != nil {
		return nil, err
	}

	if err := s.insertAuditLog(ctx, tx, supplierID, "supplier.incident.updated", "supplier_incident", incidentID, before, after, actorID, actorRole, requestID, nil); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return after, nil
}
