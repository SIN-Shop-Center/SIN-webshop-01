package admin

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const ugcUploadMaxBytes = 8 << 20

func (h *Handler) GetUGCGeneratorSettings(c *gin.Context) {
	settings, err := h.store.GetUGCSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_settings_query_failed"})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) GetUGCSettings(c *gin.Context) {
	h.GetUGCGeneratorSettings(c)
}

func (h *Handler) UpdateUGCGeneratorSettings(c *gin.Context) {
	patch := map[string]any{}
	if err := c.ShouldBindJSON(&patch); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	settings, err := h.store.UpdateUGCSettings(c.Request.Context(), patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_settings_update_failed"})
		return
	}
	if settings.Enabled && settings.Mode == "auto" {
		_ = h.store.RequestUGCAutopilotScan(c.Request.Context(), "settings_updated")
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) UpdateUGCSettings(c *gin.Context) {
	h.UpdateUGCGeneratorSettings(c)
}

func (h *Handler) ListUGCPersonAssets(c *gin.Context) {
	limit := parseInt(c.Query("limit"), 24, 1, 200)
	page := parseInt(c.Query("page"), 1, 1, 100000)
	items, err := h.store.ListUGCPersonAssets(c.Request.Context(), limit, (page-1)*limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_person_assets_query_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "page": page, "limit": limit})
}

func (h *Handler) CreateUGCPersonAsset(c *gin.Context) {
	body, err := ugcPersonAssetBodyFromRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_ugc_person_asset_payload"})
		return
	}
	item, err := h.store.CreateUGCPersonAsset(c.Request.Context(), body, actorUserID(c))
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_ugc_person_asset_payload"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_person_asset_create_failed"})
		return
	}
	settings, settingsErr := h.store.GetUGCSettings(c.Request.Context())
	if settingsErr == nil && settings.Enabled && settings.Mode == "auto" && asBool(item["is_default"], false) {
		_ = h.store.RequestUGCAutopilotScan(c.Request.Context(), "default_person_asset_created")
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) GetUGCPersonAssetContent(c *gin.Context) {
	sourceDataURL, previewURL, imageURL, err := h.store.GetUGCPersonAssetContent(c.Request.Context(), c.Param("id"))
	if err != nil {
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ugc_person_asset_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_person_asset_content_failed"})
		return
	}
	if mimeType, blob, ok := decodeDataURL(sourceDataURL); ok {
		c.Data(http.StatusOK, mimeType, blob)
		return
	}
	if previewURL != "" {
		c.Redirect(http.StatusTemporaryRedirect, previewURL)
		return
	}
	if imageURL != "" {
		c.Redirect(http.StatusTemporaryRedirect, imageURL)
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "ugc_person_asset_content_missing"})
}

func (h *Handler) ListUGCGenerationRuns(c *gin.Context) {
	limit := parseInt(c.Query("limit"), 20, 1, 200)
	page := parseInt(c.Query("page"), 1, 1, 100000)
	items, total, err := h.store.ListUGCGenerationRuns(c.Request.Context(), UGCGenerationListParams{
		Page:        page,
		Limit:       limit,
		Status:      c.Query("status"),
		ProductID:   c.Query("product_id"),
		TriggerMode: c.Query("trigger_mode"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_generation_runs_query_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "page": page, "limit": limit, "total": total})
}

func (h *Handler) ListUGCJobs(c *gin.Context) {
	h.ListUGCGenerationRuns(c)
}

func (h *Handler) CreateUGCGenerationRun(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	item, err := h.store.CreateUGCGenerationRun(c.Request.Context(), body, actorUserID(c))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_ugc_generation_payload"})
			return
		case errBlocked:
			c.JSON(http.StatusBadRequest, gin.H{"error": "ugc_person_asset_not_ready"})
			return
		case errAlreadyRunning:
			c.JSON(http.StatusConflict, gin.H{"error": "ugc_generation_already_running"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_generation_create_failed"})
		return
	}
	c.JSON(http.StatusAccepted, item)
}

func (h *Handler) CreateUGCJob(c *gin.Context) {
	h.CreateUGCGenerationRun(c)
}

func (h *Handler) GetUGCGenerationRun(c *gin.Context) {
	item, err := h.store.GetUGCGenerationRun(c.Request.Context(), c.Param("id"))
	if err != nil {
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ugc_generation_run_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_generation_run_query_failed"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) GetUGCJob(c *gin.Context) {
	h.GetUGCGenerationRun(c)
}

func (h *Handler) RetryUGCGenerationRun(c *gin.Context) {
	item, err := h.store.RetryUGCGenerationRun(c.Request.Context(), c.Param("id"), actorUserID(c))
	if err != nil {
		switch err {
		case errAlreadyRunning:
			c.JSON(http.StatusConflict, gin.H{"error": "ugc_generation_already_running"})
			return
		}
		if notFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ugc_generation_run_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_generation_retry_failed"})
		return
	}
	c.JSON(http.StatusAccepted, item)
}

func (h *Handler) RetryUGCJob(c *gin.Context) {
	h.RetryUGCGenerationRun(c)
}

func ugcPersonAssetBodyFromRequest(c *gin.Context) (map[string]any, error) {
	contentType := strings.ToLower(strings.TrimSpace(c.ContentType()))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		return ugcPersonAssetBodyFromMultipart(c)
	}
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		return nil, err
	}
	if displayName := asString(body["display_name"]); displayName != "" && body["label"] == nil {
		body["label"] = displayName
	}
	if sourceType := asString(body["source_type"]); sourceType != "" && body["source_kind"] == nil {
		body["source_kind"] = sourceType
	}
	if sourceURL := asString(body["source_url"]); sourceURL != "" && body["image_url"] == nil {
		body["image_url"] = sourceURL
	}
	if rawData := asString(body["source_data"]); rawData != "" && body["source_data_url"] == nil {
		body["source_data_url"] = rawData
	}
	return body, nil
}

func ugcPersonAssetBodyFromMultipart(c *gin.Context) (map[string]any, error) {
	file, err := c.FormFile("image")
	if err != nil {
		return nil, err
	}
	handle, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer handle.Close()
	blob, err := io.ReadAll(io.LimitReader(handle, ugcUploadMaxBytes+1))
	if err != nil {
		return nil, err
	}
	if len(blob) == 0 || len(blob) > ugcUploadMaxBytes {
		return nil, errInvalidInput
	}

	metadata := map[string]any{}
	if rawMeta := strings.TrimSpace(c.PostForm("metadata")); rawMeta != "" {
		_ = json.Unmarshal([]byte(rawMeta), &metadata)
	}

	contentType := strings.TrimSpace(file.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = "image/jpeg"
	}
	return map[string]any{
		"label":           strings.TrimSpace(c.PostForm("display_name")),
		"source_kind":     "upload",
		"source_data_url": fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(blob)),
		"preview_url":     "",
		"is_default":      strings.EqualFold(strings.TrimSpace(c.PostForm("is_default")), "true"),
		"metadata":        metadata,
		"file_name":       file.Filename,
		"mime_type":       contentType,
		"size_bytes":      len(blob),
	}, nil
}

func decodeDataURL(value string) (string, []byte, bool) {
	trimmed := strings.TrimSpace(value)
	if !strings.HasPrefix(trimmed, "data:") {
		return "", nil, false
	}
	comma := strings.Index(trimmed, ",")
	if comma <= len("data:") {
		return "", nil, false
	}
	header := trimmed[len("data:"):comma]
	payload := trimmed[comma+1:]
	if !strings.HasSuffix(header, ";base64") {
		return "", nil, false
	}
	mimeType := strings.TrimSuffix(header, ";base64")
	blob, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return "", nil, false
	}
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	return mimeType, blob, true
}
