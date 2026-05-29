package suppliers

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	store   *Store
	options Options
}

func NewHandler(pool *pgxpool.Pool, options Options) *Handler {
	return &Handler{
		store:   NewStore(pool),
		options: options,
	}
}

func (h *Handler) Webhook(c *gin.Context) {
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
		return
	}

	signature := firstNonEmpty(
		c.GetHeader("X-Simone-Signature"),
		c.GetHeader("X-Supplier-Signature"),
	)
	apiKey := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")

	cjEvent := parseCJWebhookPayload(rawBody)

	validAuth := false
	if signature != "" && verifySignature(h.options.WebhookSecret, rawBody, signature) {
		validAuth = true
	} else if apiKey != "" {
		supplierID, scopes, err := h.store.ValidateAPIKey(c.Request.Context(), apiKey)
		if err == nil && supplierID != "" {
			for _, s := range scopes {
				if s == "webhook" || s == "all" {
					validAuth = true
					break
				}
			}
		}
	} else if cjEvent != nil && cjEvent.isOpenIDValid() {
		validAuth = true
	}

	if !validAuth {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if cjEvent != nil && cjEvent.isVerification() {
		c.JSON(http.StatusOK, gin.H{"status": "verified"})
		return
	}

	if cjEvent != nil && cjEvent.isOrderEvent() {
		payload, resolveErr := h.store.ResolveCJEvent(c.Request.Context(), cjEvent)
		if resolveErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cj_webhook_resolution_failed"})
			return
		}
		if payload == nil {
			c.JSON(http.StatusOK, gin.H{"status": "ignored", "reason": "order_not_found"})
			return
		}
		if strings.TrimSpace(payload.EventID) == "" {
			payload.EventID = fallbackEventID(c.Param("supplier"), rawBody)
		}
		duplicate, err := h.store.ProcessWebhook(c.Request.Context(), c.Param("supplier"), *payload)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "supplier_webhook_processing_failed"})
			return
		}
		if duplicate {
			c.JSON(http.StatusOK, gin.H{"status": "duplicate"})
			return
		}
		c.JSON(http.StatusAccepted, gin.H{"status": "accepted"})
		return
	}

	payload, err := DecodeWebhookPayload(rawBody)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_payload"})
		return
	}
	if strings.TrimSpace(payload.EventID) == "" {
		payload.EventID = fallbackEventID(c.Param("supplier"), rawBody)
	}

	duplicate, err := h.store.ProcessWebhook(c.Request.Context(), c.Param("supplier"), payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "supplier_webhook_processing_failed"})
		return
	}
	if duplicate {
		c.JSON(http.StatusOK, gin.H{"status": "duplicate"})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"status": "accepted"})
}

type cjWebhookEvent struct {
	MessageID   string      `json:"messageId"`
	MessageType string      `json:"messageType"`
	OpenID      json.Number `json:"openId"`
	Data        struct {
		OrderID       string `json:"orderId"`
		OrderNumber   string `json:"orderNumber"`
		OrderStatus   string `json:"orderStatus"`
		TrackNumber   string `json:"trackNumber"`
		LogisticName  string `json:"logisticName"`
		TrackingURL   string `json:"trackingUrl"`
	} `json:"data"`
}

func parseCJWebhookPayload(raw []byte) *cjWebhookEvent {
	var evt cjWebhookEvent
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&evt); err != nil {
		return nil
	}
	if strings.TrimSpace(evt.MessageID) == "" {
		return nil
	}
	if strings.TrimSpace(evt.MessageType) == "" {
		return nil
	}
	return &evt
}

func (e *cjWebhookEvent) isVerification() bool {
	if e == nil || strings.TrimSpace(e.MessageType) == "" {
		return true
	}
	return !e.isOrderEvent()
}

func (e *cjWebhookEvent) isOrderEvent() bool {
	return strings.TrimSpace(e.Data.OrderID) != "" || strings.TrimSpace(e.Data.OrderNumber) != ""
}

func (e *cjWebhookEvent) isOpenIDValid() bool {
	return strings.TrimSpace(e.OpenID.String()) != ""
}

func (e *cjWebhookEvent) toStatus() string {
	switch strings.ToLower(strings.TrimSpace(e.Data.OrderStatus)) {
	case "placed", "pending":
		return "placed"
	case "processing", "confirmed":
		return "processing"
	case "shipped", "in_transit", "in transit":
		return "shipped"
	case "delivered":
		return "delivered"
	case "cancelled", "failed":
		return "failed"
	default:
		return strings.ToLower(strings.TrimSpace(e.Data.OrderStatus))
	}
}

func fallbackEventID(supplier string, body []byte) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(supplier) + ":" + string(body)))
	return "supplier:" + hex.EncodeToString(sum[:])
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
