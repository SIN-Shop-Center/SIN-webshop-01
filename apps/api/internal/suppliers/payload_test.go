package suppliers

import "testing"

func TestDecodeWebhookPayloadSupportsSnakeAndCamelCase(t *testing.T) {
	raw := []byte(`{
  "eventId":"evt_123",
  "order_id":"order_123",
  "status":"shipped",
  "trackingNumber":"trk123",
  "tracking_url":"https://tracking.example.com/trk123",
  "externalOrderId":"sup-789"
}`)

	payload, err := DecodeWebhookPayload(raw)
	if err != nil {
		t.Fatalf("unexpected decode error: %v", err)
	}
	if payload.EventID != "evt_123" {
		t.Fatalf("expected event id evt_123, got %q", payload.EventID)
	}
	if payload.OrderID != "order_123" {
		t.Fatalf("expected order id order_123, got %q", payload.OrderID)
	}
	if payload.Status != "shipped" {
		t.Fatalf("expected status shipped, got %q", payload.Status)
	}
	if payload.TrackingNumber != "trk123" {
		t.Fatalf("expected tracking number trk123, got %q", payload.TrackingNumber)
	}
}

func TestDecodeWebhookPayloadRequiresOrderAndStatus(t *testing.T) {
	if _, err := DecodeWebhookPayload([]byte(`{"status":"shipped"}`)); err == nil {
		t.Fatalf("expected missing order_id validation error")
	}
	if _, err := DecodeWebhookPayload([]byte(`{"order_id":"x"}`)); err == nil {
		t.Fatalf("expected missing status validation error")
	}
}
