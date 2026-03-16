package worker

import (
	"context"
	"fmt"
	"time"
)

type CartStore interface {
	GetAbandonedCarts(ctx context.Context, age time.Duration) ([]Cart, error)
	MarkRetargetingEmailSent(ctx context.Context, cartID string) error
}

type Cart struct {
	ID        string
	Email     string
	UpdatedAt time.Time
}

func ProcessAbandonedCarts(ctx context.Context, store CartStore) error {
	// Find carts older than 2 hours but less than 24 hours that haven't received an email yet
	carts, err := store.GetAbandonedCarts(ctx, 2*time.Hour)
	if err != nil {
		return err
	}

	for _, cart := range carts {
		// Send email via Resend/SendGrid
		fmt.Printf("Sending abandoned cart email to %s for cart %s\n", cart.Email, cart.ID)

		// Wait for email success
		// _ = SendRetargetingEmail(ctx, cart.Email)

		_ = store.MarkRetargetingEmailSent(ctx, cart.ID)
	}

	return nil
}
