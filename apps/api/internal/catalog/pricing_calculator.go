package catalog

import (
	"math"
)

type PricingConfig struct {
	BaseMarginPct   float64
	ShippingCost    float64
	TaxRatePct      float64
	CompetitorDiff  float64
}

// CalculateRetailPrice takes the wholesale cost (EK) and computes retail price (VK)
// VK = (EK + Shipping) * (1 + Margin) * (1 + Tax) - CompetitorDiff
func CalculateRetailPrice(wholesaleCost float64, config PricingConfig) float64 {
	costWithShipping := wholesaleCost + config.ShippingCost
	priceWithMargin := costWithShipping * (1.0 + (config.BaseMarginPct / 100.0))
	retailPrice := priceWithMargin * (1.0 + (config.TaxRatePct / 100.0))
	
	finalPrice := retailPrice - config.CompetitorDiff
	if finalPrice < costWithShipping {
		finalPrice = costWithShipping * 1.1 // Minimum 10% safety margin
	}
	
	// Round to nearest .99
	return math.Floor(finalPrice) + 0.99
}
