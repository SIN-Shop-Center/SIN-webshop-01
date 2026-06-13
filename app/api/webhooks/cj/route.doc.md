# CJ Webhook Handler

**What:** Receives order-status push events from CJ Dropshipping and updates `shop.orders` accordingly.

**Where:** `POST https://shopsin.delqhi.com/api/webhooks/cj`

**Docs:** `app/api/webhooks/cj/route.ts`

## Events

| CJ Event | Result in DB | Email |
|----------|-------------|-------|
| `order.shipped` | `fulfillment_status='shipped'`, `tracking_number`, `shipped_at` | `sendOrderShipped` |
| `order.delivered` | `fulfillment_status='delivered'`, `delivered_at` | `sendOrderDelivered` |
| `order.exception` | `fulfillment_status='failed'` | — |
| `tracking.updated` | `fulfillment_status='shipped'`, `tracking_number` | `sendOrderShipped` |

## Security

- Verifies `X-CJ-Signature` header with HMAC-SHA256 using `CJ_WEBHOOK_SECRET`
- Deduplicates events via `shop.processed_events` (event key: `cj:{event}:{orderId}:{trackingNumber}`)
- Returns `401` on invalid signature, `400` on missing fields, `200` on success

## Env

- `CJ_WEBHOOK_SECRET` — shared secret from CJ Dashboard webhook settings

## Setup

1. Generate a secret and set it in CJ Dashboard + Cloudflare/GitHub/Infisical
2. In CJ Dashboard add webhook URL: `https://shopsin.delqhi.com/api/webhooks/cj`
3. Select events: `order.shipped`, `order.delivered`, `order.exception`, `tracking.updated`

## Related files

- `app/lib/emails/send.ts` — shipping/delivery email dispatch
- `app/lib/fulfillment/submit-order.ts` — forwards paid orders to CJ
- `app/api/cron/fulfillment-retry/route.ts` — retry cron for failed forwards
- `scripts/supabase/setup-cj.sql` — `cj_order_id`, `tracking_number` columns
