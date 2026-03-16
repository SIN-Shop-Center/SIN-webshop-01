package admin

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListUGCPostingQueue(c *gin.Context) {
	limit := parseInt(c.Query("limit"), 20, 1, 200)
	page := parseInt(c.Query("page"), 1, 1, 100000)
	items, total, err := h.store.ListUGCPostingQueue(c.Request.Context(), UGCPostingQueueListParams{
		Page:    page,
		Limit:   limit,
		Status:  c.Query("status"),
		Channel: c.Query("channel"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_posting_queue_query_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "page": page, "limit": limit, "total": total})
}

func (h *Handler) ClaimUGCPostingQueueItem(c *gin.Context) {
	if h.r2 == nil || !h.r2.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "ugc_asset_bank_not_configured"})
		return
	}

	body := map[string]any{}
	if c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
			return
		}
	}

	item, err := h.store.ClaimUGCPostingQueueItem(
		c.Request.Context(),
		asString(body["channel"]),
		firstNonEmptyUGCString(asString(body["claimed_by"]), actorUserID(c)),
		time.Duration(asInt(body["claim_ttl_minutes"], 30))*time.Minute,
	)
	if err != nil {
		if err == errNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "ugc_posting_queue_empty"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_posting_queue_claim_failed"})
		return
	}

	asset := asMap(item["asset"])
	videoKey := asString(asset["video_object_key"])
	thumbnailKey := asString(asset["thumbnail_object_key"])

	if videoKey != "" {
		videoURL, presignErr := h.r2.PresignGetObject(c.Request.Context(), videoKey, 0)
		if presignErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_asset_presign_failed"})
			return
		}
		asset["video_presigned_url"] = videoURL
	}
	if thumbnailKey != "" {
		thumbURL, presignErr := h.r2.PresignGetObject(c.Request.Context(), thumbnailKey, 0)
		if presignErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_thumbnail_presign_failed"})
			return
		}
		asset["thumbnail_presigned_url"] = thumbURL
	}
	item["asset"] = asset
	c.JSON(http.StatusOK, item)
}

func (h *Handler) MarkUGCPostingQueuePosted(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	item, err := h.store.MarkUGCPostingQueuePosted(c.Request.Context(), c.Param("id"), asString(body["claim_token"]), actorUserID(c), body)
	if err != nil {
		if err == errNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "ugc_posting_queue_item_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ugc_posting_queue_posted_failed"})
		return
	}
	c.JSON(http.StatusOK, item)
}
