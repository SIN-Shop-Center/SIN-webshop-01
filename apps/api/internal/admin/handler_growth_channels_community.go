package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetChannelCommunityQueue(c *gin.Context) {
	limit := parseInt(c.Query("limit"), 20, 1, 100)
	item, err := h.store.GetChannelCommunityQueue(c.Request.Context(), c.Param("channel"), limit)
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel"})
		default:
			if IsNotFound(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "channel_not_found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_community_queue_failed"})
		}
		return
	}
	c.JSON(http.StatusOK, item)
}
