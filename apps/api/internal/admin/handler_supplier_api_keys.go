package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListSupplierAPIKeys(c *gin.Context) {
	page := parseInt(c.Query("page"), 1, 1, 100000)
	limit := parseInt(c.Query("limit"), 50, 1, 500)

	data, err := h.store.ListSupplierAPIKeys(c.Request.Context(), c.Param("id"), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_api_keys_query_failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": data.Items,
			"pagination": gin.H{
				"page":       data.Page,
				"limit":      data.Limit,
				"total":      data.Total,
				"totalPages": ceilPages(data.Total, data.Limit),
			},
		},
	})
}

func (h *Handler) CreateSupplierAPIKey(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.CreateSupplierAPIKey(c.Request.Context(), c.Param("id"), body, actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_api_key_create_failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": item})
}

func (h *Handler) RevokeSupplierAPIKey(c *gin.Context) {
	item, err := h.store.RevokeSupplierAPIKey(c.Request.Context(), c.Param("id"), c.Param("key_id"), actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_api_key_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_api_key_revoke_failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}
