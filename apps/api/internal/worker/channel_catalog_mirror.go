package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

func (p *Processor) buildChannelCatalogMirrorPayload(ctx context.Context, channel string, requestedPayload, auth map[string]any) (map[string]any, error) {
	products, err := p.loadCatalogMirrorProducts(ctx, requestedPayload)
	if err != nil {
		return nil, err
	}
	if len(products) == 0 {
		return nil, fmt.Errorf("%w: channel_catalog_products_missing", ErrPermanent)
	}

	payload := map[string]any{
		"channel":       channel,
		"mirror_mode":   catalogDefaultString(requestedPayload["mirror_mode"], "shop_catalog_mirror"),
		"product_count": len(products),
		"currency":      catalogDefaultString(requestedPayload["currency"], "EUR"),
		"products":      products,
	}

	if shopID := firstNonEmptyWorker(asString(auth["shop_id"]), asString(auth["shop_cipher"])); shopID != "" {
		payload["shop_id"] = shopID
	}
	if merchantID := firstNonEmptyWorker(asString(auth["merchant_id"]), asString(auth["seller_id"])); merchantID != "" {
		payload["merchant_id"] = merchantID
	}
	if provider := firstNonEmptyWorker(asString(auth["provider"]), channel); provider != "" {
		payload["provider"] = provider
	}
	if endpoint := asString(auth["product_save_endpoint"]); endpoint != "" {
		payload["product_save_endpoint"] = endpoint
	}
	return payload, nil
}

func (p *Processor) loadCatalogMirrorProducts(ctx context.Context, requestedPayload map[string]any) ([]map[string]any, error) {
	limit := clampWorkerInt(asFloat(requestedPayload["product_limit"]), 100, 1, 250)
	productIDs := workerStringSlice(requestedPayload["product_ids"])

	args := make([]any, 0, 3)
	args = append(args, limit)
	where := []string{"p.is_active = true"}
	if len(productIDs) > 0 {
		args = append(args, productIDs)
		where = append(where, fmt.Sprintf("p.id::text = any($%d::text[])", len(args)))
	}

	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select p.id::text as id,
         p.sku,
         p.name,
         p.slug,
         p.description,
         p.price,
         p.original_price,
         p.stock,
         p.images,
         p.variants,
         p.metadata,
         case when c.id is null then null else jsonb_build_object('id', c.id::text, 'name', c.name, 'slug', c.slug) end as category,
         case when s.id is null then null else jsonb_build_object('id', s.id::text, 'name', s.name, 'email', s.email) end as supplier
  from shop.products p
  left join shop.categories c on c.id = p.category_id
  left join shop.suppliers s on s.id = p.supplier_id
  where %s
  order by p.updated_at desc, p.created_at desc
  limit $1
) t
`, strings.Join(where, " and "))

	rows, err := p.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]map[string]any, 0, limit)
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		item := map[string]any{}
		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &item); err != nil {
				return nil, err
			}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func workerStringSlice(value any) []string {
	switch typed := value.(type) {
	case []string:
		return typed
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if current := asString(item); current != "" {
				out = append(out, current)
			}
		}
		return out
	default:
		return []string{}
	}
}

func catalogDefaultString(value any, fallback string) string {
	current := asString(value)
	if current == "" {
		return fallback
	}
	return current
}

func firstNonEmptyWorker(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func clampWorkerInt(value float64, fallback, minValue, maxValue int) int {
	if value == 0 {
		return fallback
	}
	current := int(value)
	if current < minValue {
		return minValue
	}
	if current > maxValue {
		return maxValue
	}
	return current
}
