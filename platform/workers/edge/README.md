# Edge Workers

Supabase Edge Functions for isolated micro-processes.

## Structure

- `functions/_shared`: shared runtime modules (env, auth, events, http, types)
- `functions/checkout-create`: create order + Stripe checkout session
- `functions/stripe-webhook`: Stripe webhook ingestion with inbox dedupe
- `functions/fulfillment-run`: fulfillment process entrypoint
- `functions/tracking-update`: scheduled shipment tracking updater
- `functions/admin-orders-list`: admin orders read endpoint
- `functions/admin-order-update`: admin order mutation endpoint

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`
- `CORS_ALLOWLIST` (comma separated)
- `WORKER_SHARED_SECRET` (for internal worker-to-worker calls)
- `STRIPE_SECRET_KEY` (checkout + webhook)
- `STRIPE_WEBHOOK_SECRET` (webhook only)
- `AUTO_FULFILL` (`true`/`false`)
- `EASYPOST_API_KEY` (tracking updater)

## Deploy

From this directory:

```bash
supabase functions deploy checkout-create
supabase functions deploy stripe-webhook
supabase functions deploy fulfillment-run
supabase functions deploy tracking-update
supabase functions deploy admin-orders-list
supabase functions deploy admin-order-update
```
