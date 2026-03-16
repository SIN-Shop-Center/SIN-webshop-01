package admin

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListSupplierOnboardingRuns(c *gin.Context) {
	page := parseInt(c.Query("page"), 1, 1, 100000)
	limit := parseInt(c.Query("limit"), 20, 1, 200)

	data, err := h.store.ListSupplierOnboardingRuns(c.Request.Context(), c.Param("id"), page, limit, c.Query("status"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_onboarding_runs_query_failed"})
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

func (h *Handler) CreateSupplierOnboardingRun(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.CreateSupplierOnboardingRun(c.Request.Context(), c.Param("id"), body, actorUserID(c))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_supplier_onboarding_payload"})
		case errAlreadyRunning:
			c.JSON(http.StatusConflict, gin.H{"success": false, "error": "supplier_onboarding_already_running"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_onboarding_create_failed"})
		}
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": item})
}

func (h *Handler) GetSupplierOnboardingRun(c *gin.Context) {
	item, err := h.store.GetSupplierOnboardingRun(c.Request.Context(), c.Param("id"), c.Param("run_id"))
	if err != nil {
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_onboarding_run_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_onboarding_run_query_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}

func (h *Handler) PatchSupplierOnboardingRun(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.PatchSupplierOnboardingRun(c.Request.Context(), c.Param("id"), c.Param("run_id"), body, actorUserID(c))
	if err != nil {
		switch {
		case err == errEmptyPatch:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "empty_patch"})
		case notFound(err):
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_onboarding_run_not_found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_onboarding_run_update_failed"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}

func (h *Handler) SupplierOnboardingCallback(c *gin.Context) {
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_body"})
		return
	}

	signature := strings.TrimSpace(c.GetHeader("X-Simone-Signature"))
	if signature == "" {
		signature = strings.TrimSpace(c.GetHeader("X-Supplier-Signature"))
	}
	if !verifyOnboardingCallbackSignature(resolveOnboardingCallbackSecret(), rawBody, signature) {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "invalid_signature"})
		return
	}

	body := map[string]any{}
	if err := json.Unmarshal(rawBody, &body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	if rawLog := strings.TrimSpace(asString(body["log"])); rawLog != "" && strings.TrimSpace(asString(body["redacted_log"])) == "" {
		body["redacted_log"] = redactSecrets(rawLog)
	}
	if rawLog := strings.TrimSpace(asString(body["redacted_log"])); rawLog != "" {
		body["redacted_log"] = redactSecrets(rawLog)
	}
	if rawError := strings.TrimSpace(asString(body["error_message"])); rawError != "" {
		body["error_message"] = redactSecrets(rawError)
	}

	item, err := h.store.ApplySupplierOnboardingCallback(c.Request.Context(), body)
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_onboarding_callback_payload"})
		case errBlocked:
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "supplier_onboarding_domain_not_allowed"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_onboarding_callback_failed"})
		}
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"success": true, "data": item})
}
