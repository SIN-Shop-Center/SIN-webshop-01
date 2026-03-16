package storefront

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ensureSession(c *gin.Context) (*SessionRecord, error) {
	raw, err := c.Cookie(sessionCookieName)
	if err == nil && strings.TrimSpace(raw) != "" {
		session, lookupErr := h.store.GetSessionByTokenHash(c.Request.Context(), hashToken(raw))
		if lookupErr != nil {
			return nil, lookupErr
		}
		if session != nil {
			if touchErr := h.store.TouchSession(c.Request.Context(), session.ID, ""); touchErr != nil {
				return nil, touchErr
			}
			return session, nil
		}
	}

	token, tokenHash, err := newOpaqueSessionToken()
	if err != nil {
		return nil, err
	}
	session, err := h.store.CreateSession(c.Request.Context(), tokenHash)
	if err != nil {
		return nil, err
	}
	setSessionCookie(c, h.options.SiteURL, token)
	return session, nil
}

func setSessionCookie(c *gin.Context, siteURL, token string) {
	parsed, err := url.Parse(strings.TrimSpace(siteURL))
	if err != nil {
		parsed = nil
	}
	domain := ""
	if parsed != nil {
		host := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
		if host != "" && host != "localhost" && host != "127.0.0.1" {
			domain = host
		}
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		sessionCookieName,
		token,
		int(defaultSessionDuration.Seconds()),
		"/",
		domain,
		true,
		true,
	)
}

func newOpaqueSessionToken() (string, string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}
	raw := hex.EncodeToString(buf)
	return raw, hashToken(raw), nil
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func stableCheckoutKey(sessionID string, cart CartResponse, in CheckoutSessionInput) string {
	var b strings.Builder
	b.WriteString(sessionID)
	b.WriteString("|")
	b.WriteString(strings.TrimSpace(strings.ToLower(in.Email)))
	b.WriteString("|")
	b.WriteString(strings.TrimSpace(strings.ToLower(in.PaymentMethod)))
	b.WriteString("|")
	b.WriteString(strings.TrimSpace(strings.ToLower(in.FirstName)))
	b.WriteString("|")
	b.WriteString(strings.TrimSpace(strings.ToLower(in.LastName)))
	b.WriteString("|")
	b.WriteString(strings.TrimSpace(strings.ToLower(in.Street1)))
	b.WriteString("|")
	b.WriteString(strings.TrimSpace(strings.ToLower(in.Zip)))
	b.WriteString("|")
	b.WriteString(strings.TrimSpace(strings.ToLower(in.City)))
	for _, item := range cart.Items {
		b.WriteString("|")
		b.WriteString(item.SKU)
		b.WriteString(":")
		b.WriteString(strconvItoa(item.Quantity))
	}
	return hashToken(b.String())
}

func strconvItoa(v int) string {
	return strconv.FormatInt(int64(v), 10)
}
