package checkout

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/webhook"
)

type SupabaseOrderClient interface {
	UpdateOrderStatus(ctx context.Context, sessionID, status string) error
}

func HandleStripeWebhook(w http.ResponseWriter, r *http.Request, endpointSecret string, orderClient SupabaseOrderClient) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusServiceUnavailable)
		return
	}

	sigHeader := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, sigHeader, endpointSecret)
	if err != nil {
		http.Error(w, "Error verifying webhook signature", http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			http.Error(w, "Error parsing webhook JSON", http.StatusBadRequest)
			return
		}

		if session.PaymentStatus == "paid" {
			// Update order in Supabase
			if err := orderClient.UpdateOrderStatus(r.Context(), session.ID, "paid"); err != nil {
				fmt.Printf("Supabase update failed: %v", err)
				http.Error(w, "Failed to update order", http.StatusInternalServerError)
				return
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}
