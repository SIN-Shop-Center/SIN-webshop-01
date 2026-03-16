package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListCRMTasks(c *gin.Context) {
	page := parseInt(c.Query("page"), 1, 1, 100000)
	limit := parseInt(c.Query("limit"), 50, 1, 500)

	data, err := h.store.ListCRMTasks(
		c.Request.Context(),
		page,
		limit,
		c.Query("entity_type"),
		c.Query("entity_id"),
		c.Query("status"),
		c.Query("owner_id"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "crm_tasks_query_failed"})
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

func (h *Handler) CreateCRMTask(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.CreateCRMTask(c.Request.Context(), body, actorUserID(c))
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_crm_task_payload"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "crm_task_create_failed"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": item})
}

func (h *Handler) PatchCRMTask(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.PatchCRMTask(c.Request.Context(), c.Param("id"), body)
	if err != nil {
		switch {
		case err == errEmptyPatch:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "empty_patch"})
		case notFound(err):
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "crm_task_not_found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "crm_task_update_failed"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}

func (h *Handler) ListCRMActivities(c *gin.Context) {
	page := parseInt(c.Query("page"), 1, 1, 100000)
	limit := parseInt(c.Query("limit"), 50, 1, 500)

	data, err := h.store.ListCRMActivities(
		c.Request.Context(),
		page,
		limit,
		c.Query("entity_type"),
		c.Query("entity_id"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "crm_activities_query_failed"})
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

func (h *Handler) CreateCRMActivity(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.CreateCRMActivity(c.Request.Context(), body, actorUserID(c))
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_crm_activity_payload"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "crm_activity_create_failed"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": item})
}
