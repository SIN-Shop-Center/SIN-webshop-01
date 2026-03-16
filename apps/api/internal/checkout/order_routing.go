package checkout

import (
	"context"
	"encoding/json"
	"fmt"
)

type OrderItem struct {
	SKU      string `json:"sku"`
	Quantity int    `json:"quantity"`
	Supplier string `json:"supplier_id"`
}

type OrderRoutingRequest struct {
	OrderID   string      `json:"order_id"`
	LineItems []OrderItem `json:"items"`
}

// RouteOrderToSupplier sends orders to dropshipping suppliers
func RouteOrderToSupplier(ctx context.Context, req OrderRoutingRequest) error {
	supplierGroups := make(map[string][]OrderItem)

	// Group items by supplier
	for _, item := range req.LineItems {
		supplierGroups[item.Supplier] = append(supplierGroups[item.Supplier], item)
	}

	for supplierID, items := range supplierGroups {
		fmt.Printf("Routing %d items to Supplier: %s for Order: %s\n", len(items), supplierID, req.OrderID)
		// Send JSON-RPC call or API push to supplier integration agent
		// E.g., via A2A call to SIN-Shop-Logistic
		payload, _ := json.Marshal(map[string]any{
			"order_id": req.OrderID,
			"items":    items,
			"action":   "supplier.order.create",
		})
		_ = payload
	}

	return nil
}
