package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) RequestChannelCommunityReply(c *gin.Context) {
	body := map[string]any{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}

	item, err := h.store.RequestChannelCommunityReply(c.Request.Context(), c.Param("channel"), body, actorUserID(c))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel_reply_payload"})
		default:
			if IsNotFound(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "channel_reply_task_not_found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_reply_request_failed"})
		}
		return
	}

	c.JSON(http.StatusAccepted, item)
}
