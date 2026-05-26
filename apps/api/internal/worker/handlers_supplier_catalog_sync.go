package worker

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type supplierCatalogSyncTarget struct {
	ID                  string
	Name                string
	Website             string
	RegistrationURL     string
	PortalURL           string
	APIEndpoint         string
	CatalogSyncEndpoint string
	APIKey              string
	Metadata            map[string]any
}

func (p *Processor) handleSupplierCatalogSyncRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid supplier catalog sync payload", ErrPermanent)
	}

	supplierID := normalizeUUID(asString(payload["supplier_id"]))
	if supplierID == "" {
		return fmt.Errorf("%w: supplier_catalog_sync_supplier_missing", ErrPermanent)
	}

	target, err := p.loadSupplierCatalogSyncTarget(ctx, supplierID)
	if err != nil {
		return err
	}
	if target == nil {
		return fmt.Errorf("%w: supplier_not_found", ErrPermanent)
	}

	requestPayload := asMap(payload["request_payload"])
	catalogStatus := strings.ToLower(strings.TrimSpace(asString(payload["catalog_status"])))
	if catalogStatus == "" {
		catalogStatus = "new"
	}

	items, source, err := p.resolveSupplierCatalogItems(ctx, target, requestPayload, catalogStatus)
	if err != nil {
		browserPayload, fallbackRequested, fallbackErr := p.requestSupplierCatalogBrowserSync(ctx, target, requestPayload, catalogStatus, source, err)
		if fallbackErr == nil && fallbackRequested {
			return p.postAutomationEvent(ctx, job.JobType, map[string]any{
				"supplier_id":     supplierID,
				"status":          "browser_fallback_requested",
				"source":          "browser_fallback",
				"catalog_status":  catalogStatus,
				"target_url":      asString(browserPayload["target_url"]),
				"candidate_urls":  browserPayload["candidate_urls"],
				"failed_source":   source,
				"requested_at":    asString(browserPayload["requested_at"]),
				"callback_path":   asString(browserPayload["callback_path"]),
				"failure_reason":  truncateErr(err),
				"fallback_recipe": asMap(browserPayload["browser_recipe"]),
			})
		}

		metadata := map[string]any{
			"error":  truncateErr(err),
			"source": source,
		}
		if fallbackRequested {
			metadata["browser_fallback_error"] = truncateErr(fallbackErr)
		}
		_ = p.appendSupplierActivity(ctx, supplierID, "catalog.sync.failed", "error", "Supplier catalog sync failed", map[string]any{
			"error":                  metadata["error"],
			"source":                 metadata["source"],
			"browser_fallback_error": metadata["browser_fallback_error"],
		})
		if fallbackRequested && fallbackErr != nil {
			return fallbackErr
		}
		return err
	}

	count, err := p.upsertSupplierCatalogProductsWorker(ctx, supplierID, items)
	if err != nil {
		_ = p.appendSupplierActivity(ctx, supplierID, "catalog.sync.failed", "error", "Supplier catalog upsert failed", map[string]any{
			"error":       truncateErr(err),
			"items_count": len(items),
			"source":      source,
		})
		return err
	}

	resultPayload := map[string]any{
		"supplier_id": supplierID,
		"items_count": count,
		"source":      source,
		"synced_at":   time.Now().UTC().Format(time.RFC3339),
	}
	if err := p.appendSupplierActivity(ctx, supplierID, "catalog.sync.completed", "info", "Supplier catalog sync completed", resultPayload); err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, resultPayload)
}

func (p *Processor) loadSupplierCatalogSyncTarget(ctx context.Context, supplierID string) (*supplierCatalogSyncTarget, error) {
	const query = `
select s.id::text,
       coalesce(s.name, ''),
       coalesce(s.website, ''),
       coalesce(s.registration_url, ''),
       coalesce(s.portal_url, ''),
       coalesce(s.api_endpoint, ''),
       coalesce(s.metadata::text, '{}'::text),
       coalesce(nullif(shop.resolve_supplier_secret_ref(s.api_secret_ref), ''), s.api_key, '')
from shop.suppliers s
where s.id::text = $1
limit 1
`
	var target supplierCatalogSyncTarget
	var metadataRaw string
	if err := p.pool.QueryRow(ctx, query, supplierID).Scan(
		&target.ID,
		&target.Name,
		&target.Website,
		&target.RegistrationURL,
		&target.PortalURL,
		&target.APIEndpoint,
		&metadataRaw,
		&target.APIKey,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	target.Metadata = map[string]any{}
	if strings.TrimSpace(metadataRaw) != "" {
		_ = json.Unmarshal([]byte(metadataRaw), &target.Metadata)
	}
	target.CatalogSyncEndpoint = strings.TrimSpace(asString(target.Metadata["catalog_sync_endpoint"]))
	if target.CatalogSyncEndpoint == "" {
		target.CatalogSyncEndpoint = strings.TrimSpace(asString(target.Metadata["catalog_api_endpoint"]))
	}
	return &target, nil
}

func (p *Processor) resolveSupplierCatalogItems(ctx context.Context, target *supplierCatalogSyncTarget, requestPayload map[string]any, catalogStatus string) ([]map[string]any, string, error) {
	if items := normalizeSupplierCatalogItems(rawItems(requestPayload["items"]), catalogStatus); len(items) > 0 {
		return items, "request_payload", nil
	}
	if items := normalizeSupplierCatalogItems(rawItems(target.Metadata["catalog_seed_products"]), catalogStatus); len(items) > 0 {
		return items, "metadata_seed", nil
	}

	endpoint := strings.TrimSpace(asString(requestPayload["catalog_sync_endpoint"]))
	if endpoint == "" {
		endpoint = strings.TrimSpace(target.CatalogSyncEndpoint)
	}
	if endpoint == "" {
		return nil, "none", fmt.Errorf("%w: supplier_catalog_sync_source_missing", ErrPermanent)
	}

	items, err := p.fetchSupplierCatalogFromEndpoint(ctx, endpoint, target.APIKey, target.ID, requestPayload, catalogStatus)
	if err != nil {
		return nil, endpoint, err
	}
	if len(items) == 0 {
		return nil, endpoint, fmt.Errorf("%w: supplier_catalog_sync_empty", ErrPermanent)
	}
	return items, endpoint, nil
}

func (p *Processor) requestSupplierCatalogBrowserSync(ctx context.Context, target *supplierCatalogSyncTarget, requestPayload map[string]any, catalogStatus, failedSource string, sourceErr error) (map[string]any, bool, error) {
	candidateURLs := supplierCatalogBrowserCandidateURLs(target, requestPayload)
	if len(candidateURLs) == 0 {
		return nil, false, nil
	}

	browserRecipe := asMap(target.Metadata["catalog_browser_recipe"])
	if override := asMap(requestPayload["browser_recipe"]); len(override) > 0 {
		browserRecipe = override
	}

	endpoint := strings.TrimSpace(asString(requestPayload["catalog_sync_endpoint"]))
	if endpoint == "" {
		endpoint = strings.TrimSpace(target.CatalogSyncEndpoint)
	}

	artifactPayload := map[string]any{
		"supplier_id":      target.ID,
		"supplier_name":    target.Name,
		"target_url":       candidateURLs[0],
		"candidate_urls":   candidateURLs,
		"website":          target.Website,
		"portal_url":       target.PortalURL,
		"registration_url": target.RegistrationURL,
		"callback_path":    "/api/admin/suppliers/catalog-sync/callback",
		"requested_at":     time.Now().UTC().Format(time.RFC3339),
		"catalog_status":   catalogStatus,
		"failed_source":    failedSource,
		"failure_reason":   truncateErr(sourceErr),
	}
	if siteURL := strings.TrimSpace(p.options.SiteURL); siteURL != "" {
		siteURL = strings.TrimRight(siteURL, "/")
		artifactPayload["site_url"] = siteURL
		artifactPayload["callback_url"] = siteURL + "/api/admin/suppliers/catalog-sync/callback"
		artifactPayload["browser_runner_url"] = siteURL + "/api/automation/supplier-catalog-browser/catalog-harvest"
	}
	if len(browserRecipe) > 0 {
		artifactPayload["browser_recipe"] = browserRecipe
	}
	if endpoint != "" {
		artifactPayload["catalog_sync_endpoint"] = endpoint
	}
	if len(requestPayload) > 0 {
		artifactPayload["request_payload"] = requestPayload
	}

	if err := p.appendSupplierActivity(ctx, target.ID, "catalog.sync.browser_requested", "warning", "Browser fallback requested for supplier catalog sync", artifactPayload); err != nil {
		return nil, true, err
	}
	if err := p.postAutomationEvent(ctx, "supplier.catalog.browser.requested", artifactPayload); err != nil {
		return nil, true, err
	}
	return artifactPayload, true, nil
}

func supplierCatalogBrowserCandidateURLs(target *supplierCatalogSyncTarget, requestPayload map[string]any) []string {
	values := []string{
		asString(requestPayload["target_url"]),
		asString(requestPayload["catalog_url"]),
		asString(requestPayload["portal_url"]),
		asString(requestPayload["website"]),
		asString(requestPayload["registration_url"]),
		asString(target.Metadata["catalog_browser_url"]),
		asString(target.Metadata["catalog_url"]),
		asString(target.Metadata["catalog_portal_url"]),
		target.PortalURL,
		target.Website,
		target.RegistrationURL,
	}

	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func (p *Processor) fetchSupplierCatalogFromEndpoint(ctx context.Context, endpoint, apiKey, supplierID string, requestPayload map[string]any, catalogStatus string) ([]map[string]any, error) {
	method := strings.ToUpper(strings.TrimSpace(asString(requestPayload["method"])))
	if method == "" {
		method = http.MethodGet
	}

	requestBody := map[string]any{
		"supplier_id":  supplierID,
		"requested_at": time.Now().UTC().Format(time.RFC3339),
	}
	for key, value := range requestPayload {
		if key == "items" || key == "catalog_sync_endpoint" || key == "method" {
			continue
		}
		requestBody[key] = value
	}

	var reader io.Reader
	if method != http.MethodGet {
		body, err := json.Marshal(requestBody)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, endpoint, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if method != http.MethodGet {
		req.Header.Set("Content-Type", "application/json")
	}
	if strings.TrimSpace(apiKey) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiKey))
	}

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != 429 {
			return nil, fmt.Errorf("%w: supplier_catalog_endpoint_non_2xx:%d", ErrPermanent, resp.StatusCode)
		}
		return nil, fmt.Errorf("supplier_catalog_endpoint_non_2xx:%d", resp.StatusCode)
	}

	decoded := any(nil)
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return nil, err
	}
	return normalizeSupplierCatalogItems(extractSupplierCatalogRawItems(decoded), catalogStatus), nil
}

func extractSupplierCatalogRawItems(decoded any) []any {
	switch typed := decoded.(type) {
	case []any:
		return typed
	case map[string]any:
		if items, ok := typed["items"].([]any); ok {
			return items
		}
		if items, ok := typed["products"].([]any); ok {
			return items
		}
		if data, ok := typed["data"].(map[string]any); ok {
			if items, ok := data["items"].([]any); ok {
				return items
			}
			if items, ok := data["products"].([]any); ok {
				return items
			}
		}
	}
	return []any{}
}

func normalizeSupplierCatalogItems(items []any, catalogStatus string) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, raw := range items {
		item := asMap(raw)
		title := firstNonEmpty(
			asString(item["title"]),
			asString(item["name"]),
			asString(item["product_name"]),
		)
		if title == "" {
			continue
		}

		sourceURL := firstNonEmpty(asString(item["source_url"]), asString(item["url"]))
		supplierSKU := firstNonEmpty(asString(item["supplier_sku"]), asString(item["sku"]))
		externalProductID := firstNonEmpty(
			asString(item["external_product_id"]),
			asString(item["external_id"]),
			asString(item["id"]),
		)
		if externalProductID == "" {
			externalProductID = supplierCatalogFingerprint(title, sourceURL)
		}

		normalized := map[string]any{
			"external_product_id":    externalProductID,
			"supplier_sku":           supplierSKU,
			"title":                  title,
			"description":            firstNonEmpty(asString(item["description"]), asString(item["body"])),
			"source_url":             sourceURL,
			"image_url":              firstNonEmpty(asString(item["image_url"]), asString(item["image"]), asString(item["thumbnail"])),
			"currency":               strings.ToUpper(firstNonEmpty(asString(item["currency"]), "EUR")),
			"price":                  valueOrNil(item["price"]),
			"compare_at_price":       valueOrNil(item["compare_at_price"]),
			"minimum_order_quantity": valueOrNil(item["minimum_order_quantity"]),
			"stock_hint":             valueOrNil(item["stock_hint"]),
			"lead_time_days":         valueOrNil(item["lead_time_days"]),
			"status":                 firstNonEmpty(asString(item["status"]), catalogStatus),
			"review_note":            firstNonEmpty(asString(item["review_note"]), asString(item["note"])),
			"ai_score":               valueOrNil(item["ai_score"]),
			"metadata":               asMap(item["metadata"]),
		}
		out = append(out, normalized)
	}
	return out
}

func (p *Processor) upsertSupplierCatalogProductsWorker(ctx context.Context, supplierID string, items []map[string]any) (int, error) {
	tx, err := p.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	count := 0
	for _, item := range items {
		metadataRaw, err := json.Marshal(asMap(item["metadata"]))
		if err != nil {
			return count, err
		}

		if _, err := tx.Exec(ctx, `
insert into shop.supplier_catalog_products (
  supplier_id, external_product_id, supplier_sku, title, description, source_url, image_url,
  currency, price, compare_at_price, minimum_order_quantity, stock_hint, lead_time_days,
  status, review_note, ai_score, metadata, discovered_at, last_seen_at
)
values (
  $1::uuid, nullif($2, ''), nullif($3, ''), $4, nullif($5, ''), nullif($6, ''), nullif($7, ''),
  $8, $9, $10, $11, $12, $13,
  $14, nullif($15, ''), $16, $17::jsonb, now(), now()
)
on conflict (supplier_id, external_product_id) do update
set supplier_sku = coalesce(nullif(excluded.supplier_sku, ''), shop.supplier_catalog_products.supplier_sku),
    title = excluded.title,
    description = excluded.description,
    source_url = excluded.source_url,
    image_url = excluded.image_url,
    currency = excluded.currency,
    price = excluded.price,
    compare_at_price = excluded.compare_at_price,
    minimum_order_quantity = excluded.minimum_order_quantity,
    stock_hint = excluded.stock_hint,
    lead_time_days = excluded.lead_time_days,
    status = case when shop.supplier_catalog_products.status = 'imported' then shop.supplier_catalog_products.status else excluded.status end,
    review_note = coalesce(nullif(excluded.review_note, ''), shop.supplier_catalog_products.review_note),
    ai_score = excluded.ai_score,
    metadata = coalesce(shop.supplier_catalog_products.metadata, '{}'::jsonb) || excluded.metadata,
    last_seen_at = now(),
    updated_at = now()
`, supplierID,
			asString(item["external_product_id"]),
			asString(item["supplier_sku"]),
			asString(item["title"]),
			asString(item["description"]),
			asString(item["source_url"]),
			asString(item["image_url"]),
			firstNonEmpty(asString(item["currency"]), "EUR"),
			nullableFloatWorker(item["price"]),
			nullableFloatWorker(item["compare_at_price"]),
			nullableFloatWorker(item["minimum_order_quantity"]),
			nullableIntWorker(item["stock_hint"]),
			nullableIntWorker(item["lead_time_days"]),
			firstNonEmpty(asString(item["status"]), "new"),
			asString(item["review_note"]),
			nullableFloatWorker(item["ai_score"]),
			string(metadataRaw),
		); err != nil {
			return count, err
		}
		count++
	}

	if err := tx.Commit(ctx); err != nil {
		return count, err
	}
	return count, nil
}

func (p *Processor) appendSupplierActivity(ctx context.Context, supplierID, activityType, severity, message string, metadata map[string]any) error {
	blob, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
insert into shop.supplier_activity_log (supplier_id, activity_type, severity, actor_type, message, metadata)
values ($1::uuid, $2, $3, 'worker', $4, $5::jsonb)
`, supplierID, activityType, severity, message, string(blob))
	return err
}

func rawItems(v any) []any {
	switch typed := v.(type) {
	case []any:
		return typed
	default:
		return []any{}
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func supplierCatalogFingerprint(title, sourceURL string) string {
	hash := sha1.Sum([]byte(strings.TrimSpace(strings.ToLower(title)) + "|" + strings.TrimSpace(strings.ToLower(sourceURL))))
	return hex.EncodeToString(hash[:8])
}

func valueOrNil(v any) any {
	switch typed := v.(type) {
	case nil:
		return nil
	case string:
		if strings.TrimSpace(typed) == "" {
			return nil
		}
		return strings.TrimSpace(typed)
	default:
		return v
	}
}

func nullableIntWorker(v any) any {
	switch typed := v.(type) {
	case nil:
		return nil
	case string:
		value := strings.TrimSpace(typed)
		if value == "" {
			return nil
		}
		parsed, err := strconv.Atoi(value)
		if err != nil {
			return nil
		}
		return parsed
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	default:
		return nil
	}
}

func nullableFloatWorker(v any) any {
	switch typed := v.(type) {
	case nil:
		return nil
	case string:
		value := strings.TrimSpace(typed)
		if value == "" {
			return nil
		}
		parsed, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return nil
		}
		return parsed
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	case int64:
		return float64(typed)
	default:
		return nil
	}
}
