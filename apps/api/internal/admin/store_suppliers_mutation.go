package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Store) CreateSupplier(ctx context.Context, body map[string]any, actorID, actorRole, requestID string) (map[string]any, error) {
	name := asString(body["name"])
	email := asString(body["email"])
	if name == "" || email == "" {
		return nil, errInvalidInput
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.suppliers (
    name, email, contact_email, phone, website, api_endpoint, api_key, status, rating,
    notes, contact_person, country, shipping_time_days, minimum_order, metadata,
    fulfillment_mode, auto_fulfill_enabled, sla_hours, sla_ack_hours, sla_fulfillment_hours, api_secret_ref,
    onboarding_status, registration_url, portal_url, compliance_state, specialization_tags,
    payment_terms_days, early_payment_discount_pct, early_payment_discount_days
  ) values (
    $1, $2, $3, $4, $5, $6, $7, $8, $9,
    $10, $11, $12, $13, $14, coalesce($15::jsonb, '{}'::jsonb),
    $16, $17, $18, $19, $20, $21,
    $22, $23, $24, $25, $26,
    $27, $28, $29
  )
  returning id::text as id, name, email, contact_email, phone, website, api_endpoint, status, rating,
            notes, contact_person, country, shipping_time_days, minimum_order,
            metadata, fulfillment_mode, auto_fulfill_enabled, sla_hours, sla_ack_hours, sla_fulfillment_hours,
            (coalesce(nullif(api_secret_ref, ''), '') <> '') as has_secret,
            onboarding_status, registration_url, portal_url, compliance_state, specialization_tags,
            payment_terms_days, early_payment_discount_pct, early_payment_discount_days,
            created_at, updated_at
) t
`

	item, err := queryJSONObject(ctx, tx, query,
		name,
		email,
		defaultString(body["contact_email"], email),
		asNullableString(body["phone"]),
		asNullableString(body["website"]),
		asNullableString(body["api_endpoint"]),
		asNullableString(body["api_key"]),
		defaultString(body["status"], "pending"),
		asFloat(body["rating"], 0),
		asNullableString(body["notes"]),
		asNullableString(body["contact_person"]),
		defaultString(body["country"], "DE"),
		asInt(body["shipping_time_days"], 7),
		asFloat(body["minimum_order"], 0),
		body["metadata"],
		defaultString(body["fulfillment_mode"], "email"),
		asBool(body["auto_fulfill_enabled"], false),
		asInt(body["sla_hours"], 48),
		asInt(body["sla_ack_hours"], 24),
		asInt(body["sla_fulfillment_hours"], 72),
		asNullableString(body["api_secret_ref"]),
		defaultString(body["onboarding_status"], "new"),
		asNullableString(body["registration_url"]),
		asNullableString(body["portal_url"]),
		defaultString(body["compliance_state"], "unchecked"),
		body["specialization_tags"],
		asInt(body["payment_terms_days"], 30),
		asNullableFloat(body["early_payment_discount_pct"]),
		asNullableInt(body["early_payment_discount_days"]),
	)
	if err != nil {
		return nil, err
	}

	entityID := asString(item["id"])
	if err := s.insertAuditLog(ctx, tx, entityID, auditAction("supplier", "created"), "supplier", entityID, nil, item, actorID, actorRole, requestID, nil); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Store) UpdateSupplier(ctx context.Context, id string, body map[string]any, actorID, actorRole, requestID string) (map[string]any, error) {
	setParts := make([]string, 0, 12)
	args := make([]any, 0, 14)
	changedFields := make([]string, 0, 12)
	appendField := func(col, key string) {
		v, ok := body[key]
		if !ok {
			return
		}
		args = append(args, v)
		setParts = append(setParts, fmt.Sprintf("%s = $%d", col, len(args)))
		changedFields = append(changedFields, key)
	}

	appendField("name", "name")
	appendField("email", "email")
	appendField("contact_email", "contact_email")
	appendField("phone", "phone")
	appendField("website", "website")
	appendField("api_endpoint", "api_endpoint")
	appendField("api_key", "api_key")
	appendField("api_secret_ref", "api_secret_ref")
	appendField("status", "status")
	appendField("rating", "rating")
	appendField("notes", "notes")
	appendField("contact_person", "contact_person")
	appendField("country", "country")
	appendField("shipping_time_days", "shipping_time_days")
	appendField("minimum_order", "minimum_order")
	appendField("fulfillment_mode", "fulfillment_mode")
	appendField("auto_fulfill_enabled", "auto_fulfill_enabled")
	appendField("sla_hours", "sla_hours")
	appendField("sla_ack_hours", "sla_ack_hours")
	appendField("sla_fulfillment_hours", "sla_fulfillment_hours")
	appendField("onboarding_status", "onboarding_status")
	appendField("specialization_tags", "specialization_tags")
	appendField("payment_terms_days", "payment_terms_days")
	appendField("early_payment_discount_pct", "early_payment_discount_pct")
	appendField("early_payment_discount_days", "early_payment_discount_days")
	appendField("registration_url", "registration_url")
	appendField("portal_url", "portal_url")
	appendField("compliance_state", "compliance_state")
	if value, ok := body["metadata"]; ok {
		blob, err := json.Marshal(value)
		if err != nil {
			return nil, err
		}
		args = append(args, string(blob))
		setParts = append(setParts, fmt.Sprintf("metadata = $%d::jsonb", len(args)))
		changedFields = append(changedFields, "metadata")
	}

	if len(setParts) == 0 {
		return nil, errEmptyPatch
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	before, err := queryJSONObject(ctx, tx, `
select row_to_json(t)::jsonb
from (
  select id::text as id, name, email, contact_email, phone, website, api_endpoint, status, rating,
         notes, contact_person, country, shipping_time_days, minimum_order,
         metadata, fulfillment_mode, auto_fulfill_enabled, sla_hours, sla_ack_hours, sla_fulfillment_hours,
         (coalesce(nullif(api_secret_ref, ''), '') <> '') as has_secret,
         onboarding_status, registration_url, portal_url, compliance_state, specialization_tags,
         payment_terms_days, early_payment_discount_pct, early_payment_discount_days,
         created_at, updated_at
  from shop.suppliers
  where id::text = $1
  limit 1
) t
`, id)
	if err != nil {
		return nil, err
	}

	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  update shop.suppliers
  set %s
  where id::text = $%d
  returning id::text as id, name, email, contact_email, phone, website, api_endpoint, status, rating,
            notes, contact_person, country, shipping_time_days, minimum_order,
            metadata, fulfillment_mode, auto_fulfill_enabled, sla_hours, sla_ack_hours, sla_fulfillment_hours,
            (coalesce(nullif(api_secret_ref, ''), '') <> '') as has_secret,
            onboarding_status, registration_url, portal_url, compliance_state, specialization_tags,
            payment_terms_days, early_payment_discount_pct, early_payment_discount_days,
            created_at, updated_at
) t
`, strings.Join(setParts, ",\n      "), len(args))

	after, err := queryJSONObject(ctx, tx, query, args...)
	if err != nil {
		return nil, err
	}
	if err := s.insertAuditLog(ctx, tx, id, auditAction("supplier", "updated"), "supplier", id, before, after, actorID, actorRole, requestID, map[string]any{"fields": changedFields}); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return after, nil
}

func (s *Store) DeleteSupplier(ctx context.Context, id string, actorID, actorRole, requestID string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	before, err := queryJSONObject(ctx, tx, `
select row_to_json(t)::jsonb
from (
  select id::text as id, name, email, contact_email, phone, website, api_endpoint, status, rating,
         notes, contact_person, country, shipping_time_days, minimum_order,
         metadata, fulfillment_mode, auto_fulfill_enabled, sla_hours, sla_ack_hours, sla_fulfillment_hours,
         (coalesce(nullif(api_secret_ref, ''), '') <> '') as has_secret,
         onboarding_status, registration_url, portal_url, compliance_state, specialization_tags,
         payment_terms_days, early_payment_discount_pct, early_payment_discount_days,
         created_at, updated_at
  from shop.suppliers
  where id::text = $1
  limit 1
) t
`, id)
	if err != nil {
		return err
	}

	var productCount int
	if err := tx.QueryRow(ctx, `select count(*) from shop.products where supplier_id::text = $1`, id).Scan(&productCount); err != nil {
		return err
	}
	if productCount > 0 {
		return errBlocked
	}

	cmd, err := tx.Exec(ctx, `delete from shop.suppliers where id::text = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	if err := s.insertAuditLog(ctx, tx, id, auditAction("supplier", "deleted"), "supplier", id, before, nil, actorID, actorRole, requestID, nil); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func defaultString(v any, fallback string) string {
	raw := strings.TrimSpace(asString(v))
	if raw == "" {
		return fallback
	}
	return raw
}

func asNullableFloat(v any) any {
	if v == nil || asString(v) == "" {
		return nil
	}
	return asFloat(v, 0)
}

func asNullableInt(v any) any {
	if v == nil || asString(v) == "" {
		return nil
	}
	return asInt(v, 0)
}
