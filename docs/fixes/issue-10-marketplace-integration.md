# Fix #10 — Integration von Amazon Shop, Google Merchant Center, myDealz und weiteren Marktplätzen

> **Status:** OPEN · **Priority:** low · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/10

## Context

This is a strategic/epic issue, not a code task. Before any integration, the question is: **which market makes economic sense for a German CJ dropshipping storefront with 50–500 SKUs?**

## Decision matrix

| Marketplace | Commission | Eligibility | Effort | Recommended? |
|-------------|-------------|-------------|--------|--------------|
| **Amazon DE** | 7–15% (cat) | Business account, VAT ID, Brand registry for many cats | High | ❌ Defer until 200+ SKUs |
| **Google Shopping** | CPC, ~€0.30/click | Via Merchant Center feed (#9) | Low | ✅ (covered by #9) |
| **myDealz** | Free submission via API, but PE-tracker required | Manual approval | Medium | ⚠️ After CPC budget ≥€500/mo |
| **Kaufland Global Marketplace** | ~9% | Seller account, EU stock or via CJ fulfillment | Medium | ✅ (PILOT) — strong German reach |
| **Otto Market** | 5–15% | Brand contract, EAN required, slow onboarding | Very high | ❌ Not for dropshipping |
| **Etsy** | 6.5% + listing fees | Hand-made bias | Medium | ❌ Doesn't fit CJ catalog |
| **eBay DE** | ~10% final value | Easy | Low | ✅ (PILOT) — fastest to launch |

## Recommend: **Kaufland Global Marketplace + eBay DE** first.

Both:
- Accept dropshipping (with own-account model)
- Speak JSON REST (similar to CJ)
- Have public feed import
- Are German-speaking by default

## Implementation pattern (Kaufland)

```ts
// app/lib/kaufland/client.ts
import { createAdminClient } from '@/lib/supabase/admin'

const KAUFLAND_API = 'https://api.kaufland.de/v1'

export async function kauflandRequest(path: string, init?: RequestInit) {
  const res = await fetch(`${KAUFLAND_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.KAUFLAND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`Kaufland ${res.status}`)
  return res.json()
}

export async function syncProductsToKaufland() {
  const supabase = createAdminClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .gt('price', 0)

  for (const p of products ?? []) {
    await kauflandRequest('/products/', {
      method: 'POST',
      body: JSON.stringify({
        sku: p.id,
        title: p.title,
        price: p.price,
        stock: p.stock,
        ean: p.gtin,
        brand: p.brand,
        images: [p.image_url_local ?? p.image_url],
        category: p.product_type,
        delivery: { price: 4.99 },
      }),
    })
  }
}
```

Cron: `app/api/cron/kaufland-sync/route.ts` (daily, 50/batch).

## Acceptance

- **Decision documented** in `docs/MARKETPLACES.md` with go/no-go per channel.
- For at least one approved marketplace, a working sync + a `docs/INTEGRATION-{name}.md` with the full setup.
- A `MARKETPLACES-ROADMAP.md` with milestones (e.g. "Q1 2026: Kaufland pilot; Q2: eBay; Q3: Amazon via Merchant API").

## Closing

Close #10 with a comment linking to `docs/MARKETPLACES.md` + the roadmap.
