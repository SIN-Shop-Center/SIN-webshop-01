# Fix #9 — Epic: Google Merchant Center (2026) Architektur- & Compliance-Update für Dropshipping

> **Status:** OPEN · **Priority:** medium (epic, contains sub-tasks) · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/9

## Context

Google Merchant Center requires strict product feed compliance: GTIN/MPN/HAN, brand, price + shipping, age group, condition, product_type, link to canonical landing page. For dropshipping (CJ), most of this data is **absent** — so the right answer is not "feed everything" but "select a compliant subset and segment the rest" (often: own-brand / non-CJ subset only).

## Deliverables (use this as the epic checklist)

| # | Sub-task | Owner | Status |
|---|----------|-------|--------|
| 9.1 | Decide: own-brand-only feed vs. mixed (CPL-aware) | product | TODO |
| 9.2 | `app/api/merchant-feed/route.ts` — already exists, see #57 | code | ✅ |
| 9.3 | GTIN column on `shop.products` (nullable) | data | TODO |
| 9.4 | Brand column on `shop.products` (default `ShopSIN`) | data | TODO |
| 9.5 | `restock_date` + `availability_date` semantics | data | TODO |
| 9.6 | `docs/MERCHANT-COMPLIANCE.md` — what we ship, what we filter out | docs | TODO |
| 9.7 | GDPR disclaimer + return policy URL in feed | docs | TODO |
| 9.8 | Scheduled submission in Google Search Console / Merchant API | ops | TODO |

## SQL — add the missing columns

```sql
-- scripts/supabase/setup-merchant-feed.sql
BEGIN;
ALTER TABLE shop.products
  ADD COLUMN IF NOT EXISTS gtin          TEXT,
  ADD COLUMN IF NOT EXISTS mpn           TEXT,
  ADD COLUMN IF NOT EXISTS brand         TEXT NOT NULL DEFAULT 'ShopSIN',
  ADD COLUMN IF NOT EXISTS condition     TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS product_type  TEXT,
  ADD COLUMN IF NOT EXISTS availability_date DATE;
COMMIT;
```

## Filter logic (CPL-safe subset)

```ts
// in app/api/merchant-feed/route.ts
const compliant = (products ?? []).filter(
  (p) =>
    p.is_active &&
    Number(p.price) > 0 &&
    p.image_url &&                // required by Google
    p.title.length >= 20,         // title is too short → noisy feed
)
```

Document the **exclusion criteria** in `docs/MERCHANT-COMPLIANCE.md`:

- >70% of CJ products have no GTIN → exclude for now.
- Dropshipping margin below 25% → exclude (Google flags thin margins in some regions).
- Electronics, supplements, no brand certificate → exclude.

## Feed URL: `https://shopsin.delqhi.com/api/merchant-feed`

Submit to Google Merchant Center → Products → Feeds → Add feed → Scheduled fetch (daily).

## Acceptance

- Feed returns HTTP 200 + valid XML (no `<error>` nodes).
- Google Merchant Center shows ≥90% products "Approved" (the rest "Disapproved" with documented reason).
- `docs/MERCHANT-COMPLIANCE.md` exists and is linked from README.
- `brand` and `gtin` columns exist in `shop.products`.

## Closing the epic

Sub-issues can be created per deliverable. Once 9.1–9.7 are merged, close #9 with a summary comment listing the created sub-issues.
