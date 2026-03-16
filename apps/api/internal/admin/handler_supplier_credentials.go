package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetSupplierCredentials(c *gin.Context) {
	item, err := h.store.GetSupplierCredentials(c.Request.Context(), c.Param("id"), c.Query("provider"))
	if err != nil {
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_credentials_query_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}

func (h *Handler) UpsertSupplierCredentials(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.UpsertSupplierCredentials(c.Request.Context(), c.Param("id"), body, actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_credentials_payload"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_credentials_update_failed"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}
