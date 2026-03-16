package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListSupplierIncidents(c *gin.Context) {
	page := parseInt(c.Query("page"), 1, 1, 100000)
	limit := parseInt(c.Query("limit"), 50, 1, 500)

	data, err := h.store.ListSupplierIncidents(c.Request.Context(), c.Param("id"), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_incidents_query_failed"})
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

func (h *Handler) CreateSupplierIncident(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.CreateSupplierIncident(c.Request.Context(), c.Param("id"), body, actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_incident_create_failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": item})
}

func (h *Handler) UpdateSupplierIncident(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.UpdateSupplierIncident(c.Request.Context(), c.Param("id"), c.Param("incident_id"), body, actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_incident_update_failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}
