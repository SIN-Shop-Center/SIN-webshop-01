# Go-Live Today Checklist (Essential Only)

Stand: **26.05.2026**

## 1) Environment (must-have)

1. API:
   - `DATABASE_URL`
   - `CORS_ALLOWLIST`
   - `SITE_URL`
   - `SUPPLIER_WEBHOOK_SECRET`
   - `SUPABASE_URL` (or `SUPABASE_JWKS_URL` + `SUPABASE_ISSUER`)
2. Checkout:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. CJ Dropshipping:
   - `CJ_API_KEY`
   - `CJ_OPEN_ID`
4. Email:
   - `RESEND_API_KEY` (primary email provider)
   - `RESEND_FROM_DOMAIN` (optional, defaults to onboarding@resend.dev)
5. Mail (fallback):
   - `GOOGLE_SERVICE_ACCOUNT_JSON_B64` (or `GOOGLE_SERVICE_ACCOUNT_FILE`)
   - `GMAIL_DELEGATED_USER`
   - `GMAIL_SENDER_FROM`
   - `BILLING_COMPANY_NAME`
   - `BILLING_ADDRESS`
   - `BILLING_TAX_ID`
   - `BILLING_VAT_ID`
6. Web:
   - `INTERNAL_API_URL` (or `NEXT_PUBLIC_API_URL`)
7. Smoke:
   - `API_BASE_URL`
   - `ADMIN_BEARER_TOKEN`

## 1b) Manual Setup (Dashboard)

1. **Stripe Bank Account**: Add in Dashboard → Settings → Payouts
2. **Stripe Instant Payouts**: Enable in Dashboard (+1.5% fee, payouts in minutes)
3. **CJ Balance**: Fund with $20-50 via PayPal/credit card in CJ Dashboard
4. **Resend Domain**: Add delqhi.com to Resend + SPF/DKIM/DMARC DNS records

## 2) DB migration (must run before deploy)

Run all SQL migrations in:

`infra/supabase/migrations`

Newest required file for current features:

`20260226001100_growth_observability.sql`

## 3) Build and quality gates

```bash
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
pnpm run ci
```

Optional full API sweep (includes `internal/admin`):

```bash
INCLUDE_ADMIN_TESTS=1 pnpm test:api
```

## 4) Minimal smoke tests after deploy

```bash
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
pnpm check:env:live -- --with-smoke
API_BASE_URL=https://<api-host> \
ADMIN_BEARER_TOKEN=<admin_jwt> \
pnpm smoke:go-live
```

This smoke validates:
1. Public: `GET /health`, `GET /ready`
2. Admin: automation health, KPI scorecard, revenue forecast, channels list, TikTok channel health

## 5) Kill-switch readiness

Verify endpoint and operation:

`POST /api/v1/admin/kill-switch/{domain}`

Domains:
1. `checkout`
2. `channel_sync`
3. `campaign_publish`
4. `creator_payouts`

## 6) Go / No-Go

Go live only when:
1. all gates in section 3 are green
2. smoke tests in section 4 pass
3. no critical incidents or DLQ spikes before key switch

Single-command path (requires all live envs above):

```bash
pnpm go-live:today
```
