# Simone Workflow Event Map

| Workflow JSON | Canonical Event Input | Notes |
|---|---|---|
| `01-new-order-processing.json` | `order.created` | start internal order enrichment |
| `02-supplier-order.json` | `fulfillment.started` | supplier placement stage |
| `03-tracking-update.json` | `shipment.updated` | tracking status propagation |
| `04-ai-customer-chat.json` | `ai.chat.requested` | customer chat orchestration |
| `05-daily-trend-analysis.json` | `trend.analysis.requested` | scheduled trend report |
| `06-supplier-research.json` | `supplier.research.requested` | supplier scoring routine |
| `07-social-media-post.json` | `social.post.requested` | social publishing |
| `08-stripe-webhook.json` | `payment.succeeded` | webhook follow-up |
| `09-stock-warning.json` | `inventory.low` | stock alert automation |
| `10-weekly-report.json` | `ops.weekly.report.requested` | management reporting |

## Runtime Rule (Go-Live)

- Legacy workflow JSON files are kept as **inactive templates** (`"active": false`).
- Production orchestration runs through the API worker bridge (`apps/api/internal/worker/automation_bridge.go`).
- n8n must consume only signed event bridge payloads and must not mutate checkout/payment/order state directly.

## Canonical Event Bridge Payload

```json
{
  "event_type": "payment.succeeded",
  "occurred_at": "2026-02-25T10:00:00Z",
  "payload": {
    "order_id": "uuid",
    "payment_reference": "stripe_session_id",
    "event_type": "checkout.session.completed"
  }
}
```

Headers:

- `X-Simone-Event-Type: <event_type>`
- `X-Simone-Signature: sha256=<hmac>`
