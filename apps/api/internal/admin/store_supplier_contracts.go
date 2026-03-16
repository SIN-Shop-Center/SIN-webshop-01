package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

type SupplierContractsPage struct {
	Items []map[string]any
	Total int
	Page  int
	Limit int
}

func (s *Store) ListSupplierContracts(ctx context.Context, supplierID string, page, limit int) (SupplierContractsPage, error) {
	where := "supplier_id = $1::uuid"
	args := []any{supplierID}

	var total int
	if err := s.pool.QueryRow(ctx, "select count(*) from public.supplier_contracts where "+where, args...).Scan(&total); err != nil {
		return SupplierContractsPage{}, err
	}

	args = append(args, limit, (page-1)*limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select id::text as id,
         supplier_id::text as supplier_id,
         contract_type,
         version,
         case
           when status = 'expired' then status
           when expires_at is not null and expires_at < now() then 'expired'
           else status
         end as status,
         effective_at,
         expires_at,
         file_object_key,
         file_name,
         content_type,
         size_bytes,
         metadata,
         created_at,
         updated_at
  from public.supplier_contracts
  where %s
  order by expires_at desc nulls last, created_at desc
  limit $%d offset $%d
) t
`, where, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return SupplierContractsPage{}, err
	}

	return SupplierContractsPage{Items: items, Total: total, Page: page, Limit: limit}, nil
}

func (s *Store) CreateSupplierContract(ctx context.Context, supplierID string, body map[string]any, actorID, actorRole, requestID string) (map[string]any, error) {
	contractType := strings.TrimSpace(asString(body["contract_type"]))
	fileObjectKey := strings.TrimSpace(asString(body["file_object_key"]))
	if contractType == "" || fileObjectKey == "" {
		return nil, errInvalidInput
	}

	metadataJSON, err := json.Marshal(body["metadata"])
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

	const query = `
select row_to_json(t)::jsonb
from (
  insert into public.supplier_contracts (
    supplier_id,
    contract_type,
    version,
    status,
    effective_at,
    expires_at,
    file_object_key,
    file_name,
    content_type,
    size_bytes,
    metadata,
    created_by
  ) values (
    $1::uuid,
    $2,
    nullif($3, ''),
    coalesce(nullif($4, ''), 'active'),
    nullif($5, '')::timestamptz,
    nullif($6, '')::timestamptz,
    $7,
    nullif($8, ''),
    nullif($9, ''),
    $10,
    coalesce($11::jsonb, '{}'::jsonb),
    $12::uuid
  )
  returning id::text as id,
            supplier_id::text as supplier_id,
            contract_type,
            version,
            status,
            effective_at,
            expires_at,
            file_object_key,
            file_name,
            content_type,
            size_bytes,
            metadata,
            created_at,
            updated_at
) t
`

	item, err := queryJSONObject(
		ctx,
		tx,
		query,
		supplierID,
		contractType,
		asString(body["version"]),
		asString(body["status"]),
		asString(body["effective_at"]),
		asString(body["expires_at"]),
		fileObjectKey,
		asString(body["file_name"]),
		asString(body["content_type"]),
		asInt(body["size_bytes"], 0),
		string(metadataJSON),
		actorParam,
	)
	if err != nil {
		return nil, err
	}

	if asString(item["status"]) == "active" {
		_, err := tx.Exec(ctx, `
update public.supplier_contracts
set status = 'superseded', updated_at = now()
where supplier_id::text = $1
  and contract_type = $2
  and status = 'active'
  and id::text <> $3
`, supplierID, contractType, asString(item["id"]))
		if err != nil {
			return nil, err
		}
	}

	if err := s.insertAuditLog(ctx, tx, supplierID, "supplier.contract.created", "supplier_contract", asString(item["id"]), nil, item, actorID, actorRole, requestID, map[string]any{"contract_type": contractType, "status": asString(item["status"])}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Store) GetSupplierContract(ctx context.Context, supplierID, contractID string) (map[string]any, error) {
	const query = `
select row_to_json(t)::jsonb
from (
  select id::text as id,
         supplier_id::text as supplier_id,
         contract_type,
         version,
         case
           when status = 'expired' then status
           when expires_at is not null and expires_at < now() then 'expired'
           else status
         end as status,
         effective_at,
         expires_at,
         file_object_key,
         file_name,
         content_type,
         size_bytes,
         metadata,
         created_at,
         updated_at
  from public.supplier_contracts
  where supplier_id::text = $1
    and id::text = $2
) t
`
	return queryJSONObject(ctx, s.pool, query, supplierID, contractID)
}
