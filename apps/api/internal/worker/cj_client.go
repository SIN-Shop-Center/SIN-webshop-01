package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	cjBaseURL        = "https://developers.cjdropshipping.com/api2.0/v1"
	cjAuthPath       = "/authentication/getAccessToken"
	cjCreateOrderV2  = "/shopping/order/createOrderV2"
	cjFreightCalc    = "/logistic/freightCalculate"
	cjTokenCacheKey  = "cj_access_token"
	cjRefreshPath    = "/authentication/refreshAccessToken"
)

type cjClient struct {
	apiKey     string
	httpClient *http.Client
	token      string
	expiresAt  time.Time
	lastCall   time.Time
}

type cjAuthResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
		ExpiresIn    int64  `json:"expiresIn"`
		OpenID       json.Number `json:"openId"`
	} `json:"data"`
}

type cjOrderResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    *struct {
		OrderID     string `json:"orderId"`
		OrderNumber string `json:"orderNumber"`
		CJPayURL    string `json:"cjPayUrl"`
		Status      string `json:"status"`
	} `json:"data"`
}

type cjFreightResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    []struct {
		LogisticName  string  `json:"logisticName"`
		LogisticPrice float64 `json:"logisticPrice"`
		LogisticAging string  `json:"logisticAging"`
	} `json:"data"`
}

func newCJClient(apiKey string) *cjClient {
	return &cjClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *cjClient) rateLimitWait() {
	elapsed := time.Since(c.lastCall)
	if elapsed < 1100*time.Millisecond {
		time.Sleep(1100*time.Millisecond - elapsed)
	}
	c.lastCall = time.Now()
}

func (c *cjClient) authenticate(ctx context.Context) error {
	c.rateLimitWait()
	body, _ := json.Marshal(map[string]string{"apiKey": c.apiKey})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cjBaseURL+cjAuthPath, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cj_auth_request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("cj_auth_call: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	var authResp cjAuthResponse
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&authResp); err != nil {
		return fmt.Errorf("cj_auth_parse: %w", err)
	}
	if authResp.Code != 200 {
		return fmt.Errorf("cj_auth_failed: code=%d msg=%s", authResp.Code, authResp.Message)
	}

	c.token = authResp.Data.AccessToken
	c.expiresAt = time.Now().Add(time.Duration(authResp.Data.ExpiresIn) * time.Second)
	return nil
}

func (c *cjClient) ensureToken(ctx context.Context) error {
	if c.token != "" && time.Now().Before(c.expiresAt.Add(-5*time.Minute)) {
		return nil
	}
	return c.authenticate(ctx)
}

func (c *cjClient) doAuthenticated(ctx context.Context, method, path string, payload any) ([]byte, error) {
	if err := c.ensureToken(ctx); err != nil {
		return nil, fmt.Errorf("cj_token: %w", err)
	}

	c.rateLimitWait()

	var bodyReader io.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, cjBaseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("CJ-Access-Token", c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 256*1024))

	if resp.StatusCode == 401 {
		c.token = ""
		return nil, fmt.Errorf("cj_auth_expired_retry")
	}

	return raw, nil
}

type cjCreateOrderParams struct {
	OrderNumber         string         `json:"orderNumber"`
	ShippingCountryCode string         `json:"shippingCountryCode"`
	ShippingCountry     string         `json:"shippingCountry"`
	ShippingProvince    string         `json:"shippingProvince"`
	ShippingCity        string         `json:"shippingCity"`
	ShippingAddress     string         `json:"shippingAddress"`
	ShippingAddress2    string         `json:"shippingAddress2,omitempty"`
	ShippingZip         string         `json:"shippingZip,omitempty"`
	ShippingCustomerName string        `json:"shippingCustomerName"`
	ShippingPhone       string         `json:"shippingPhone,omitempty"`
	Email               string         `json:"email,omitempty"`
	LogisticName        string         `json:"logisticName"`
	FromCountryCode     string         `json:"fromCountryCode"`
	Products            []cjProductRef `json:"products"`
	PayType             int            `json:"payType"`
	IOSSType            int            `json:"iossType"`
	IOSSNumber          string         `json:"iossNumber,omitempty"`
	Platform            string         `json:"platform,omitempty"`
	ShopLogisticsType   int            `json:"shopLogisticsType,omitempty"`
	OrderFlow           int            `json:"orderFlow,omitempty"`
	Remark              string         `json:"remark,omitempty"`
}

type cjProductRef struct {
	VID      string `json:"vid"`
	Quantity int    `json:"quantity"`
}

func (c *cjClient) createOrder(ctx context.Context, params cjCreateOrderParams) (*cjOrderResponse, error) {
	raw, err := c.doAuthenticated(ctx, http.MethodPost, cjCreateOrderV2, params)
	if err != nil {
		return nil, err
	}

	var orderResp cjOrderResponse
	if err := json.Unmarshal(raw, &orderResp); err != nil {
		return nil, fmt.Errorf("cj_order_parse: %w (raw: %s)", err, string(raw[:min(len(raw), 500)]))
	}

	if orderResp.Code != 200 {
		return &orderResp, fmt.Errorf("cj_order_failed: code=%d msg=%s", orderResp.Code, orderResp.Message)
	}

	return &orderResp, nil
}

func (c *cjClient) calculateFreight(ctx context.Context, endCountryCode string, products []cjProductRef) (*cjFreightResponse, error) {
	payload := map[string]any{
		"startCountryCode": "CN",
		"endCountryCode":   endCountryCode,
		"products":         products,
		"storageId":        "",
	}
	raw, err := c.doAuthenticated(ctx, http.MethodPost, cjFreightCalc, payload)
	if err != nil {
		return nil, err
	}

	var freightResp cjFreightResponse
	if err := json.Unmarshal(raw, &freightResp); err != nil {
		return nil, fmt.Errorf("cj_freight_parse: %w", err)
	}
	if freightResp.Code != 200 {
		return &freightResp, fmt.Errorf("cj_freight_failed: code=%d msg=%s", freightResp.Code, freightResp.Message)
	}
	return &freightResp, nil
}

func bestLogisticName(freightResp *cjFreightResponse) string {
	if len(freightResp.Data) == 0 {
		return "CJPacket Ordinary"
	}
	preferred := []string{"CJPacket Ordinary", "CJPacket", "YunExpress"}
	for _, pref := range preferred {
		for _, opt := range freightResp.Data {
			if strings.Contains(opt.LogisticName, pref) {
				return opt.LogisticName
			}
		}
	}
	return freightResp.Data[0].LogisticName
}
