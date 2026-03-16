package admin

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetChannels(c *gin.Context) {
	items, err := h.store.ListChannelAccounts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "channels_query_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) StartChannelConnect(c *gin.Context) {
	item, err := h.store.StartChannelConnect(c.Request.Context(), c.Param("channel"))
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_connect_start_failed"})
		return
	}
	c.JSON(http.StatusAccepted, item)
}

func (h *Handler) GetChannelConnectSession(c *gin.Context) {
	item, err := h.store.GetChannelConnectSession(c.Request.Context(), c.Param("channel"), c.Param("state_token"))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel_connect_session"})
		default:
			if IsNotFound(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "channel_connect_session_not_found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_connect_session_query_failed"})
		}
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) TikTokConnectCallback(c *gin.Context) {
	redirectURL, err := h.store.HandleTikTokConnectCallback(
		c.Request.Context(),
		c.Query("state"),
		c.Query("code"),
		c.Query("scopes"),
		c.Query("error"),
		c.Query("error_description"),
		map[string]any{
			"merchant_id":         c.Query("merchant_id"),
			"seller_id":           c.Query("seller_id"),
			"shop_id":             c.Query("shop_id"),
			"shop_cipher":         c.Query("shop_cipher"),
			"third_shop_id":       c.Query("third_shop_id"),
			"shop_region":         firstNonEmpty(c.Query("shop_region"), c.Query("region")),
			"shop_name":           c.Query("shop_name"),
			"account_external_id": c.Query("account_external_id"),
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tiktok_connect_callback_failed"})
		return
	}
	c.Redirect(http.StatusFound, redirectURL)
}

func (h *Handler) TikTokConnectBrowserMetadataCallback(c *gin.Context) {
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_body"})
		return
	}
	signature := strings.TrimSpace(c.GetHeader("X-Simone-Signature"))
	if !verifyOnboardingCallbackSignature(resolveOnboardingCallbackSecret(), rawBody, signature) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_signature"})
		return
	}

	body := map[string]any{}
	if err := json.Unmarshal(rawBody, &body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	item, err := h.store.HandleTikTokConnectBrowserMetadataCallback(c.Request.Context(), body)
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel_connect_browser_metadata_payload"})
			return
		case errBlocked:
			c.JSON(http.StatusConflict, gin.H{"error": "channel_connect_session_invalid"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "tiktok_connect_browser_metadata_callback_failed"})
			return
		}
	}
	c.JSON(http.StatusAccepted, item)
}

func (h *Handler) CompleteChannelConnect(c *gin.Context) {
	in := struct {
		StateToken      string         `json:"state_token"`
		AccountExternal string         `json:"account_external_id"`
		AuthSnapshot    map[string]any `json:"auth_snapshot"`
		HealthSnapshot  map[string]any `json:"health_snapshot"`
	}{}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	item, err := h.store.CompleteChannelConnect(
		c.Request.Context(),
		c.Param("channel"),
		in.StateToken,
		in.AccountExternal,
		in.AuthSnapshot,
		in.HealthSnapshot,
	)
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel_connect_payload"})
		case errBlocked:
			c.JSON(http.StatusConflict, gin.H{"error": "channel_connect_session_invalid"})
		default:
			if strings.Contains(err.Error(), "missing_channel_access_token") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing_channel_access_token"})
				return
			}
			if strings.Contains(err.Error(), "missing_channel_merchant") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing_channel_merchant"})
				return
			}
			if strings.Contains(err.Error(), "missing_channel_shop") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing_channel_shop"})
				return
			}
			if strings.Contains(err.Error(), "tiktok_merchant_token_exchange_failed") {
				c.JSON(http.StatusBadGateway, gin.H{"error": "tiktok_merchant_token_exchange_failed"})
				return
			}
			if strings.Contains(err.Error(), "missing_channel_endpoints") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing_channel_endpoints"})
				return
			}
			if strings.Contains(err.Error(), "invalid_channel_endpoint") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel_endpoint"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_connect_complete_failed"})
		}
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) RequestChannelConnectBrowserMetadata(c *gin.Context) {
	in := struct {
		StateToken        string         `json:"state_token"`
		BrowserSessionRef string         `json:"browser_session_ref"`
		TargetURL         string         `json:"target_url"`
		CandidateURLs     []string       `json:"candidate_urls"`
		BrowserRecipe     map[string]any `json:"browser_recipe"`
		RequestPayload    map[string]any `json:"request_payload"`
	}{}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
		return
	}
	item, err := h.store.RequestChannelConnectBrowserMetadata(c.Request.Context(), c.Param("channel"), in.StateToken, map[string]any{
		"browser_session_ref": in.BrowserSessionRef,
		"target_url":          in.TargetURL,
		"candidate_urls":      in.CandidateURLs,
		"browser_recipe":      in.BrowserRecipe,
		"request_payload":     in.RequestPayload,
	}, actorUserID(c))
	if err != nil {
		switch err {
		case errInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel_connect_browser_metadata_payload"})
			return
		case errBlocked:
			c.JSON(http.StatusConflict, gin.H{"error": "channel_connect_session_invalid"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_connect_browser_metadata_request_failed"})
			return
		}
	}
	c.JSON(http.StatusAccepted, item)
}

func (h *Handler) TriggerChannelCatalogSync(c *gin.Context) {
	item, err := h.store.TriggerChannelSync(c.Request.Context(), c.Param("channel"), "catalog", map[string]any{})
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel"})
			return
		}
		if err == errKillSwitch {
			c.JSON(http.StatusConflict, gin.H{"error": "channel_sync_kill_switched"})
			return
		}
		if err == errNotConnected {
			c.JSON(http.StatusConflict, gin.H{"error": "channel_not_connected"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_catalog_sync_failed"})
		return
	}
	c.JSON(http.StatusAccepted, item)
}

func (h *Handler) TriggerChannelCampaignPublish(c *gin.Context) {
	body := map[string]any{}
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_json"})
			return
		}
	}
	item, err := h.store.TriggerChannelSync(c.Request.Context(), c.Param("channel"), "campaign_publish", body)
	if err != nil {
		if err == errInvalidInput {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_channel"})
			return
		}
		if err == errKillSwitch {
			c.JSON(http.StatusConflict, gin.H{"error": "campaign_publish_kill_switched"})
			return
		}
		if err == errNotConnected {
			c.JSON(http.StatusConflict, gin.H{"error": "channel_not_connected"})
			return
		}
		if err == errBudgetCap {
			c.JSON(http.StatusConflict, gin.H{"error": "budget_cap_exceeded"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "channel_campaign_publish_failed"})
		return
	}
	c.JSON(http.StatusAccepted, item)
}
