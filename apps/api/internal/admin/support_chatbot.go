package admin

import (
	"context"
	"fmt"
	"strings"
)

type ChatbotRequest struct {
	Query     string `json:"query"`
	OrderID   string `json:"order_id,omitempty"`
	SessionID string `json:"session_id"`
}

type ChatbotResponse struct {
	Answer   string `json:"answer"`
	Action   string `json:"action,omitempty"`
	Handover bool   `json:"handover"`
}

func HandleSupportChat(ctx context.Context, req ChatbotRequest, orderStore OrderStore) (ChatbotResponse, error) {
	query := strings.ToLower(req.Query)

	if strings.Contains(query, "wo ist mein paket") || strings.Contains(query, "wo ist meine bestellung") {
		if req.OrderID != "" {
			order, err := orderStore.GetOrderByID(ctx, req.OrderID)
			if err != nil {
				return ChatbotResponse{Answer: "Leider konnte ich Ihre Bestellung nicht finden.", Handover: true}, nil
			}
			return ChatbotResponse{
				Answer: fmt.Sprintf("Ihre Bestellung %s hat den Status: %s. Sendungsnummer: %s", order.ID, order.Status, order.TrackingNumber),
			}, nil
		}
		return ChatbotResponse{Answer: "Bitte geben Sie Ihre Bestellnummer an.", Action: "request_order_id"}, nil
	}

	if strings.Contains(query, "rückgabe") || strings.Contains(query, "widerruf") {
		return ChatbotResponse{
			Answer: "Sie haben ein 14-tägiges Widerrufsrecht. Bitte senden Sie uns die unbenutzte Ware zurück an: Delqhi GmbH, Musterstraße 1, 10115 Berlin. Alle Infos finden Sie unter /widerrufsrecht.",
		}, nil
	}

	return ChatbotResponse{
		Answer:   "Ich verbinde Sie mit einem menschlichen Mitarbeiter.",
		Handover: true,
	}, nil
}
