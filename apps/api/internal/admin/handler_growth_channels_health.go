package admin

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetChannelHealth(c *gin.Context) {
	item, err := h.store.GetChannelHealth(c.Request.Context(), c.Param("channel"))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel"})
		case errNotConnected:
			c.JSON(http.StatusNotFound, gin.H{"error": "channel_not_connected"})
		default:
			if IsNotFound(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "channel_not_found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_health_query_failed"})
		}
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) RefreshChannelMetadata(c *gin.Context) {
	item, err := h.store.RefreshChannelMetadata(c.Request.Context(), c.Param("channel"))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel"})
			return
		case errNotConnected:
			c.JSON(http.StatusConflict, gin.H{"error": "channel_not_connected"})
			return
		}
		switch {
		case err.Error() == "missing_channel_access_token":
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing_channel_access_token"})
			return
		case err.Error() == "missing_channel_merchant":
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing_channel_merchant"})
			return
		case strings.HasPrefix(err.Error(), "tiktok_shop_metadata_refresh_failed"):
			c.JSON(http.StatusBadGateway, gin.H{"error": "tiktok_shop_metadata_refresh_failed"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_metadata_refresh_failed"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) IngestChannelEvents(c *gin.Context) {
	body := struct {
		Items []map[string]any `json:"items"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	out, err := h.store.IngestChannelEvents(c.Request.Context(), c.Param("channel"), body.Items)
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel_event_payload"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_events_ingest_failed"})
		return
	}
	c.JSON(http.StatusAccepted, out)
}
