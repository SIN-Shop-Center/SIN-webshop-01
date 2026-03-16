package admin

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

type WebhookTestOutboundResult struct {
	Status       int    `json:"status"`
	Body         string `json:"body"`
	ResponseTime string `json:"response_time"`
	Error        string `json:"error,omitempty"`
}

func (s *Store) TestSupplierWebhookOutbound(ctx context.Context, supplierID string, payload map[string]any) (WebhookTestOutboundResult, error) {
	supplier, err := s.GetSupplier(ctx, supplierID)
	if err != nil {
		return WebhookTestOutboundResult{}, err
	}

	endpoint := asString(supplier["api_endpoint"])
	if endpoint == "" {
		return WebhookTestOutboundResult{}, fmt.Errorf("supplier_endpoint_missing")
	}

	rawBody, err := marshalAuditJSON(payload)
	if err != nil {
		return WebhookTestOutboundResult{}, err
	}
	bodyBytes := []byte(asString(rawBody))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return WebhookTestOutboundResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Simone-Webshop-Admin-Tester/1.0")

	// If there is an API key, we could set it here.
	// For now, simple POST.

	client := &http.Client{Timeout: 10 * time.Second}
	start := time.Now()
	resp, err := client.Do(req)
	elapsed := time.Since(start)

	if err != nil {
		return WebhookTestOutboundResult{
			Error:        err.Error(),
			ResponseTime: elapsed.String(),
		}, nil
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*10)) // limit to 10KB

	return WebhookTestOutboundResult{
		Status:       resp.StatusCode,
		Body:         string(respBody),
		ResponseTime: elapsed.String(),
	}, nil
}
