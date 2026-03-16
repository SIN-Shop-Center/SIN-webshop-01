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

func (p *Processor) shouldUseTikTokBrowserRuntime(channel string, auth map[string]any) bool {
	if channel != "tiktok" {
		return false
	}
	if strings.TrimSpace(asString(auth["browser_session_ref"])) != "" {
		return true
	}
	mode := strings.ToLower(strings.TrimSpace(asString(auth["provider_mode"])))
	method := strings.ToLower(strings.TrimSpace(asString(auth["auth_method"])))
	return strings.Contains(mode, "browser") || strings.Contains(method, "browser")
}

func (p *Processor) tiktokBrowserRunnerToken() string {
	for _, value := range []string{
		p.options.TikTokBrowserRunnerToken,
		p.options.N8NSharedSecret,
	} {
		if value = strings.TrimSpace(value); value != "" {
			return value
		}
	}
	return ""
}

func (p *Processor) dispatchTikTokBrowserAction(ctx context.Context, route string, payload map[string]any) (map[string]any, error) {
	siteURL := strings.TrimRight(strings.TrimSpace(p.options.SiteURL), "/")
	token := p.tiktokBrowserRunnerToken()
	if siteURL == "" || token == "" {
		return nil, fmt.Errorf("%w: tiktok_browser_runner_not_configured", ErrPermanent)
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, siteURL+route, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Simone-Internal-Token", token)

	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	response := map[string]any{}
	_ = json.Unmarshal(raw, &response)
	if len(response) == 0 && strings.TrimSpace(string(raw)) != "" {
		response["raw_body"] = string(raw)
	}
	response["status_code"] = resp.StatusCode
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != 429 {
			return nil, fmt.Errorf("%w: tiktok_browser_runner_non_2xx:%d", ErrPermanent, resp.StatusCode)
		}
		return nil, fmt.Errorf("tiktok_browser_runner_non_2xx:%d", resp.StatusCode)
	}
	return response, nil
}

type TikTokProductListing struct {
	ProductTitle  string         `json:"product_title"`
	Description   string         `json:"description"`
	CategoryId    string         `json:"category_id"`
	BrandId       string         `json:"brand_id,omitempty"`
	Skus          []TikTokSKU    `json:"skus"`
	MainImages    []string       `json:"main_images"`
	PackageWeight string         `json:"package_weight"`
	PackageDims   TikTokDims     `json:"package_dims"`
	Delivery      TikTokDelivery `json:"delivery_option"`
}

type TikTokSKU struct {
	OuterSkuId    string `json:"outer_sku_id"`
	OriginalPrice string `json:"original_price"`
	StockQuantity int    `json:"stock_quantity"`
}

type TikTokDims struct {
	Length string `json:"length"`
	Width  string `json:"width"`
	Height string `json:"height"`
	Unit   string `json:"unit"`
}

type TikTokDelivery struct {
	DeliveryOptionId string `json:"delivery_option_id"`
}

type CatalogProduct struct {
	Name            string
	HtmlDescription string
	SKU             string
	Price           float64
	InventoryCount  int
	Images          []string
}

// ConvertToTikTokListing creates a mapped payload for TikTok Shop API
func ConvertToTikTokListing(internalProduct CatalogProduct) ([]byte, error) {
	listing := TikTokProductListing{
		ProductTitle: internalProduct.Name,
		Description:  internalProduct.HtmlDescription,
		CategoryId:   "1000", // Default or map
		Skus: []TikTokSKU{
			{
				OuterSkuId:    internalProduct.SKU,
				OriginalPrice: fmt.Sprintf("%.2f", internalProduct.Price),
				StockQuantity: internalProduct.InventoryCount,
			},
		},
		MainImages:    internalProduct.Images,
		PackageWeight: "0.5",
		PackageDims: TikTokDims{
			Length: "10",
			Width:  "10",
			Height: "5",
			Unit:   "cm",
		},
		Delivery: TikTokDelivery{
			DeliveryOptionId: "default",
		},
	}

	return json.Marshal(listing)
}
