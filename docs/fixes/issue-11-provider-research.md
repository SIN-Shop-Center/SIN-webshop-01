# Fix #11 — Besten Dropshipping-Anbieter recherchieren und anbinden

> **Status:** OPEN · **Priority:** low · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/11

## Context

Today only CJ is wired. Before adding a 2nd supplier, do a real research pass — the risk is "more SKUs ≠ more revenue", and the operational cost (inventory sync, returns, chargebacks) is real.

## Research checklist (output: `docs/PROVIDERS-EVAL.md`)

For each candidate supplier, fill:

| Dimension | CJ (current) | Spocket | Zendrop | AutoDS | Printful | Printify |
|----------|--------------|--------|--------|--------|----------|---------|
| EU warehouse? | ⚠️ partial | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| API quality | ⚠️ 1 QPS, brittle auth | ✅ REST | ✅ REST | ✅ REST | ✅ REST | ✅ REST |
| Catalog size | 4M+ | 1M+ | 1M+ | 1M+ | print-on-demand | print-on-demand |
| Branded packing? | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Commission | 0% | 0% | 0% | 0% | 0% | 0% |
| Returns | manual | portal | portal | portal | n/a | n/a |
| Min order | €0 | €0 | €0 | €0 | €0 | €0 |
| Payment | Wallet (prepaid) | Wallet | Wallet | Wallet | Per-order | Per-order |
| Payout to shop | 2–3 weeks | 2 weeks | 1–2 weeks | 1 week | 2 weeks | 2 weeks |

## Decision

**Recommendation: do NOT add a 2nd supplier before 500 SKUs and 50 orders/week.** Operational complexity grows linearly with each new supplier, but the addressable market is the same.

If you must add one: **Spocket** has the best EU stock ratio of the serious players, decent REST API, and a "Spocket US/EU warehouse" filter that maps directly onto the EU priority logic in `app/lib/cj/eu-warehouse-filter.mjs`.

## Integration pattern (Spocket, when the time comes)

```ts
// app/lib/spocket/client.ts
import { createAdminClient } from '@/lib/supabase/admin'

const SPOCKET_API = 'https://api.spocket.co/v1'

export async function spocketGet(path: string) {
  const res = await fetch(`${SPOCKET_API}${path}`, {
    headers: { Authorization: `Bearer ${process.env.SPOCKET_API_KEY}` },
  })
  if (!res.ok) throw new Error(`Spocket ${res.status}`)
  return res.json()
}

export async function importSpocketProducts(keyword: string, limit = 20) {
  const data = await spocketGet(`/search/products?query=${keyword}&limit=${limit}`)
  const supabase = createAdminClient()
  for (const p of data.products ?? []) {
    await supabase.from('products').upsert({
      id: crypto.randomUUID(),
      title: p.name,
      slug: p.slug,
      price: Number(p.retail_price) * 2.5,
      image_url: p.image_url,
      stock: p.stock_quantity,
      spocket_id: p.id,
      spocket_variant_id: p.variant_id,
    })
  }
}
```

## Acceptance

- `docs/PROVIDERS-EVAL.md` exists with the table above and a written decision.
- If decision is "stay with CJ only": #11 can be closed.
- If a 2nd provider is added: the new script lives under `app/lib/{provider}/` and is integrated into `scripts/import-products.mjs`.

## Closing

Close #11 with `docs/PROVIDERS-EVAL.md` link + decision.
