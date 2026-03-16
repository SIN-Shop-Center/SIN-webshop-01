package admin

import "time"

type OrderSummary struct {
	ID            string    `json:"id"`
	Status        string    `json:"status"`
	Email         string    `json:"email"`
	Currency      string    `json:"currency"`
	TotalAmount   *int      `json:"total_amount,omitempty"`
	Total         *float64  `json:"total,omitempty"`
	PaymentStatus string    `json:"payment_status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type PatchOrderInput struct {
	Status         *string `json:"status"`
	PaymentStatus  *string `json:"payment_status"`
	TrackingNumber *string `json:"tracking_number"`
	TrackingURL    *string `json:"tracking_url"`
	Notes          *string `json:"notes"`
}

type AutomationPolicy struct {
	CatalogEnabled             bool `json:"catalog_enabled"`
	CheckoutEnabled            bool `json:"checkout_enabled"`
	SupplierFulfillmentEnabled bool `json:"supplier_fulfillment_enabled"`
	MailingEnabled             bool `json:"mailing_enabled"`
	MaxRetryAttempts           int  `json:"max_retry_attempts"`
	AlertThresholdMinutes      int  `json:"alert_threshold_minutes"`
}

type SupplierOrderSummary struct {
	ID              string     `json:"id"`
	OrderID         string     `json:"order_id"`
	SupplierID      string     `json:"supplier_id"`
	Status          string     `json:"status"`
	Channel         string     `json:"channel"`
	ExternalOrderID *string    `json:"external_order_id,omitempty"`
	AttemptCount    int        `json:"attempt_count"`
	LastError       *string    `json:"last_error,omitempty"`
	PlacedAt        *time.Time `json:"placed_at,omitempty"`
	DueAt           *time.Time `json:"due_at,omitempty"`
	DiscountUntil   *time.Time `json:"discount_until,omitempty"`
	DiscountPct     *float64   `json:"discount_pct,omitempty"`
	PaidAt          *time.Time `json:"paid_at,omitempty"`
	CostAmount      *int       `json:"cost_amount,omitempty"`
	CostCurrency    string     `json:"cost_currency"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type AutomationHealth struct {
	Policy                       AutomationPolicy `json:"policy"`
	PendingSupplierOrders        int              `json:"pending_supplier_orders"`
	FailedSupplierOrders         int              `json:"failed_supplier_orders"`
	CriticalDLQJobs              int              `json:"critical_dlq_jobs"`
	PaymentWithoutSupplierMinute int              `json:"payment_without_supplier_minutes"`
	Ready                        bool             `json:"ready"`
}
