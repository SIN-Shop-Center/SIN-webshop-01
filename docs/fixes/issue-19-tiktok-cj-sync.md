# Fix #19 — TikTok ↔ CJ-Dropshipping Sync: Produkte + Bestellungen

> **Status:** OPEN · **Priority:** low · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/19

## Context

A "TikTok ↔ CJ sync" would mean: when a TikTok Shop order arrives → trigger CJ fulfillment automatically. Without it, every TikTok order has to be manually re-entered in CJ (which kills margin).

The shop already has `app/api/cron/cj-fulfillment/route.ts` (every 30 min) which picks up `shop.orders WHERE fulfillment_status='pending' AND source='shop'` and creates CJ orders. So **the only new thing** is: route TikTok orders into the same `pending` bucket.

## What the existing cron does

```sql
SELECT id, email, items, fulfillment_status
FROM shop.orders
WHERE fulfillment_status = 'pending' AND cj_order_id IS NULL;
```

The cron reads this, calls `CJ createOrder`, stores `cj_order_id`. This already works for Stripe orders.

## The TikTok-Sync patch (small)

```ts
// app/api/webhooks/tiktok-shop/route.ts (already in #18)
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const body = await req.json() as {
    order_id: string
    buyer_email: string
    line_items: Array<{ sku: string; quantity: number }>
    total_amount: number
  }

  const supabase = createAdminClient()
  // TikTok orders need source = 'shop' for the existing fulfillment cron to pick them up
  await supabase.from('orders').insert({
    source: 'shop',                  // <-- KEY: same source as Stripe orders
    tiktok_order_id: body.order_id,
    email: body.buyer_email,
    amount_total: body.total_amount,
    currency: 'EUR',
    items: body.line_items,
    status: 'paid',
    fulfillment_status: 'pending',
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
```

The only difference vs. #18 is: `source: 'shop'` (not `'tiktok_shop'`) so the existing `cj-fulfillment` cron grabs it.

## Verification

```sql
-- 1. Trigger test webhook
curl -X POST http://localhost:3000/api/webhooks/tiktok-shop \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TT-12345","buyer_email":"test@example.com","line_items":[{"sku":"cj-123","quantity":1}],"total_amount":2999}'

-- 2. Check pending order
SELECT id, source, fulfillment_status, cj_order_id FROM shop.orders
WHERE tiktok_order_id = 'TT-12345';

-- 3. Wait 30 min for fulfillment cron
-- 4. Re-check: cj_order_id should be set
```

## The reverse direction (CJ → TikTok)

When CJ ships a TikTok order, we need to push tracking back to TikTok. This is covered by #14 (CJ webhooks) + a small TikTok tracking update.

```ts
// in app/api/webhooks/cj/route.ts (from #14)
if (order.tiktok_order_id) {
  await tiktokPost('/order/update_tracking', {
    order_id: order.tiktok_order_id,
    tracking_number: body.trackingNumber,
    carrier: 'DHL',
  })
}
```

## Acceptance

- TikTok test order → visible in `shop.orders` with `source='shop'`, `fulfillment_status='pending'`
- After 30 min → `cj_order_id` populated
- After shipping → `tracking_number` pushed back to TikTok

## Closing

```sh
gh issue close 19 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "TikTok orders routed via existing cj-fulfillment cron. Bi-directional tracking via #14."
```
