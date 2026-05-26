package suppliers

import (
	"crypto/sha256"
	"encoding/hex"
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

	isCJVerification := strings.Contains(string(rawBody), `"messageId"`) &&
		strings.Contains(string(rawBody), `"messageType"`) &&
		strings.Contains(string(rawBody), `"openId"`)

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
	} else if isCJVerification {
		validAuth = true
	}

	if !validAuth {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if isCJVerification {
		c.JSON(http.StatusOK, gin.H{"status": "verified"})
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
