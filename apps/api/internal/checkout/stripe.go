package checkout

import (
	"errors"
	"fmt"
	"strings"

	"github.com/stripe/stripe-go/v82"
	stripeSession "github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/webhook"
)

type StripeClient struct {
	secretKey string
}

func NewStripeClient(secretKey string) *StripeClient {
	return &StripeClient{secretKey: strings.TrimSpace(secretKey)}
}

func buildStripeSuccessURL(siteURL, orderID string) string {
	return fmt.Sprintf("%s/checkout/success?order_id=%s&session_id={CHECKOUT_SESSION_ID}", siteURL, orderID)
}

func buildStripeCancelURL(siteURL, orderID string) string {
	return fmt.Sprintf("%s/checkout?cancelled=true&order_id=%s", siteURL, orderID)
}

func buildStripePaymentMethodTypes() []string {
	return []string{"card", "link", "sepa_debit", "klarna"}
}

func (s *StripeClient) CreateHostedCheckout(input StripeSessionInput) (StripeSessionOutput, error) {
	if s.secretKey == "" {
		return StripeSessionOutput{}, errors.New("stripe_secret_key_missing")
	}
	currency := strings.ToLower(strings.TrimSpace(input.Currency))
	if currency == "" {
		currency = "eur"
	}
	successURL := buildStripeSuccessURL(input.SiteURL, input.OrderID)
	cancelURL := buildStripeCancelURL(input.SiteURL, input.OrderID)

	params := &stripe.CheckoutSessionParams{
		Mode:          stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:    stripe.String(successURL),
		CancelURL:     stripe.String(cancelURL),
		CustomerEmail: stripe.String(input.Email),
		PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
			StatementDescriptor: stripe.String("DELQHI SHOP"),
			Description:         stripe.String(fmt.Sprintf("Delqhi Bestellung %s", input.OrderID[:8])),
			Metadata: map[string]string{
				"order_id": input.OrderID,
			},
		},
		Metadata: map[string]string{
			"order_id": input.OrderID,
		},
	}
	params.SetIdempotencyKey(input.IdempotencyKey)
	params.PaymentMethodTypes = stripe.StringSlice(buildStripePaymentMethodTypes())
	params.PaymentMethodOptions = &stripe.CheckoutSessionPaymentMethodOptionsParams{
		Klarna: &stripe.CheckoutSessionPaymentMethodOptionsKlarnaParams{},
		SEPADebit: &stripe.CheckoutSessionPaymentMethodOptionsSEPADebitParams{
			MandateOptions: &stripe.CheckoutSessionPaymentMethodOptionsSEPADebitMandateOptionsParams{
				ReferencePrefix: stripe.String("DLQ"),
			},
		},
	}

	for _, item := range input.Items {
		params.LineItems = append(params.LineItems, &stripe.CheckoutSessionLineItemParams{
			Quantity: stripe.Int64(int64(item.Quantity)),
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency:   stripe.String(currency),
				UnitAmount: stripe.Int64(int64(item.UnitPriceAmount)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(item.Title),
					Metadata: map[string]string{
						"sku": item.SKU,
					},
				},
			},
		})
	}
	if input.ShippingAmount > 0 {
		params.LineItems = append(params.LineItems, &stripe.CheckoutSessionLineItemParams{
			Quantity: stripe.Int64(1),
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency:   stripe.String(currency),
				UnitAmount: stripe.Int64(int64(input.ShippingAmount)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String("Versand"),
				},
			},
		})
	}

	stripe.Key = s.secretKey
	session, err := stripeSession.New(params)
	if err != nil {
		return StripeSessionOutput{}, err
	}
	if session.URL == "" || session.ID == "" {
		return StripeSessionOutput{}, errors.New("stripe_session_invalid_response")
	}

	return StripeSessionOutput{
		ID:         session.ID,
		URL:        session.URL,
		ExpiresAt:  session.ExpiresAt,
		TotalCents: int(session.AmountTotal),
	}, nil
}

func verifyStripeSignature(payload []byte, signatureHeader, webhookSecret string) (stripe.Event, error) {
	return webhook.ConstructEventWithOptions(payload, signatureHeader, webhookSecret, webhook.ConstructEventOptions{
		IgnoreAPIVersionMismatch: true,
	})
}
