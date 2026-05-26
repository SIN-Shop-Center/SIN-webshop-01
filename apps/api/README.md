# API Service

Micro-modular Go Domain API for Delqhi Shop (delqhi.com).

## Run

```bash
go mod tidy
go run ./cmd/api
```

## Worker

```bash
go run ./cmd/worker
```

## Domains
- catalog
- cart
- checkout (Stripe: Card+SEPA+Klarna)
- orders
- suppliers (CJ Dropshipping: 3-step auto-fulfill)
- fulfillment (shipment tracking + email)
- admin
- ai
- social
- support

## Key Files

| File | Purpose |
|------|---------|
| `internal/worker/cj_client.go` | CJ API client (auth, freight, createOrder, getBalance, confirmOrder, payBalance) |
| `internal/worker/cj_dispatch.go` | CJ 3-step dispatch: create→confirm→payBalance (payType=2) |
| `internal/worker/payout.go` | Stripe Instant Payout trigger (goroutine after payment.succeeded) |
| `internal/worker/handlers_orders.go` | Order lifecycle: payment.succeeded → invoice + email + supplier dispatch |
| `internal/worker/handlers_fulfillment.go` | Shipment tracking updates + German shipment emails |
| `internal/worker/mailer.go` | Resend (primary) + Gmail API (fallback) email sender |
| `internal/worker/status_machine.go` | Order status transitions (created→paid→processing→supplier_ordered→shipped→delivered) |
| `internal/checkout/stripe.go` | Stripe Checkout (Card, SEPA, Klarna) + PaymentIntent descriptor |
| `internal/suppliers/handler.go` | CJ webhook handler (order/logistic events) |
