package storefront

import "time"

const (
	sessionCookieName      = "simone_store_session"
	freeShippingThreshold  = 5000
	defaultShippingAmount  = 499
	defaultSessionDuration = 180 * 24 * time.Hour
)

type Options struct {
	SiteURL         string
	StripeSecretKey string
}

type SessionRecord struct {
	ID    string
	Email string
}

type CartItem struct {
	ProductID       string `json:"product_id"`
	SKU             string `json:"sku"`
	Slug            string `json:"slug"`
	Title           string `json:"title"`
	Category        string `json:"category"`
	ImageURL        string `json:"image_url"`
	Quantity        int    `json:"quantity"`
	UnitPriceAmount int    `json:"unit_price_amount"`
	LineTotalAmount int    `json:"line_total_amount"`
	Stock           int    `json:"stock"`
	MaxQuantity     int    `json:"max_quantity"`
}

type CartResponse struct {
	SessionID      string     `json:"session_id"`
	Currency       string     `json:"currency"`
	ItemCount      int        `json:"item_count"`
	SubtotalAmount int        `json:"subtotal_amount"`
	ShippingAmount int        `json:"shipping_amount"`
	TotalAmount    int        `json:"total_amount"`
	Items          []CartItem `json:"items"`
}

type AddCartItemInput struct {
	SKU      string `json:"sku"`
	Quantity int    `json:"quantity"`
}

type PatchCartItemInput struct {
	Quantity int `json:"quantity"`
}

type CheckoutSessionInput struct {
	Email         string `json:"email"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	Street1       string `json:"street1"`
	Street2       string `json:"street2"`
	City          string `json:"city"`
	Zip           string `json:"zip"`
	Country       string `json:"country"`
	Phone         string `json:"phone"`
	PaymentMethod string `json:"payment_method"`
}

type ShippingAddress struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Street1   string `json:"street1"`
	Street2   string `json:"street2"`
	City      string `json:"city"`
	Zip       string `json:"zip"`
	Country   string `json:"country"`
	Phone     string `json:"phone"`
}

type CheckoutSessionResponse struct {
	OrderID         string `json:"order_id"`
	StripeSessionID string `json:"stripe_session_id"`
	CheckoutURL     string `json:"checkout_url"`
	Status          string `json:"status"`
}

type OrderLookupResponse struct {
	OrderID         string          `json:"order_id"`
	Status          string          `json:"status"`
	PaymentStatus   string          `json:"payment_status"`
	PaymentMethod   string          `json:"payment_method"`
	Email           string          `json:"email"`
	Currency        string          `json:"currency"`
	CreatedAt       time.Time       `json:"created_at"`
	SubtotalAmount  int             `json:"subtotal_amount"`
	ShippingAmount  int             `json:"shipping_amount"`
	TotalAmount     int             `json:"total_amount"`
	ShippingMethod  string          `json:"shipping_method"`
	ShippingAddress ShippingAddress `json:"shipping_address"`
	Items           []CartItem      `json:"items"`
}

type AccessRequestInput struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	Note  string `json:"note"`
}
