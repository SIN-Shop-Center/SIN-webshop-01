package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetSupplier(c *gin.Context) {
	item, err := h.store.GetSupplier(c.Request.Context(), c.Param("id"))
	if err != nil {
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_query_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}

func (h *Handler) UpdateSupplier(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.UpdateSupplier(c.Request.Context(), c.Param("id"), body, actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		switch {
		case err == errEmptyPatch:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "empty_patch"})
		case notFound(err):
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_not_found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_update_failed"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}

func (h *Handler) DeleteSupplier(c *gin.Context) {
	err := h.store.DeleteSupplier(c.Request.Context(), c.Param("id"), actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		switch {
		case err == errBlocked:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "supplier_has_products"})
		case notFound(err):
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_not_found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_delete_failed"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "supplier_deleted"})
}
