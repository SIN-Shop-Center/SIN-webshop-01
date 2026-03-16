package admin

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *Handler) ListSupplierContracts(c *gin.Context) {
	page := parseInt(c.Query("page"), 1, 1, 100000)
	limit := parseInt(c.Query("limit"), 50, 1, 500)

	data, err := h.store.ListSupplierContracts(c.Request.Context(), c.Param("id"), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_contracts_query_failed"})
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

func (h *Handler) CreateSupplierContract(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	item, err := h.store.CreateSupplierContract(c.Request.Context(), c.Param("id"), body, actorUserID(c), actorRole(c), requestID(c))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_supplier_contract_payload"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_contract_create_failed"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": item})
}

func (h *Handler) PresignSupplierContractUpload(c *gin.Context) {
	if h.r2 == nil || !h.r2.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"success": false, "error": "supplier_contracts_storage_not_configured"})
		return
	}

	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	supplierID := strings.TrimSpace(c.Param("id"))
	fileName := strings.TrimSpace(asString(body["file_name"]))
	contentType := strings.TrimSpace(asString(body["content_type"]))
	if fileName == "" {
		fileName = "contract.pdf"
	}
	safeName := sanitizeUploadFileName(fileName)
	if safeName == "" {
		safeName = "contract.pdf"
	}

	key := fmt.Sprintf("suppliers/%s/contracts/%s/%s", supplierID, uuid.NewString(), safeName)
	pre, err := h.r2.PresignPutObject(c.Request.Context(), key, contentType, 0, map[string]string{
		"supplier_id": supplierID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_contract_upload_presign_failed"})
		return
	}

	data := gin.H{
		"file_object_key": key,
		"upload_url":      pre.URL,
		"method":          pre.Method,
	}
	if len(pre.Headers) > 0 {
		data["headers"] = pre.Headers
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *Handler) GetSupplierContractDownloadURL(c *gin.Context) {
	if h.r2 == nil || !h.r2.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"success": false, "error": "supplier_contracts_storage_not_configured"})
		return
	}

	item, err := h.store.GetSupplierContract(c.Request.Context(), c.Param("id"), c.Param("contract_id"))
	if err != nil {
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_contract_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_contract_query_failed"})
		return
	}

	key := asString(item["file_object_key"])
	if key == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_contract_storage_key_missing"})
		return
	}

	url, err := h.r2.PresignGetObject(c.Request.Context(), key, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_contract_download_presign_failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"download_url": url}})
}

func sanitizeUploadFileName(input string) string {
	trimmed := strings.TrimSpace(input)
	trimmed = strings.ReplaceAll(trimmed, "\\", "/")
	trimmed = strings.TrimSpace(filepath.Base(trimmed))
	trimmed = strings.TrimSpace(strings.ReplaceAll(trimmed, " ", "_"))

	if trimmed == "" {
		return ""
	}
	if len(trimmed) > 160 {
		trimmed = trimmed[len(trimmed)-160:]
	}

	out := make([]rune, 0, len(trimmed))
	for _, r := range trimmed {
		switch {
		case r >= 'a' && r <= 'z':
			out = append(out, r)
		case r >= 'A' && r <= 'Z':
			out = append(out, r)
		case r >= '0' && r <= '9':
			out = append(out, r)
		case r == '.' || r == '-' || r == '_' || r == '+':
			out = append(out, r)
		default:
		}
	}
	if len(out) == 0 {
		return ""
	}
	return string(out)
}
