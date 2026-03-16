package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListSuppliers(c *gin.Context) {
	params := SupplierListParams{
		Page:             parseInt(c.Query("page"), 1, 1, 100000),
		Limit:            parseInt(c.Query("limit"), 20, 1, 200),
		Status:           c.Query("status"),
		Country:          c.Query("country"),
		OnboardingStatus: c.Query("onboarding_status"),
		ComplianceState:  c.Query("compliance_state"),
		Search:           c.Query("search"),
		SortBy:           c.Query("sort_by"),
		SortOrder:        c.Query("sort_order"),
	}

	items, total, err := h.store.ListSuppliers(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "suppliers_query_failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":     items,
			"suppliers": items,
			"pagination": gin.H{
				"page":       params.Page,
				"limit":      params.Limit,
				"total":      total,
				"totalPages": ceilPages(total, params.Limit),
			},
		},
	})
}

func (h *Handler) CreateSupplier(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.CreateSupplier(c.Request.Context(), body, actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "name_and_email_required"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_create_failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": item})
}
