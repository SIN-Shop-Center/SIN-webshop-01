# Fix #35 — FX-Rate als Env-Variable + Cron für Wechselkurs-Update

> **Status:** OPEN · **Priority:** HIGH (P1) · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/35

## Context

CJ prices are in USD, ShopSIN sells in EUR. The current conversion is a hard-coded `FX_RATE=1.0` in `.env.local`, which is **wrong** (real EUR/USD ≈ 0.92 today). This silently reduces margin by ~8%.

There IS a `app/api/cron/fx-update/route.ts` already, and it presumably calls Frankfurter API to update `pricing-fx.ts`. Check first.

## Step 1 — audit

```sh
cd /Users/jeremy/dev/SIN-webshop-01
cat app/api/cron/fx-update/route.ts 2>/dev/null | head -30
echo "---"
cat app/lib/pricing-fx.ts 2>/dev/null | head -30
echo "---"
grep -RIn "FX_RATE\|fx_rate" app/ 2>/dev/null | head -10
```

## Step 2 — Env-Var in `.env.local`

```sh
# Vorher:
FX_RATE=1.0

# Nachher (manuell setzen, bis der Cron läuft):
FX_RATE=0.92

# Auf Cloudflare:
wrangler secret put FX_RATE
# In GitHub:
gh secret set FX_RATE --repo SIN-Shop-Center/SIN-webshop-01
```

## Step 3 — cron code (already exists, fix if broken)

```ts
// app/api/cron/fx-update/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const FRANKFURTER = 'https://api.frankfurter.app/latest'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 1. Fetch USD → EUR
  const res = await fetch(`${FRANKFURTER}?from=USD&to=EUR`)
  const data = await res.json() as { rates: { EUR: number } }
  const newRate = data.rates.EUR  // z.B. 0.92

  // 2. Speichere in shop.pricing_fx
  const supabase = createAdminClient()
  await supabase.from('pricing_fx').upsert({
    currency_pair: 'USD-EUR',
    rate: newRate,
    source: 'frankfurter',
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'currency_pair' })

  // 3. Optional: recalc all products.price_eur
  // (wenn products.price als `price_eur` gespeichert ist, nicht cj_cost_price)
  // await supabase.rpc('recalc_prices', { new_rate: newRate })

  return NextResponse.json({ rate: newRate, fetched_at: new Date().toISOString() })
}
```

```sql
-- scripts/supabase/setup-pricing-fx.sql
CREATE TABLE IF NOT EXISTS shop.pricing_fx (
  currency_pair TEXT PRIMARY KEY,
  rate NUMERIC NOT NULL,
  source TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Step 4 — wrangler.toml: register cron

```toml
# wrangler.toml
[triggers]
crons = [
  "0 6 * * *",   # daily 6 UTC: fx-update
  "0 1 * * *",   # daily 1 UTC: cj-sync
  "30 * * * *",  # hourly: cj-fulfillment
  "0 */3 * * *", # every 3h: cj-reviews
  "0 */4 * * *", # every 4h: cleanup-reservations
]
```

## Step 5 — verify

```sh
# 1. Manually trigger cron
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://shopsin.delqhi.com/api/cron/fx-update

# Expected response:
# {"rate": 0.92, "fetched_at": "..."}

# 2. Check DB
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT * FROM shop.pricing_fx;
"
```

## Step 6 — update pricing to use the live rate

```ts
// app/lib/pricing-fx.ts (new or update)
import { createClient } from '@supabase/server'

export async function getUsdToEurRate(): Promise<number> {
  // 1. try DB
  const supabase = await createClient()
  const { data } = await supabase
    .from('pricing_fx')
    .select('rate')
    .eq('currency_pair', 'USD-EUR')
    .single()
  if (data?.rate) return Number(data.rate)

  // 2. fall back to env
  const envRate = Number(process.env.FX_RATE)
  if (envRate > 0) return envRate

  // 3. hard fail-safe
  return 0.92
}
```

Then in `app/lib/actions/cart.ts` or wherever prices are calculated, use `getUsdToEurRate()` instead of `process.env.FX_RATE`.

## Acceptance

- `shop.pricing_fx` table exists and has fresh `fetched_at`
- `app/api/cron/fx-update/route.ts` returns valid rate
- `FX_RATE` env var matches latest fetched rate (within 1%)
- Product prices on /produkte reflect the live rate

## Closing

```sh
gh issue close 35 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "FX-Rate als Env-Var gesetzt, Cron aktualisiert täglich, pricing-fx.ts nutzt Live-Rate."
```
