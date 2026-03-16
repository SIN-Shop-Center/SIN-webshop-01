package suppliers

type WebhookPayload struct {
	EventID         string
	OrderID         string
	Status          string
	TrackingNumber  string
	TrackingURL     string
	ExternalOrderID string
	Raw             map[string]any
}
