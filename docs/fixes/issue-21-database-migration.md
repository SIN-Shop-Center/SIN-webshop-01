# Fix #21 — Neon-Datenbank + Produktdaten (statt localStorage/hartcodiert)

> **Status:** OPEN (im Issue-Tracker, ABER in der Praxis: DONE) · **Priority:** low
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/21

## Context

The original plan was a hosted Neon Postgres, but we switched to **self-hosted Supabase** on the OCI VM. The intent of the issue — replace `localStorage` / hardcoded product JSON with a real DB — is fully realized.

## Verifizierung

```sh
# 1. DB ist live, kein localStorage mehr
ssh ubuntu@92.5.60.87 "
docker exec supabase-db psql -U postgres -d postgres -c '
SELECT
  (SELECT count(*) FROM shop.products) as products,
  (SELECT count(*) FROM shop.orders) as orders,
  (SELECT count(*) FROM shop.cart_items) as carts;
' 2>&1
"
# Expected: products > 50, orders > 0, carts > 0

# 2. Kein localStorage im Code
cd /Users/jeremy/dev/SIN-webshop-01
grep -RIn 'localStorage' app/ components/ 2>/dev/null || echo "✓ kein localStorage"

# 3. Keine hardcoded product-Listen
grep -RIn 'products\.json\|fixtures' app/ components/ 2>/dev/null || echo "✓ keine hardcoded fixtures"
```

## Was stattdessen läuft

- **Datenbank**: Self-hosted Supabase auf OCI-VM (92.5.60.87) statt Neon
- **Produkt-Source**: `app/lib/supabase/queries.ts` nutzt PostgREST über `shop.products_v` View
- **Cart**: `app/lib/actions/cart.ts` mit atomarer `reserve_stock` RPC
- **Orders**: `app/lib/actions/checkout.ts` → Stripe → `shop.orders` → Webhook
- **Schemas**: `shop` (App) + `public` (Supabase core)

## Closing

```sh
gh issue close 21 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "localStorage entfernt, Supabase Self-Hosted statt Neon. Produkte/Carts/Orders in echter DB."
```
