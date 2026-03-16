package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) TriggerInventoryReorderScan(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.TriggerInventoryReorderScan(c.Request.Context(), body, actorUserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "inventory_reorder_scan_enqueue_failed"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"success": true, "data": item})
}
