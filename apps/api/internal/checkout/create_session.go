package checkout

import (
	"errors"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) CreateSession(c *gin.Context) {
	var in SessionRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid_json"})
		return
	}
	if err := normalizeAndValidateSessionRequest(&in); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	idempotencyKey := strings.TrimSpace(c.GetHeader("Idempotency-Key"))
	if idempotencyKey == "" {
		c.JSON(400, gin.H{"error": "missing_idempotency_key"})
		return
	}
	existing, err := h.store.GetCheckoutSessionByIdempotency(c.Request.Context(), idempotencyKey)
	if err != nil {
		c.JSON(500, gin.H{"error": "checkout_session_lookup_failed"})
		return
	}
	if existing != nil {
		c.JSON(200, toSessionResponse(existing))
		return
	}

	products, err := h.store.LoadCatalogProducts(c.Request.Context(), collectItemIdentifiers(in.Items))
	if err != nil {
		c.JSON(500, gin.H{"error": "catalog_lookup_failed"})
		return
	}
	pricedItems, subtotal, err := buildPricedItems(in.Items, products)
	if err != nil {
		switch {
		case errors.Is(err, errProductUnavailable):
			c.JSON(409, gin.H{"error": errProductUnavailable.Error()})
		default:
			c.JSON(400, gin.H{"error": errInvalidItemPayload.Error()})
		}
		return
	}
	shippingAmount := shippingAmountForSubtotal(subtotal)
	totalAmount := subtotal + shippingAmount
	orderID := orderIDFromIdempotencyKey(idempotencyKey)
	siteURL, err := ResolveSiteURL(h.options.SiteURL)
	if err != nil {
		c.JSON(503, gin.H{"error": err.Error()})
		return
	}

	err = h.store.EnsurePendingOrder(c.Request.Context(), CreateOrderInput{
		OrderID:          orderID,
		CustomerID:       customerIDFromContext(c),
		Email:            in.Email,
		Currency:         in.Currency,
		ShippingMethod:   map[bool]string{true: "standard_free", false: "standard"}[shippingAmount == 0],
		CustomerType:     in.CustomerType,
		CompanyName:      in.CompanyName,
		VATID:            in.VATID,
		PurchaseOrderRef: in.PurchaseOrderRef,
		ShippingAddress:  in.ShippingAddress,
		Items:            pricedItems,
		SubtotalAmount:   subtotal,
		ShippingAmount:   shippingAmount,
		TotalAmount:      totalAmount,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "order_create_failed", "detail": err.Error()})
		return
	}

	stripeSession, err := h.stripe.CreateHostedCheckout(StripeSessionInput{
		IdempotencyKey: idempotencyKey,
		OrderID:        orderID,
		Email:          in.Email,
		Currency:       in.Currency,
		Items:          pricedItems,
		ShippingAmount: shippingAmount,
		SiteURL:        siteURL,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "stripe_checkout_session_failed"})
		return
	}

	var expiresAt *time.Time
	if stripeSession.ExpiresAt > 0 {
		t := time.Unix(stripeSession.ExpiresAt, 0).UTC()
		expiresAt = &t
	}
	saved, err := h.store.UpsertCheckoutSession(c.Request.Context(), SaveCheckoutSessionInput{
		IdempotencyKey:  idempotencyKey,
		OrderID:         orderID,
		StripeSessionID: stripeSession.ID,
		CheckoutURL:     stripeSession.URL,
		Status:          "requires_payment",
		CustomerEmail:   in.Email,
		Currency:        in.Currency,
		AmountTotal:     totalAmount,
		ExpiresAt:       expiresAt,
	})
	if err != nil {
		if isUniqueViolation(err) {
			row, lookupErr := h.store.GetCheckoutSessionByIdempotency(c.Request.Context(), idempotencyKey)
			if lookupErr == nil && row != nil {
				c.JSON(200, toSessionResponse(row))
				return
			}
			c.JSON(409, gin.H{"error": "checkout_session_conflict"})
			return
		}
		c.JSON(500, gin.H{"error": "checkout_session_persist_failed"})
		return
	}

	c.JSON(200, toSessionResponse(saved))
}
