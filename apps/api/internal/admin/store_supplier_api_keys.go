package admin

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

type SupplierAPIKeysPage struct {
	Items []map[string]any
	Total int
	Page  int
	Limit int
}

func (s *Store) ListSupplierAPIKeys(ctx context.Context, supplierID string, page, limit int) (SupplierAPIKeysPage, error) {
	var total int
	if err := s.pool.QueryRow(ctx, `select count(*) from shop.supplier_api_keys where supplier_id::text = $1`, supplierID).Scan(&total); err != nil {
		return SupplierAPIKeysPage{}, err
	}

	query := `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         supplier_id::text as supplier_id,
         key_prefix,
         scopes,
         metadata,
         coalesce(created_by::text, '') as created_by,
         created_at,
         last_used_at,
         revoked_at,
         coalesce(revoked_by::text, '') as revoked_by
  from shop.supplier_api_keys
  where supplier_id::text = $1
  order by created_at desc
  limit $2 offset $3
) t
`
	items, err := queryJSONRows(ctx, s.pool, query, supplierID, limit, (page-1)*limit)
	if err != nil {
		return SupplierAPIKeysPage{}, err
	}
	return SupplierAPIKeysPage{Items: items, Total: total, Page: page, Limit: limit}, nil
}

func (s *Store) CreateSupplierAPIKey(ctx context.Context, supplierID string, body map[string]any, actorID, actorRole, requestID string) (map[string]any, error) {
	scopes := parseScopes(body["scopes"])
	if len(scopes) == 0 {
		scopes = []string{"webhook"}
	}

	metaStr := "{}"
	if rawMeta, ok := body["metadata"]; ok {
		blob, err := json.Marshal(rawMeta)
		if err != nil {
			return nil, err
		}
		trimmed := strings.TrimSpace(string(blob))
		if trimmed != "" && trimmed != "null" {
			metaStr = trimmed
		}
	}

	actorUUID := validUUIDOrEmpty(actorID)
	var actorParam any
	if actorUUID != "" {
		actorParam = actorUUID
	}

	for attempt := 0; attempt < 6; attempt++ {
		prefix, secret, err := generateSupplierAPIKeyMaterial()
		if err != nil {
			return nil, err
		}
		plaintextKey := fmt.Sprintf("sup_%s_%s", prefix, secret)
		hash := sha256.Sum256([]byte(prefix + "." + secret))
		hashHex := hex.EncodeToString(hash[:])

		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return nil, err
		}
		defer tx.Rollback(ctx)

		const query = `
select row_to_json(t)::jsonb
from (
  insert into shop.supplier_api_keys (
    supplier_id,
    key_prefix,
    key_hash,
    scopes,
    metadata,
    created_by
  ) values (
    $1::uuid,
    $2,
    $3,
    $4::text[],
    $5::jsonb,
    $6::uuid
  )
  returning id::text as id,
            supplier_id::text as supplier_id,
            key_prefix,
            scopes,
            metadata,
            created_by::text as created_by,
            created_at,
            last_used_at,
            revoked_at,
            revoked_by::text as revoked_by
) t
`
		item, err := queryJSONObject(ctx, tx, query, supplierID, prefix, hashHex, scopes, metaStr, actorParam)
		if err != nil {
			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == "23505" {
					continue
				}
			}
			return nil, err
		}
		if err := s.insertAuditLog(ctx, tx, supplierID, "supplier.api_key.created", "supplier_api_key", asString(item["id"]), nil, item, actorID, actorRole, requestID, map[string]any{"scopes": scopes}); err != nil {
			return nil, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		item["api_key"] = plaintextKey
		return item, nil
	}

	return nil, fmt.Errorf("supplier_api_key_generation_failed")
}

func (s *Store) RevokeSupplierAPIKey(ctx context.Context, supplierID, keyID string, actorID, actorRole, requestID string) (map[string]any, error) {
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

	before, err := queryJSONObject(ctx, tx, `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         supplier_id::text as supplier_id,
         key_prefix,
         scopes,
         metadata,
         created_by::text as created_by,
         created_at,
         last_used_at,
         revoked_at,
         revoked_by::text as revoked_by
  from shop.supplier_api_keys
  where supplier_id::text = $1
    and id::text = $2
  limit 1
) t
`, supplierID, keyID)
	if err != nil {
		return nil, err
	}

	after, err := queryJSONObject(ctx, tx, `
select row_to_json(t)::jsonb
from (
  update shop.supplier_api_keys
  set revoked_at = now(),
      revoked_by = $3::uuid
  where supplier_id::text = $1
    and id::text = $2
    and revoked_at is null
  returning id::text as id,
            supplier_id::text as supplier_id,
            key_prefix,
            scopes,
            metadata,
            created_by::text as created_by,
            created_at,
            last_used_at,
            revoked_at,
            revoked_by::text as revoked_by
) t
`, supplierID, keyID, actorParam)
	if err != nil {
		return nil, err
	}
	if err := s.insertAuditLog(ctx, tx, supplierID, "supplier.api_key.revoked", "supplier_api_key", keyID, before, after, actorID, actorRole, requestID, nil); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return after, nil
}

func parseScopes(raw any) []string {
	out := make([]string, 0, 4)
	seen := map[string]bool{}
	appendScope := func(value string) {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return
		}
		if seen[trimmed] {
			return
		}
		seen[trimmed] = true
		out = append(out, trimmed)
	}

	switch typed := raw.(type) {
	case []string:
		for _, value := range typed {
			appendScope(value)
		}
	case []any:
		for _, value := range typed {
			appendScope(asString(value))
		}
	case string:
		parts := strings.Split(typed, ",")
		for _, value := range parts {
			appendScope(value)
		}
	}
	return out
}

func generateSupplierAPIKeyMaterial() (string, string, error) {
	prefixBytes := make([]byte, 4)
	if _, err := rand.Read(prefixBytes); err != nil {
		return "", "", err
	}
	prefix := hex.EncodeToString(prefixBytes)

	secretBytes := make([]byte, 32)
	if _, err := rand.Read(secretBytes); err != nil {
		return "", "", err
	}
	secret := base64.RawURLEncoding.EncodeToString(secretBytes)
	return prefix, secret, nil
}
