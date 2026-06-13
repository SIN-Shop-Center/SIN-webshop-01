# Fix #18 — TikTok-Shop einrichten & an Stripe-Checkout anbinden

> **Status:** OPEN · **Priority:** low · **External (TikTok Seller signup) + Code**
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/18
> **Owner:** Jeremy (TikTok Seller signup) + Agent (Code)

## Context

TikTok Shop for DE is currently in closed beta (gated via TikTok Seller). Once accepted, TikTok Shop orders are NOT routed through your existing Stripe checkout — TikTok has its own in-app checkout. You must sync products + orders bi-directionally.

## Phase 1 — apply for TikTok Shop DE (human, 2-4 weeks approval)

1. Register at https://seller-th.tiktok.com
2. Submit business documents (Handelsregister, VAT ID, Bank)
3. Wait for approval (typical: 2-4 weeks)
4. Get `client_key` + `client_secret` + `shop_id`

Store as:
- `.env.local`: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_SHOP_ID`
- Cloudflare: `wrangler secret put TIKTOK_CLIENT_KEY`

## Phase 2 — product sync (agent code)

```ts
// app/lib/tiktok-shop/client.ts
const TIKTOK_API = 'https://open-api.tiktokglobalshop.com/api/v1'

export async function tiktokGet(path: string) {
  const res = await fetch(`${TIKTOK_API}${path}`, {
    headers: {
      'x-tts-access-token': process.env.TIKTOK_ACCESS_TOKEN!,
    },
  })
  if (!res.ok) throw new Error(`TikTok ${res.status}`)
  return res.json()
}

export async function tiktokPost(path: string, body: any) {
  const res = await fetch(`${TIKTOK_API}${path}`, {
    method: 'POST',
    headers: {
      'x-tts-access-token': process.env.TIKTOK_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`TikTok ${res.status}`)
  return res.json()
}

export async function syncProductsToTikTok() {
  const supabase = createAdminClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .is('tiktok_product_id', null)
    .limit(20)

  for (const p of products ?? []) {
    const res = await tiktokPost('/product/create', {
      title: p.title,
      description: p.description,
      price: { amount: Math.round(Number(p.price) * 100), currency: 'EUR' },
      stock: p.stock,
      images: [p.image_url_local ?? p.image_url],
      category: p.product_type ?? 'General',
      sku: p.id,
    })
    if (res.product_id) {
      await supabase
        .from('products')
        .update({ tiktok_product_id: res.product_id })
        .eq('id', p.id)
    }
  }
}
```

```sql
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS tiktok_product_id TEXT;
```

## Phase 3 — order webhook (TikTok → ShopSIN backoffice)

```ts
// app/api/webhooks/tiktok-shop/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = createAdminClient()
  await supabase.from('orders').insert({
    source: 'tiktok_shop',
    tiktok_order_id: body.order_id,
    email: body.buyer_email,
    amount_total: body.total_amount,
    currency: 'EUR',
    items: body.line_items,
    status: 'paid',
    created_at: new Date().toISOString(),
  })
  return NextResponse.json({ ok: true })
}
```

## Phase 4 — disable our Stripe checkout for TikTok traffic

Detect TikTok referer in middleware.ts and redirect to TikTok in-app:

```ts
// middleware.ts
if (request.headers.get('referer')?.includes('tiktok.com')) {
  return NextResponse.redirect('https://www.tiktok.com/@shopsin')
}
```

## Acceptance

- TikTok Seller account approved
- `tiktok_product_id` filled for ≥20 products
- Test order placed via TikTok → visible in `shop.orders` with `source='tiktok_shop'`

## Closing

```sh
gh issue close 18 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "TikTok Shop DE setup, bi-directional sync deployed."
```
