# Stripe Operations Skill

Manage Stripe payments for the Delqhi webshop (delqhi.com).

## Account

- **Account ID**: `acct_1TEhmvAZZTxFQVSB`
- **Country**: DE (Germany)
- **Mode**: Live

## Keys (LIVE)

- **Secret Key**: `sk_live_...Y67wA`
- **Webhook Secret**: `whsec_THCR4ppa1RMhadpdJR9ziLLjuL7VEqgr`

## Webhook

- **ID**: `we_1Tb9KHAZZTxFQVSBxnWV6N1p`
- **URL**: `https://api.delqhi.com/api/v1/webhooks/stripe`
- **Live Mode**: true

## Common Operations

### Create a Checkout Session
```bash
curl -s https://api.delqhi.com/api/v1/checkout/create \
  -H "Content-Type: application/json" \
  -d '{"customer_email":"customer@example.com","items":[{"product_id":"UUID","quantity":1}]}'
```

### List recent Stripe charges
```bash
curl -s https://api.stripe.com/v1/charges?limit=5 \
  -u "sk_live_...Y67wA:" | python3 -m json.tool
```

### List recent Stripe checkout sessions
```bash
curl -s https://api.stripe.com/v1/checkout/sessions?limit=5 \
  -u "sk_live_...Y67wA:" | python3 -m json.tool
```

### Verify webhook endpoint
```bash
curl -s https://api.stripe.com/v1/webhook_endpoints \
  -u "sk_live_...Y67wA:" | python3 -m json.tool
```

### Refund a payment
```bash
curl -s -X POST https://api.stripe.com/v1/refunds \
  -u "sk_live_...Y67wA:" \
  -d "payment_intent=pi_XXXXX" | python3 -m json.tool
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `shop.checkout_sessions` | Maps Stripe session ID → order ID |
| `shop.orders` | Order status updated by webhook (`paid` on successful payment) |

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Update order status → `paid`, store payment intent |
| `checkout.session.expired` | Update order status → `cancelled` |

## Order Flow

1. Customer checkout → Stripe Checkout Session created
2. Customer pays → Stripe fires `checkout.session.completed` webhook
3. Go API verifies webhook signature → updates `shop.orders` status to `paid`
4. Go Worker picks up `paid` orders → creates CJ order

## Important Notes

- All prices in EUR (€)
- Stripe Checkout uses `mode: "payment"` (one-time, not subscription)
- Webhook secret is used to verify signature: `whsec_THCR4ppa1RMhadpdJR9ziLLjuL7VEqgr`
- Live mode is active — test with small amounts first
