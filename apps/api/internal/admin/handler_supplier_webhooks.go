package admin

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"simone-webshop/apps/api/internal/suppliers"
)

func (h *Handler) TestSupplierWebhookInbound(c *gin.Context) {
	supplierID := strings.TrimSpace(c.Param("id"))
	
	var input struct {
		Payload map[string]any `json:"payload"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	raw, _ := json.Marshal(input.Payload)
	payload, err := suppliers.DecodeWebhookPayload(raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// We use the supplier ID as slug for the test processing if needed, 
	// or find the real slug.
	supplier, err := h.store.GetSupplier(c.Request.Context(), supplierID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_not_found"})
		return
	}
	slug := asString(supplier["name"]) // using name as slug for now or some unique identifier

	duplicate, err := h.suppliersStore.ProcessWebhook(c.Request.Context(), slug, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true, 
		"data": gin.H{
			"duplicate": duplicate,
			"processed": true,
		},
	})
}

func (h *Handler) TestSupplierWebhookOutbound(c *gin.Context) {
	supplierID := strings.TrimSpace(c.Param("id"))
	
	var input struct {
		Payload map[string]any `json:"payload"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	result, err := h.store.TestSupplierWebhookOutbound(c.Request.Context(), supplierID, input.Payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}
