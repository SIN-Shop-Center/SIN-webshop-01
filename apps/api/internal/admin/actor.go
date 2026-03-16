package admin

import (
	"strings"

	"github.com/gin-gonic/gin"
	"simone-webshop/apps/api/internal/http/middleware"
)

func actorUserID(c *gin.Context) string {
	raw, ok := c.Get(middleware.ClaimsKey)
	if !ok {
		return ""
	}
	claims, ok := raw.(*middleware.Claims)
	if !ok {
		return ""
	}
	return validUUIDOrEmpty(strings.TrimSpace(claims.Subject))
}

func actorRole(c *gin.Context) string {
	raw, ok := c.Get(middleware.ClaimsKey)
	if !ok {
		return ""
	}
	claims, ok := raw.(*middleware.Claims)
	if !ok {
		return ""
	}
	return strings.TrimSpace(claims.Role)
}

func requestID(c *gin.Context) string {
	if id := strings.TrimSpace(c.GetString(middleware.RequestIDKey)); id != "" {
		return id
	}
	return strings.TrimSpace(c.GetHeader("x-request-id"))
}
