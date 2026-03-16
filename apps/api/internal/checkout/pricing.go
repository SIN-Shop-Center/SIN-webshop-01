package checkout

import (
	"errors"
	"fmt"
	"strings"
)

var (
	errMissingRequiredFields  = errors.New("missing_required_fields")
	errInvalidCustomerType    = errors.New("invalid_customer_type")
	errInvalidB2BFields       = errors.New("invalid_b2b_fields")
	errInvalidCurrency        = errors.New("invalid_currency")
	errInvalidEmail           = errors.New("invalid_email")
	errInvalidShippingAddress = errors.New("invalid_shipping_address")
	errInvalidItemPayload     = errors.New("invalid_item_payload")
	errProductUnavailable     = errors.New("product_unavailable_for_checkout")
)

type CatalogProduct struct {
	ID               string
	SKU              string
	Name             string
	UnitPriceAmount  int
	ReadyForCheckout bool
}

func normalizeAndValidateSessionRequest(in *SessionRequest) error {
	in.Email = normalizeEmail(in.Email)
	in.Currency = strings.ToUpper(strings.TrimSpace(in.Currency))
	if in.Currency == "" {
		in.Currency = "EUR"
	}
	if in.ShippingMethod == "" {
		in.ShippingMethod = "standard"
	}
	if in.CustomerType == "" {
		in.CustomerType = "b2c"
	}
	if in.Email == "" || len(in.Items) == 0 {
		return errMissingRequiredFields
	}
	if !validCheckoutEmail(in.Email) {
		return errInvalidEmail
	}
	if in.Currency != "EUR" {
		return errInvalidCurrency
	}
	if in.CustomerType != "b2c" && in.CustomerType != "b2b" {
		return errInvalidCustomerType
	}
	if in.CustomerType == "b2b" {
		if tooShortOptional(in.CompanyName) || tooShortOptional(in.VATID) || tooShortOptional(in.PurchaseOrderRef) {
			return errInvalidB2BFields
		}
	}
	if !normalizeAndValidateAddress(&in.ShippingAddress) {
		return errInvalidShippingAddress
	}
	if len(in.Items) > maxCheckoutItems {
		return errInvalidItemPayload
	}
	for index := range in.Items {
		in.Items[index].SKU = strings.TrimSpace(in.Items[index].SKU)
		if in.Items[index].SKU == "" || invalidItemQuantity(in.Items[index].Quantity) {
			return errInvalidItemPayload
		}
	}
	return nil
}

func buildPricedItems(items []SessionItem, products map[string]CatalogProduct) ([]PricedItem, int, error) {
	priced := make([]PricedItem, 0, len(items))
	subtotal := 0

	for _, item := range items {
		key := strings.TrimSpace(item.SKU)
		product, ok := products[key]
		if !ok || product.UnitPriceAmount <= 0 {
			return nil, 0, fmt.Errorf("%w:%s", errInvalidItemPayload, key)
		}
		if !product.ReadyForCheckout {
			return nil, 0, fmt.Errorf("%w:%s", errProductUnavailable, key)
		}
		title := strings.TrimSpace(product.Name)
		if title == "" {
			title = strings.TrimSpace(item.Title)
		}
		if title == "" {
			title = key
		}
		sku := strings.TrimSpace(product.SKU)
		if sku == "" {
			sku = key
		}

		line := product.UnitPriceAmount * item.Quantity
		priced = append(priced, PricedItem{
			ProductID:       product.ID,
			SKU:             sku,
			Title:           title,
			Quantity:        item.Quantity,
			UnitPriceAmount: product.UnitPriceAmount,
			LineTotalAmount: line,
		})
		subtotal += line
	}

	return priced, subtotal, nil
}

func shippingAmountForSubtotal(subtotal int) int {
	if subtotal >= 5000 {
		return 0
	}
	return 499
}

func tooShortOptional(v string) bool {
	trimmed := strings.TrimSpace(v)
	return trimmed != "" && len(trimmed) < 2
}
