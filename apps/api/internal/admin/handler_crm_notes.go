package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListCRMNotes(c *gin.Context) {
	page := parseInt(c.Query("page"), 1, 1, 100000)
	limit := parseInt(c.Query("limit"), 50, 1, 500)

	data, err := h.store.ListCRMNotes(
		c.Request.Context(),
		page,
		limit,
		c.Query("entity_type"),
		c.Query("entity_id"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "crm_notes_query_failed"})
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

func (h *Handler) CreateCRMNote(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.CreateCRMNote(c.Request.Context(), body, actorUserID(c))
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_crm_note_payload"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "crm_note_create_failed"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": item})
}
