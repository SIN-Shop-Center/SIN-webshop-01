package storefront

import "testing"

func TestStableCheckoutKeyIsDeterministic(t *testing.T) {
	cart := CartResponse{
		Items: []CartItem{
			{SKU: "SIMONE-AUDIO-01", Quantity: 2},
			{SKU: "SIMONE-LIGHT-01", Quantity: 1},
		},
	}
	in := CheckoutSessionInput{
		Email:         "kunde@example.com",
		FirstName:     "Ada",
		LastName:      "Lovelace",
		Street1:       "Musterstrasse 1",
		Zip:           "10115",
		City:          "Berlin",
		PaymentMethod: "card",
	}

	first := stableCheckoutKey("session-1", cart, in)
	second := stableCheckoutKey("session-1", cart, in)
	if first == "" {
		t.Fatal("expected non-empty key")
	}
	if first != second {
		t.Fatalf("expected deterministic key, got %q and %q", first, second)
	}
}

func TestOrderIDFromSessionSeedIsDeterministic(t *testing.T) {
	first := orderIDFromSessionSeed("abc")
	second := orderIDFromSessionSeed("abc")
	if first == "" {
		t.Fatal("expected non-empty order id")
	}
	if first != second {
		t.Fatalf("expected deterministic order id, got %q and %q", first, second)
	}
}
