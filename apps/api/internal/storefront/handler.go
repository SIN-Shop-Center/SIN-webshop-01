package storefront

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"simone-webshop/apps/api/internal/checkout"
)

type Handler struct {
	store         *Store
	checkoutStore *checkout.Store
	stripe        *checkout.StripeClient
	options       Options
}

func NewHandler(pool *pgxpool.Pool, options Options) *Handler {
	return &Handler{
		store:         NewStore(pool),
		checkoutStore: checkout.NewStore(pool),
		stripe:        checkout.NewStripeClient(options.StripeSecretKey),
		options:       options,
	}
}

func (h *Handler) GetCart(c *gin.Context) {
	session, err := h.ensureSession(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_session_failed"})
		return
	}
	cart, err := h.loadCartResponse(c, session.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_failed"})
		return
	}
	c.JSON(http.StatusOK, cart)
}

func (h *Handler) AddCartItem(c *gin.Context) {
	session, err := h.ensureSession(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_session_failed"})
		return
	}
	var in AddCartItemInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	if strings.TrimSpace(in.SKU) == "" || in.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_cart_item"})
		return
	}
	if err := h.store.UpsertCartItem(c.Request.Context(), session.ID, in.SKU, in.Quantity); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "product_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_upsert_failed"})
		return
	}
	cart, err := h.loadCartResponse(c, session.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_failed"})
		return
	}
	c.JSON(http.StatusOK, cart)
}

func (h *Handler) PatchCartItem(c *gin.Context) {
	session, err := h.ensureSession(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_session_failed"})
		return
	}
	var in PatchCartItemInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	if in.Quantity <= 0 {
		if err := h.store.DeleteCartItem(c.Request.Context(), session.ID, c.Param("sku")); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_delete_failed"})
			return
		}
	} else {
		if err := h.store.UpsertCartItem(c.Request.Context(), session.ID, c.Param("sku"), in.Quantity); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "product_not_found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_upsert_failed"})
			return
		}
	}
	cart, err := h.loadCartResponse(c, session.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_failed"})
		return
	}
	c.JSON(http.StatusOK, cart)
}

func (h *Handler) DeleteCartItem(c *gin.Context) {
	session, err := h.ensureSession(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_session_failed"})
		return
	}
	if err := h.store.DeleteCartItem(c.Request.Context(), session.ID, c.Param("sku")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_delete_failed"})
		return
	}
	cart, err := h.loadCartResponse(c, session.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_failed"})
		return
	}
	c.JSON(http.StatusOK, cart)
}

func (h *Handler) ClearCart(c *gin.Context) {
	session, err := h.ensureSession(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_session_failed"})
		return
	}
	if err := h.store.ClearCart(c.Request.Context(), session.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_clear_failed"})
		return
	}
	cart, err := h.loadCartResponse(c, session.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_failed"})
		return
	}
	c.JSON(http.StatusOK, cart)
}

func (h *Handler) GetCheckoutSession(c *gin.Context) {
	session, err := h.ensureSession(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_session_failed"})
		return
	}
	cart, err := h.loadCartResponse(c, session.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_failed"})
		return
	}
	c.JSON(http.StatusOK, cart)
}

func (h *Handler) CreateCheckoutSession(c *gin.Context) {
	session, err := h.ensureSession(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_session_failed"})
		return
	}
	var in CheckoutSessionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	if err := validateCheckoutInput(in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cart, err := h.loadCartResponse(c, session.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_cart_failed"})
		return
	}
	if len(cart.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart_empty"})
		return
	}

	idempotencyKey := stableCheckoutKey(session.ID, cart, in)
	orderID := orderIDFromSessionSeed(idempotencyKey)
	pricedItems := make([]checkout.PricedItem, 0, len(cart.Items))
	for _, item := range cart.Items {
		pricedItems = append(pricedItems, checkout.PricedItem{
			ProductID:       item.ProductID,
			SKU:             item.SKU,
			Title:           item.Title,
			Quantity:        item.Quantity,
			UnitPriceAmount: item.UnitPriceAmount,
			LineTotalAmount: item.LineTotalAmount,
		})
	}

	if err := h.checkoutStore.EnsurePendingOrder(c.Request.Context(), checkout.CreateOrderInput{
		OrderID:         orderID,
		Email:           strings.TrimSpace(in.Email),
		Currency:        "EUR",
		ShippingMethod:  map[bool]string{true: "standard_free", false: "standard"}[cart.ShippingAmount == 0],
		ShippingAddress: toCheckoutAddress(in),
		Items:           pricedItems,
		SubtotalAmount:  cart.SubtotalAmount,
		ShippingAmount:  cart.ShippingAmount,
		TotalAmount:     cart.TotalAmount,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "order_create_failed"})
		return
	}

	if err := h.store.AttachOrderToSession(c.Request.Context(), orderID, session.ID, in.PaymentMethod); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "order_session_attach_failed"})
		return
	}
	if err := h.store.TouchSession(c.Request.Context(), session.ID, in.Email); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "store_session_touch_failed"})
		return
	}

	existing, err := h.checkoutStore.GetCheckoutSessionByIdempotency(c.Request.Context(), idempotencyKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "checkout_session_lookup_failed"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusOK, CheckoutSessionResponse{
			OrderID:         existing.OrderID,
			StripeSessionID: existing.StripeSessionID,
			CheckoutURL:     existing.CheckoutURL,
			Status:          existing.Status,
		})
		return
	}

	siteURL, err := checkout.ResolveSiteURL(h.options.SiteURL)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	stripeSession, err := h.stripe.CreateHostedCheckout(checkout.StripeSessionInput{
		IdempotencyKey: idempotencyKey,
		OrderID:        orderID,
		Email:          strings.TrimSpace(in.Email),
		Currency:       "eur",
		Items:          pricedItems,
		ShippingAmount: cart.ShippingAmount,
		SiteURL:        siteURL,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "stripe_checkout_session_failed"})
		return
	}

	saved, err := h.checkoutStore.UpsertCheckoutSession(c.Request.Context(), checkout.SaveCheckoutSessionInput{
		IdempotencyKey:  idempotencyKey,
		OrderID:         orderID,
		StripeSessionID: stripeSession.ID,
		CheckoutURL:     stripeSession.URL,
		Status:          "requires_payment",
		CustomerEmail:   strings.TrimSpace(in.Email),
		Currency:        "EUR",
		AmountTotal:     cart.TotalAmount,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "checkout_session_persist_failed"})
		return
	}

	c.JSON(http.StatusOK, CheckoutSessionResponse{
		OrderID:         saved.OrderID,
		StripeSessionID: saved.StripeSessionID,
		CheckoutURL:     saved.CheckoutURL,
		Status:          saved.Status,
	})
}

func (h *Handler) GetOrder(c *gin.Context) {
	orderID := strings.TrimSpace(c.Query("order_id"))
	sessionID := strings.TrimSpace(c.Query("session_id"))
	if orderID == "" || sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order_id_and_session_id_required"})
		return
	}
	order, err := h.store.LoadOrderForStorefront(c.Request.Context(), orderID, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "order_lookup_failed"})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order_not_found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

func (h *Handler) CreateAccessRequest(c *gin.Context) {
	var in AccessRequestInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	in.Email = strings.TrimSpace(strings.ToLower(in.Email))
	if in.Email == "" || (in.Role != "customer" && in.Role != "admin") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_access_request"})
		return
	}
	id, err := h.store.CreateAccessRequest(c.Request.Context(), in)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "access_request_failed"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"id":      id,
		"status":  "pending",
		"message": "Zugangsanfrage gespeichert.",
	})
}

func (h *Handler) loadCartResponse(c *gin.Context, sessionID string) (CartResponse, error) {
	items, err := h.store.LoadCart(c.Request.Context(), sessionID)
	if err != nil {
		return CartResponse{}, err
	}
	subtotal := 0
	itemCount := 0
	for _, item := range items {
		subtotal += item.LineTotalAmount
		itemCount += item.Quantity
	}
	shipping := defaultShippingAmount
	if subtotal == 0 || subtotal >= freeShippingThreshold {
		shipping = 0
	}
	return CartResponse{
		SessionID:      sessionID,
		Currency:       "EUR",
		ItemCount:      itemCount,
		SubtotalAmount: subtotal,
		ShippingAmount: shipping,
		TotalAmount:    subtotal + shipping,
		Items:          items,
	}, nil
}

func toCheckoutAddress(in CheckoutSessionInput) checkout.ShippingAddress {
	return checkout.ShippingAddress{
		FirstName: strings.TrimSpace(in.FirstName),
		LastName:  strings.TrimSpace(in.LastName),
		Street1:   strings.TrimSpace(in.Street1),
		Street2:   strings.TrimSpace(in.Street2),
		City:      strings.TrimSpace(in.City),
		Zip:       strings.TrimSpace(in.Zip),
		Country:   strings.TrimSpace(in.Country),
		Phone:     strings.TrimSpace(in.Phone),
	}
}

func validateCheckoutInput(in CheckoutSessionInput) error {
	switch {
	case strings.TrimSpace(in.Email) == "":
		return errors.New("email_required")
	case strings.TrimSpace(in.FirstName) == "":
		return errors.New("first_name_required")
	case strings.TrimSpace(in.LastName) == "":
		return errors.New("last_name_required")
	case strings.TrimSpace(in.Street1) == "":
		return errors.New("street_required")
	case strings.TrimSpace(in.Zip) == "":
		return errors.New("zip_required")
	case strings.TrimSpace(in.City) == "":
		return errors.New("city_required")
	case strings.TrimSpace(in.Country) == "":
		return errors.New("country_required")
	case strings.TrimSpace(in.PaymentMethod) == "":
		return errors.New("payment_method_required")
	default:
		return nil
	}
}
