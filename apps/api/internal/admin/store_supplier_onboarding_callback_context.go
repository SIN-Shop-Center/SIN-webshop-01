package admin

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/jackc/pgx/v5"
)

func loadOnboardingCallbackRunContextTx(ctx context.Context, tx pgx.Tx, runID string, body map[string]any) (supplierID string, currentStatus string, err error) {
	var supplierMetadataRaw string
	if err := tx.QueryRow(ctx, `
select r.supplier_id::text,
       r.status,
       coalesce(s.metadata, '{}'::jsonb)::text
from shop.supplier_onboarding_runs r
join shop.suppliers s on s.id = r.supplier_id
where r.id::text = $1
limit 1
for update
`, runID).Scan(&supplierID, &currentStatus, &supplierMetadataRaw); err != nil {
		return "", "", err
	}

	if incomingSupplierID := validUUIDOrEmpty(asString(body["supplier_id"])); incomingSupplierID != "" && incomingSupplierID != supplierID {
		return "", "", errInvalidInput
	}

	if targetURL := strings.TrimSpace(asString(body["target_url"])); targetURL != "" {
		metadata := map[string]any{}
		_ = json.Unmarshal([]byte(supplierMetadataRaw), &metadata)
		if !isAllowedSupplierDomain(metadata, targetURL) {
			return "", "", errBlocked
		}
	}
	return supplierID, currentStatus, nil
}
