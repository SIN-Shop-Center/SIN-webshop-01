package admin

import (
	"context"
	"encoding/json"
	"strings"
)

func (s *Store) GetSupplierCredentials(ctx context.Context, supplierID, provider string) (map[string]any, error) {
	resolvedProvider := strings.TrimSpace(provider)
	if resolvedProvider == "" {
		resolvedProvider = "supplier_portal"
	}

	const query = `
select row_to_json(t)::jsonb
from (
  select s.id::text as supplier_id,
         coalesce(c.provider, $2) as provider,
         c.username,
         coalesce(c.metadata, '{}'::jsonb) as metadata,
         c.last_rotated_at,
         (coalesce(nullif(c.secret_ref, ''), '') <> '') as has_secret,
         s.updated_at as supplier_updated_at
  from shop.suppliers s
  left join shop.supplier_credentials_refs c
    on c.supplier_id = s.id
   and c.provider = $2
  where s.id::text = $1
  limit 1
) t
`
	return queryJSONObject(ctx, s.pool, query, supplierID, resolvedProvider)
}

func (s *Store) UpsertSupplierCredentials(ctx context.Context, supplierID string, body map[string]any, actorID, actorRole, requestID string) (map[string]any, error) {
	resolvedProvider := strings.TrimSpace(asString(body["provider"]))
	if resolvedProvider == "" {
		resolvedProvider = "supplier_portal"
	}
	secret := strings.TrimSpace(asString(body["secret"]))
	username := strings.TrimSpace(asString(body["username"]))

	metadata := map[string]any{}
	if rawMetadata, ok := body["metadata"]; ok && rawMetadata != nil {
		if typed, ok := rawMetadata.(map[string]any); ok {
			metadata = typed
		}
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
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

	const getQuery = `
select row_to_json(t)::jsonb
from (
  select s.id::text as supplier_id,
         coalesce(c.provider, $2) as provider,
         c.username,
         coalesce(c.metadata, '{}'::jsonb) as metadata,
         c.last_rotated_at,
         (coalesce(nullif(c.secret_ref, ''), '') <> '') as has_secret,
         s.updated_at as supplier_updated_at
  from shop.suppliers s
  left join shop.supplier_credentials_refs c
    on c.supplier_id = s.id
   and c.provider = $2
  where s.id::text = $1
  limit 1
) t
`
	before, err := queryJSONObject(ctx, tx, getQuery, supplierID, resolvedProvider)
	if err != nil {
		return nil, err
	}

	if secret != "" {
		if _, err := tx.Exec(ctx, `
select shop.set_supplier_secret_ref(
  $1::uuid,
  $2,
  $3,
  nullif($4, ''),
  $5::jsonb,
  $6::uuid
)
`, supplierID, resolvedProvider, secret, username, string(metadataJSON), actorParam); err != nil {
			return nil, err
		}
	} else {
		if _, err := tx.Exec(ctx, `
insert into shop.supplier_credentials_refs (
  supplier_id, provider, secret_ref, username, metadata, created_by
)
values (
  $1::uuid, $2, '', nullif($3, ''), $4::jsonb, $5::uuid
)
on conflict (supplier_id, provider) do update
set username = excluded.username,
    metadata = coalesce(shop.supplier_credentials_refs.metadata, '{}'::jsonb) || excluded.metadata,
    updated_at = now()
`, supplierID, resolvedProvider, username, string(metadataJSON), actorParam); err != nil {
			return nil, err
		}
	}

	if _, err := tx.Exec(ctx, `
insert into shop.supplier_activity_log (supplier_id, activity_type, severity, actor_type, actor_id, message, metadata)
values (
  $1::uuid,
  'credentials.updated',
  'info',
  'admin',
  $2::uuid,
  'Supplier credentials updated',
  jsonb_build_object('provider', $3, 'secret_updated', $4)
)
`, supplierID, actorParam, resolvedProvider, secret != ""); err != nil {
		return nil, err
	}

	after, err := queryJSONObject(ctx, tx, getQuery, supplierID, resolvedProvider)
	if err != nil {
		return nil, err
	}
	entityID := supplierID + ":" + resolvedProvider
	if err := s.insertAuditLog(ctx, tx, supplierID, "supplier.credentials.updated", "supplier_credentials", entityID, before, after, actorID, actorRole, requestID, map[string]any{"provider": resolvedProvider, "secret_updated": secret != ""}); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return after, nil
}
