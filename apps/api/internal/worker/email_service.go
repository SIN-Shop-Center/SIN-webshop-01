package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type ResendEmailRequest struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
}

func SendOrderConfirmationEmail(ctx context.Context, orderID, customerEmail string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY not set")
	}

	htmlContent := fmt.Sprintf(`<h1>Vielen Dank für Ihre Bestellung!</h1>
<p>Ihre Bestellung %s wird bearbeitet.</p>`, orderID)

	reqBody := ResendEmailRequest{
		From:    "shop@delqhi.com",
		To:      customerEmail,
		Subject: fmt.Sprintf("Bestellbestätigung #%s", orderID),
		HTML:    htmlContent,
	}

	payloadBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://api.resend.com/emails", bytes.NewReader(payloadBytes))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Resend API error: %d", resp.StatusCode)
	}

	return nil
}
