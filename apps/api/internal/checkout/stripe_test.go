package checkout

import "testing"

func TestBuildStripeSuccessURL(t *testing.T) {
	got := buildStripeSuccessURL("https://shop.example.com", "order-123")
	want := "https://shop.example.com/checkout/success?order_id=order-123&session_id={CHECKOUT_SESSION_ID}"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestBuildStripeCancelURL(t *testing.T) {
	got := buildStripeCancelURL("https://shop.example.com", "order-123")
	want := "https://shop.example.com/checkout?cancelled=true&order_id=order-123"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestBuildStripePaymentMethodTypes(t *testing.T) {
	got := buildStripePaymentMethodTypes()
	want := []string{"card", "link"}

	if len(got) != len(want) {
		t.Fatalf("expected %d payment methods, got %d", len(want), len(got))
	}
	for index, method := range want {
		if got[index] != method {
			t.Fatalf("expected payment method %q at index %d, got %q", method, index, got[index])
		}
	}
}
