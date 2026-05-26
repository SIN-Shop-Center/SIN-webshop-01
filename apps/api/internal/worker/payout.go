package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type StripePayoutClient struct {
	secretKey  string
	httpClient *http.Client
}

func NewStripePayoutClient(secretKey string) *StripePayoutClient {
	return &StripePayoutClient{
		secretKey: secretKey,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

type stripeBalanceResponse struct {
	Available []struct {
		Amount   int64  `json:"amount"`
		Currency string `json:"currency"`
	} `json:"available"`
	Pending []struct {
		Amount   int64  `json:"amount"`
		Currency string `json:"currency"`
	} `json:"pending"`
}

type stripePayoutResponse struct {
	ID            string `json:"id"`
	Amount        int64  `json:"amount"`
	Currency      string `json:"currency"`
	Status        string `json:"status"`
	Method        string `json:"method"`
	ArrivalDate   int64  `json:"arrival_date"`
	FailureReason string `json:"failure_reason"`
}

func (s *StripePayoutClient) getAvailableBalance(ctx context.Context) (int64, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.stripe.com/v1/balance", nil)
	if err != nil {
		return 0, "", err
	}
	req.SetBasicAuth(s.secretKey, "")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, "", fmt.Errorf("stripe_balance_call: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	var bal stripeBalanceResponse
	if err := json.Unmarshal(raw, &bal); err != nil {
		return 0, "", fmt.Errorf("stripe_balance_parse: %w", err)
	}

	for _, a := range bal.Available {
		if a.Amount > 0 {
			return a.Amount, a.Currency, nil
		}
	}
	return 0, "eur", nil
}

func (s *StripePayoutClient) triggerInstantPayout(ctx context.Context) (*stripePayoutResponse, error) {
	amount, currency, err := s.getAvailableBalance(ctx)
	if err != nil {
		return nil, err
	}
	if amount <= 0 {
		return nil, fmt.Errorf("stripe_no_available_balance")
	}

	payload := fmt.Sprintf("amount=%d&currency=%s&method=instant", amount, currency)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.stripe.com/v1/payouts", strings.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(s.secretKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("stripe_payout_call: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))

	var result struct {
		stripePayoutResponse
		Error *struct {
			Message string `json:"message"`
			Type    string `json:"type"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("stripe_payout_parse: %w", err)
	}

	if result.Error != nil {
		return &result.stripePayoutResponse, fmt.Errorf("stripe_payout_error: %s", result.Error.Message)
	}

	return &result.stripePayoutResponse, nil
}

func (p *Processor) maybeTriggerInstantPayout(ctx context.Context) {
	if p.cfg.StripeSecretKey == "" {
		return
	}

	client := NewStripePayoutClient(p.cfg.StripeSecretKey)
	result, err := client.triggerInstantPayout(ctx)
	if err != nil {
		p.logf("instant_payout_failed: %v", err)
		return
	}
	p.logf("instant_payout_created: id=%s amount=%d currency=%s status=%s method=%s",
		result.ID, result.Amount, result.Currency, result.Status, result.Method)
}
