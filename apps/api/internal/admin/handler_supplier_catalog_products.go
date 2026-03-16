package admin

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListSupplierCatalogProducts(c *gin.Context) {
	page := parseInt(c.Query("page"), 1, 1, 100000)
	limit := parseInt(c.Query("limit"), 50, 1, 500)

	data, err := h.store.ListSupplierCatalogProducts(
		c.Request.Context(),
		c.Param("id"),
		page,
		limit,
		c.Query("search"),
		c.Query("status"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_catalog_products_query_failed"})
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

func (h *Handler) UpsertSupplierCatalogProducts(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	data, err := h.store.UpsertSupplierCatalogProducts(c.Request.Context(), c.Param("id"), body, actorUserID(c))
	if err != nil {
		switch {
		case err == errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_supplier_catalog_products_payload"})
		case notFound(err):
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_catalog_product_not_found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_catalog_products_update_failed"})
		}
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

func (h *Handler) ImportSupplierCatalogProduct(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	data, err := h.store.ImportSupplierCatalogProduct(c.Request.Context(), c.Param("id"), c.Param("catalog_id"), body, actorUserID(c))
	if err != nil {
		switch {
		case err == errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_supplier_catalog_import_payload"})
		case notFound(err):
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_catalog_product_not_found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_catalog_import_failed"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": data})
}

func (h *Handler) TriggerSupplierCatalogSync(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_json"})
		return
	}

	data, err := h.store.TriggerSupplierCatalogSync(c.Request.Context(), c.Param("id"), body, actorUserID(c))
	if err != nil {
		switch {
		case notFound(err):
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_not_found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_catalog_sync_enqueue_failed"})
		}
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"success": true, "data": data})
}

func (h *Handler) SupplierCatalogSyncCallback(c *gin.Context) {
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

	supplierID := strings.TrimSpace(asString(body["supplier_id"]))
	if supplierID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "supplier_id_required"})
		return
	}
	if _, ok := body["items"]; !ok {
		if rawProducts, ok := body["products"]; ok {
			body["items"] = rawProducts
		}
	}

	data, err := h.store.UpsertSupplierCatalogProducts(c.Request.Context(), supplierID, body, "")
	if err != nil {
		switch {
		case err == errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid_supplier_catalog_products_payload"})
		case notFound(err):
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "supplier_catalog_product_not_found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "supplier_catalog_sync_callback_failed"})
		}
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
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
