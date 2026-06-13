# Fix #17 — Social-Media-Accounts erstellen & verknüpfen

> **Status:** OPEN · **Priority:** low · **External + Content-Task (kein reiner Code-Task)**
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/17

## Context

ShopSIN currently has no social presence. The 51–136 products are sellable but invisible outside of organic search + Google Shopping (Issue #57). This is a marketing task that is mostly **outside the repo**.

## Decision: which channels to open, in which order?

| Channel | Effort | ROI for dropshipping | Recommendation |
|---------|--------|----------------------|----------------|
| **Instagram** | medium (visuell) | medium (3-7% engagement for niches) | ✅ Open after 30 products |
| **TikTok** | high (video) | high (viral potential) | ✅ Open after 100 products |
| **Pinterest** | low (auto-pin via RSS) | medium (long-tail evergreen) | ✅ Open immediately (auto-pin) |
| **YouTube Shorts** | high (video) | medium | ⚠️ After TikTok |
| **Facebook Page** | low | low (organic reach dead) | ❌ Skip |
| **X / Twitter** | low | low (no interest) | ❌ Skip |
| **LinkedIn** | low | ❌ (B2C doesn't fit) | ❌ Skip |

## Phase 1 — auto-pin new products to Pinterest (no manual work)

```ts
// app/api/cron/pinterest-sync/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PINTEREST_TOKEN = process.env.PINTEREST_API_TOKEN
const BOARD_ID = process.env.PINTEREST_BOARD_ID
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!PINTEREST_TOKEN || !BOARD_ID) {
    return NextResponse.json({ error: 'pinterest not configured' }, { status: 503 })
  }

  const supabase = createAdminClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, title, image_url_local, image_url, slug')
    .eq('is_active', true)
    .is('pinterest_pin_id', null)
    .limit(20)

  let pinned = 0
  for (const p of products ?? []) {
    const res = await fetch(
      `https://api.pinterest.com/v5/pins`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PINTEREST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_id: BOARD_ID,
          title: p.title,
          description: p.title,
          link: `${SITE_URL}/produkt/${p.slug ?? p.id}`,
          media_source: {
            source_type: 'image_url',
            url: p.image_url_local ?? p.image_url,
          },
        }),
      },
    )
    if (res.ok) {
      const { id } = await res.json()
      await supabase
        .from('products')
        .update({ pinterest_pin_id: id })
        .eq('id', p.id)
      pinned++
    }
    // Pinterest API: ~1 req/sec
    await new Promise((r) => setTimeout(r, 1100))
  }

  return NextResponse.json({ pinned, total: products?.length ?? 0 })
}
```

```sql
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS pinterest_pin_id TEXT;
```

## Phase 2 — Instagram + TikTok (manual, no code)

Once the catalog is bigger (>50 products), the human task is:

1. **Instagram**: open `@shopsin` account → connect to Meta Business Suite → post daily (use `Canva` template). Hashtags: #dropshipping, #onlineshop, #deutschland.
2. **TikTok Shop DE**: register at `seller-th.tiktok.com` → apply for Shop → list 30 hero products → link to `shopsin.delqhi.com/produkte` via TikTok Shop API.

## Phase 3 — embed in the storefront (code)

Add social-meta to the layout (in `app/layout.tsx`):

```tsx
// Add to existing metadata
openGraph: {
  // … existing
  images: [`${SITE_URL}/og-default.png`],
  locale: 'de_DE',
},
alternates: {
  canonical: SITE_URL,
},
```

## Acceptance

- Pinterest API pin created ≥ once per new product
- Instagram profile link in footer
- TikTok Shop URL in footer (or omitted if not yet created)

## Closing

```sh
gh issue close 17 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Pinterest auto-pin cron deployed. Instagram + TikTok manual setup in Meta Business Suite / TikTok Seller."
```
