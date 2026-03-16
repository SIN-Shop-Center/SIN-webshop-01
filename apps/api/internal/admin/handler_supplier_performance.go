package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetSupplierPerformance(c *gin.Context) {
	windowDays := parseInt(c.Query("window_days"), 30, 1, 365)
	item, err := h.store.GetSupplierPerformance(c.Request.Context(), c.Param("id"), windowDays)
	if err != nil {
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_performance_query_failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}
