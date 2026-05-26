package worker

import (
	"context"
	"fmt"
	"strings"
)

const cjSupplierID = "afe83509-b0d5-44fb-85b8-1bd5ce0df2ab"

func (p *Processor) dispatchCJOrder(ctx context.Context, order *orderAggregate, placement supplierPlacement) (supplierDispatchResult, error) {
	apiKey := p.cfg.CJAPIKey
	if strings.TrimSpace(apiKey) == "" {
		apiKey = strings.TrimSpace(placement.Supplier.APIKey)
	}
	if strings.TrimSpace(apiKey) == "" {
		return supplierDispatchResult{}, fmt.Errorf("%w: cj_api_key_missing", ErrPermanent)
	}

	client := newCJClient(apiKey)

	vids, err := p.loadCJVariantIDs(ctx, placement.Items)
	if err != nil {
		return supplierDispatchResult{}, fmt.Errorf("cj_vid_lookup: %w", err)
	}
	if len(vids) == 0 {
		return supplierDispatchResult{}, fmt.Errorf("%w: no_cj_variant_ids_found", ErrPermanent)
	}

	products := make([]cjProductRef, 0, len(vids))
	for _, v := range vids {
		products = append(products, cjProductRef{VID: v.VID, Quantity: v.Quantity})
	}

	addr := order.shippingAddressMap()
	countryCode := asString(addr["country"])
	if countryCode == "" {
		countryCode = "DE"
	}

	freightResp, freightErr := client.calculateFreight(ctx, countryCode, products)
	logisticName := "CJPacket Ordinary"
	if freightErr == nil && len(freightResp.Data) > 0 {
		logisticName = bestLogisticName(freightResp)
	}

	params := cjCreateOrderParams{
		OrderNumber:         fmt.Sprintf("DLQ-%s", order.ID[:8]),
		ShippingCountryCode: countryCode,
		ShippingCountry:     countryNameFromCode(countryCode),
		ShippingProvince:    coalesceStr(asString(addr["province"]), asString(addr["state"]), countryCode),
		ShippingCity:        asString(addr["city"]),
		ShippingAddress:     asString(addr["street1"]),
		ShippingAddress2:    asString(addr["street2"]),
		ShippingZip:         asString(addr["zip"]),
		ShippingCustomerName: fmt.Sprintf("%s %s", asString(addr["first_name"]), asString(addr["last_name"])),
		ShippingPhone:       asString(addr["phone"]),
		Email:               order.Email,
		LogisticName:        logisticName,
		FromCountryCode:     "CN",
		Products:            products,
		PayType:             3,
		IOSSType:            3,
		IOSSNumber:          "CJ-IOSS",
		Platform:            "api",
		ShopLogisticsType:   2,
		OrderFlow:           1,
		Remark:              fmt.Sprintf("Auto-fulfill from Delqhi order %s", order.ID[:8]),
	}

	orderResp, err := client.createOrder(ctx, params)
	responsePayload := map[string]any{
		"logistic_name":  logisticName,
		"freight_error":  errStr(freightErr),
		"variant_count":  len(vids),
	}
	if orderResp != nil {
		responsePayload["cj_code"] = orderResp.Code
		responsePayload["cj_message"] = orderResp.Message
		if orderResp.Data != nil {
			responsePayload["cj_order_id"] = orderResp.Data.OrderID
			responsePayload["cj_status"] = orderResp.Data.Status
		}
	}

	if err != nil {
		return supplierDispatchResult{ResponsePayload: responsePayload}, fmt.Errorf("cj_create_order: %w", err)
	}

	externalID := ""
	if orderResp.Data != nil {
		externalID = orderResp.Data.OrderID
	}

	return supplierDispatchResult{
		ExternalOrderID: externalID,
		ResponsePayload: responsePayload,
	}, nil
}

type cjVariantRef struct {
	VID      string
	Quantity int
}

func (p *Processor) loadCJVariantIDs(ctx context.Context, items []supplierDispatchItem) ([]cjVariantRef, error) {
	if len(items) == 0 {
		return nil, nil
	}

	productIDs := make([]string, 0, len(items))
	for _, item := range items {
		if strings.TrimSpace(item.ProductID) != "" {
			productIDs = append(productIDs, item.ProductID)
		}
	}
	if len(productIDs) == 0 {
		return nil, fmt.Errorf("no product IDs in dispatch items")
	}

	rows, err := p.pool.Query(ctx, `
select id::text, metadata->>'cj_vid'
from shop.products
where id::text = any($1::text[])
  and metadata->>'cj_vid' is not null
`, productIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	vidMap := map[string]string{}
	for rows.Next() {
		var pid, vid string
		if err := rows.Scan(&pid, &vid); err != nil {
			return nil, err
		}
		vidMap[pid] = vid
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]cjVariantRef, 0, len(items))
	for _, item := range items {
		vid, ok := vidMap[item.ProductID]
		if !ok || vid == "" {
			return nil, fmt.Errorf("missing cj_vid for product %s (sku=%s)", item.ProductID, item.SKU)
		}
		out = append(out, cjVariantRef{VID: vid, Quantity: item.Quantity})
	}
	return out, nil
}

func countryNameFromCode(code string) string {
	names := map[string]string{
		"DE": "Germany", "AT": "Austria", "CH": "Switzerland",
		"FR": "France", "NL": "Netherlands", "BE": "Belgium",
		"IT": "Italy", "ES": "Spain", "PL": "Poland",
		"GB": "United Kingdom", "US": "United States",
	}
	if n, ok := names[strings.ToUpper(code)]; ok {
		return n
	}
	return code
}

func coalesceStr(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func errStr(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
