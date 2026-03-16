package admin

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *Store) TriggerSupplierCatalogSync(ctx context.Context, supplierID string, options map[string]any, actorID string) (map[string]any, error) {
	var exists bool
	if err := s.pool.QueryRow(ctx, `select exists(select 1 from public.suppliers where id::text = $1)`, supplierID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, pgx.ErrNoRows
	}

	payload := map[string]any{
		"supplier_id":      supplierID,
		"requested_at":     time.Now().UTC().Format(time.RFC3339),
		"request_payload":  asMap(options["request_payload"]),
		"source":           defaultString(options["source"], "admin_manual_catalog_sync"),
		"requested_by":     actorID,
		"catalog_status":   defaultString(options["catalog_status"], "new"),
		"sync_description": defaultString(options["description"], "Supplier catalog sync requested"),
	}
	if endpoint := asString(options["catalog_sync_endpoint"]); endpoint != "" {
		requestPayload := asMap(payload["request_payload"])
		requestPayload["catalog_sync_endpoint"] = endpoint
		payload["request_payload"] = requestPayload
	}
	if rawItems, ok := options["items"]; ok && rawItems != nil {
		requestPayload := asMap(payload["request_payload"])
		requestPayload["items"] = rawItems
		payload["request_payload"] = requestPayload
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	_, err = s.pool.Exec(ctx, `
insert into public.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('supplier.catalog.sync.requested', 'supplier', $1, $2::jsonb, 'pending')
`, supplierID, string(body))
	if err != nil {
		return nil, err
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}
	_, _ = s.pool.Exec(ctx, `
insert into public.supplier_activity_log (supplier_id, activity_type, severity, actor_type, actor_id, message, metadata)
values (
  $1::uuid,
  'catalog.sync.requested',
  'info',
  case when $2::uuid is null then 'system' else 'admin' end,
  $2::uuid,
  'Supplier catalog sync requested',
  jsonb_build_object('source', $3, 'requested_at', $4)
)
`, supplierID, actorParam, payload["source"], payload["requested_at"])

	return map[string]any{
		"supplier_id":   supplierID,
		"status":        "queued",
		"requested_at":  payload["requested_at"],
		"source":        payload["source"],
		"request_items": len(asSlice(asMap(payload["request_payload"])["items"])),
	}, nil
}

func asSlice(v any) []any {
	switch typed := v.(type) {
	case []any:
		return typed
	default:
		return []any{}
	}
}
