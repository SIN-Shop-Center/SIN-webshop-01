package checkout

import (
	"context"
	"fmt"
)

type TrackingUpdate struct {
	OrderID        string `json:"order_id"`
	SupplierID     string `json:"supplier_id"`
	TrackingNumber string `json:"tracking_number"`
	Carrier        string `json:"carrier"`
	Status         string `json:"status"`
}

type OrderTrackingDB interface {
	UpdateOrderTracking(ctx context.Context, orderID, trackingNumber, carrier string) error
	SendTrackingEmailToCustomer(ctx context.Context, orderID, trackingNumber, carrier string) error
}

func SyncSupplierTracking(ctx context.Context, update TrackingUpdate, db OrderTrackingDB) error {
	// Validate
	if update.TrackingNumber == "" {
		return fmt.Errorf("missing tracking number")
	}

	// Update database
	if err := db.UpdateOrderTracking(ctx, update.OrderID, update.TrackingNumber, update.Carrier); err != nil {
		return fmt.Errorf("failed to update tracking in DB: %w", err)
	}

	// Trigger email notification to customer
	if err := db.SendTrackingEmailToCustomer(ctx, update.OrderID, update.TrackingNumber, update.Carrier); err != nil {
		fmt.Printf("Warning: Tracking email sending failed: %v", err)
	}

	return nil
}
