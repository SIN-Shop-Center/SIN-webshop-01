package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type SupplierCommunicationsPage struct {
	Items []map[string]any
	Total int
	Page  int
	Limit int
}

func (s *Store) ListSupplierCommunications(ctx context.Context, supplierID string, page, limit int) (SupplierCommunicationsPage, error) {
	where := "supplier_id = $1::uuid"
	args := []any{supplierID}

	var total int
	if err := s.pool.QueryRow(ctx, "select count(*) from shop.supplier_communications where "+where, args...).Scan(&total); err != nil {
		return SupplierCommunicationsPage{}, err
	}

	args = append(args, limit, (page-1)*limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select id::text as id,
         supplier_id::text as supplier_id,
         channel,
         direction,
         subject,
         body,
         sender,
         recipient,
         thread_id,
         external_id,
         status,
         metadata,
         created_by::text as created_by,
         created_at,
         updated_at
  from shop.supplier_communications
  where %s
  order by created_at desc
  limit $%d offset $%d
) t
`, where, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return SupplierCommunicationsPage{}, err
	}

	return SupplierCommunicationsPage{Items: items, Total: total, Page: page, Limit: limit}, nil
}

func (s *Store) CreateSupplierCommunication(ctx context.Context, supplierID string, input map[string]any, actorID, actorRole, requestID string) (map[string]any, error) {
	channel := strings.TrimSpace(asString(input["channel"]))
	direction := strings.TrimSpace(asString(input["direction"]))
	body := strings.TrimSpace(asString(input["body"]))
	if channel == "" || direction == "" || body == "" {
		return nil, errInvalidInput
	}

	recipient := strings.TrimSpace(asString(input["recipient"]))
	subject := strings.TrimSpace(asString(input["subject"]))
	threadID := strings.TrimSpace(asString(input["thread_id"]))
	externalID := strings.TrimSpace(asString(input["external_id"]))

	status := strings.TrimSpace(asString(input["status"]))
	if status == "" {
		switch {
		case channel == "email" && direction == "outbound":
			status = "queued"
		case direction == "inbound":
			status = "received"
		default:
			status = "sent"
		}
	}
	if channel == "email" && direction == "outbound" {
		status = "queued"
		externalID = ""
	}

	if channel == "email" && direction == "outbound" && recipient == "" {
		return nil, errInvalidInput
	}

	metadataJSON, err := json.Marshal(input["metadata"])
	if err != nil {
		return nil, err
	}
	metadataStr := strings.TrimSpace(string(metadataJSON))
	if metadataStr == "" || metadataStr == "null" {
		metadataStr = "{}"
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.supplier_communications (
    supplier_id,
    channel,
    direction,
    subject,
    body,
    sender,
    recipient,
    thread_id,
    external_id,
    status,
    metadata,
    created_by
  ) values (
    $1::uuid,
    $2,
    $3,
    nullif($4, ''),
    $5,
    nullif($6, ''),
    nullif($7, ''),
    nullif($8, ''),
    nullif($9, ''),
    $10,
    $11::jsonb,
    $12::uuid
  )
  returning id::text as id,
            supplier_id::text as supplier_id,
            channel,
            direction,
            subject,
            body,
            sender,
            recipient,
            thread_id,
            external_id,
            status,
            metadata,
            created_by::text as created_by,
            created_at,
            updated_at
) t
`
	item, err := queryJSONObject(
		ctx,
		tx,
		query,
		supplierID,
		channel,
		direction,
		subject,
		body,
		asString(input["sender"]),
		recipient,
		threadID,
		externalID,
		status,
		metadataStr,
		actorParam,
	)
	if err != nil {
		return nil, err
	}

	if channel == "email" && direction == "outbound" {
		requestedAt := time.Now().UTC().Format(time.RFC3339)
		evPayload, _ := json.Marshal(map[string]any{
			"supplier_id":        supplierID,
			"communication_id":   asString(item["id"]),
			"thread_id":          threadID,
			"to":                 recipient,
			"subject":            subject,
			"body":               body,
			"requested_at":       requestedAt,
			"requested_by":       actorID,
			"communication_type": "supplier_email",
		})
		_, err := tx.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('supplier.communication.email.send.requested', 'supplier', $1, $2::jsonb, 'pending')
`, supplierID, string(evPayload))
		if err != nil {
			return nil, err
		}
	}

	if err := s.insertAuditLog(ctx, tx, supplierID, "supplier.communication.created", "supplier_communication", asString(item["id"]), nil, item, actorID, actorRole, requestID, map[string]any{"channel": channel, "direction": direction, "status": status, "thread_id": threadID}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}
