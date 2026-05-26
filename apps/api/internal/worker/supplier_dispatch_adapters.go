package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

func (p *Processor) dispatchSupplierOrder(ctx context.Context, order *orderAggregate, placement supplierPlacement) (supplierDispatchResult, error) {
	if isCJSupplier(placement.Supplier) {
		return p.dispatchCJOrder(ctx, order, placement)
	}
	request := buildSupplierOrderRequest(order, placement)
	switch placement.Supplier.Channel {
	case "api":
		return p.dispatchSupplierOrderAPI(ctx, placement.Supplier, request)
	case "email":
		return p.dispatchSupplierOrderEmail(ctx, placement.Supplier, request)
	default:
		return supplierDispatchResult{}, fmt.Errorf("%w: unsupported_supplier_channel_%s", ErrPermanent, placement.Supplier.Channel)
	}
}

func isCJSupplier(s supplierCandidate) bool {
	return strings.Contains(strings.ToLower(s.Name), "cj") ||
		strings.Contains(s.APIEndpoint, "cjdropshipping")
}

func (p *Processor) dispatchSupplierOrderAPI(ctx context.Context, supplier supplierCandidate, request map[string]any) (supplierDispatchResult, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return supplierDispatchResult{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, supplier.APIEndpoint, bytes.NewReader(body))
	if err != nil {
		return supplierDispatchResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(supplier.APIKey) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(supplier.APIKey))
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return supplierDispatchResult{}, err
	}
	defer resp.Body.Close()

	rawResp, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*256))
	responsePayload := map[string]any{"status_code": resp.StatusCode}
	_ = json.Unmarshal(rawResp, &responsePayload)
	if len(responsePayload) == 1 {
		responsePayload["raw_body"] = string(rawResp)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return supplierDispatchResult{
			ResponsePayload: responsePayload,
		}, fmt.Errorf("supplier_api_non_2xx:%d", resp.StatusCode)
	}

	return supplierDispatchResult{
		ExternalOrderID: extractExternalOrderID(responsePayload),
		ResponsePayload: responsePayload,
	}, nil
}

func (p *Processor) dispatchSupplierOrderEmail(ctx context.Context, supplier supplierCandidate, request map[string]any) (supplierDispatchResult, error) {
	recipient := strings.TrimSpace(supplier.ContactEmail)
	if recipient == "" {
		return supplierDispatchResult{}, fmt.Errorf("%w: missing_supplier_email", ErrPermanent)
	}
	subject := fmt.Sprintf("Bestellung %s (Dropshipping)", asString(request["order_id"]))
	body := buildSupplierPOBody(request)

	messageID, err := p.sendMail(ctx, recipient, subject, body, nil)
	if err != nil {
		return supplierDispatchResult{}, err
	}
	return supplierDispatchResult{
		ExternalOrderID: messageID,
		ResponsePayload: map[string]any{
			"gmail_message_id": messageID,
			"channel":          "email",
		},
	}, nil
}

func buildSupplierOrderRequest(order *orderAggregate, placement supplierPlacement) map[string]any {
	items := make([]map[string]any, 0, len(placement.Items))
	for _, item := range placement.Items {
		items = append(items, map[string]any{
			"product_id":        item.ProductID,
			"sku":               item.SKU,
			"title":             item.Title,
			"quantity":          item.Quantity,
			"unit_price_amount": item.UnitPriceAmount,
		})
	}
	return map[string]any{
		"order_id":           order.ID,
		"supplier_id":        placement.Supplier.ID,
		"supplier_name":      placement.Supplier.Name,
		"currency":           order.Currency,
		"shipping_address":   order.shippingAddressMap(),
		"email":              order.Email,
		"items":              items,
		"decision_score":     placement.Score,
		"decision_rationale": placement.Reason,
	}
}

func buildSupplierPOBody(request map[string]any) string {
	itemsRaw, _ := request["items"].([]map[string]any)
	lines := []string{
		"Automatische Lieferantenbestellung Simone Shop",
		fmt.Sprintf("Order: %s", asString(request["order_id"])),
		fmt.Sprintf("Kunden-E-Mail: %s", asString(request["email"])),
		"",
		"Positionen:",
	}
	for _, item := range itemsRaw {
		lines = append(lines, fmt.Sprintf("- %s x%d (%s)", asString(item["title"]), int(asFloat(item["quantity"])), asString(item["sku"])))
	}
	return strings.Join(lines, "\n")
}

func extractExternalOrderID(payload map[string]any) string {
	candidates := []string{
		asString(payload["external_order_id"]),
		asString(payload["externalOrderId"]),
		asString(payload["order_id"]),
		asString(payload["id"]),
	}
	for _, value := range candidates {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
