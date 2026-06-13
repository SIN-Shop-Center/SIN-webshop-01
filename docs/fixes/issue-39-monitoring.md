# Fix #39 — Monitoring-Stack: Sentry (Errors) + Uptime Kuma (Health) + Resend-Alerts

> **Status:** OPEN · **Priority:** HIGH (P1) · **External (Sentry/Uptime Kuma) + Code (Integration)**
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/39

## Context

A live shop with no monitoring is a time bomb. The 4 must-have signals:

1. **Error rate** (Sentry) — every uncaught exception in the worker or the API
2. **Uptime** (Uptime Kuma) — every 60s `GET /` + `GET /api/healthz` + `GET https://supabase.delqhi.com/auth/v1/health`
3. **Cron health** (Resend) — if cj-fulfillment or fx-update haven't run in 25h, send alert
4. **Order funnel** (Plausible via #58) — add-to-cart / checkout / payment events

## Step 1 — Uptime Kuma (self-hosted, 5 Min)

```sh
# Auf der OCI-VM (oder als Docker-Container irgendwo)
docker run -d --name uptime-kuma \
  --restart unless-stopped \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  louislam/uptime-kuma:1

# Cloudflare Tunnel
cloudflared tunnel route dns sin-monitoring kuma.delqhi.com

# Im Uptime-Kuma-UI:
# 1. Add Monitor → Type: HTTPS
# 2. URL: https://shopsin.delqhi.com/
# 3. Interval: 60s
# 4. Add to: Production
# 5. Notification: Resend webhook
# 6. Repeat for /api/healthz and supabase.delqhi.com
```

## Step 2 — Sentry (1 Min setup, 5 Min code)

```sh
# 1. Signup: sentry.io → New Project → Next.js
# 2. Get DSN: https://<key>@<org>.ingest.sentry.io/<project>

# 3. Install
pnpm add @sentry/nextjs
```

```ts
// sentry.client.config.ts (project root)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
})
```

```ts
// sentry.server.config.ts (project root)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
})
```

```bash
# .env.local
SENTRY_DSN=https://...@....ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
```

## Step 3 — Resend cron-health alert

```ts
// app/api/cron/cron-health/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CRON_NAMES = [
  'cj-sync',
  'cj-fulfillment',
  'cj-reviews',
  'fx-update',
  'cleanup-reservations',
  'cart-cleanup',
  'fulfillment-retry',
]

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: jobs } = await supabase
    .from('cron_runs')
    .select('name, last_run_at, success')
    .order('last_run_at', { ascending: false })

  const stale = CRON_NAMES.filter((name) => {
    const job = jobs?.find((j) => j.name === name)
    if (!job?.last_run_at) return true
    return Date.now() - new Date(job.last_run_at).getTime() > 25 * 3600 * 1000
  })

  if (stale.length > 0) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'alerts@delqhi.com',
        to: ['opensin@gmx.com'],
        subject: `[ShopSIN] ⚠️ ${stale.length} Crons stale`,
        text: `Stale crons: ${stale.join(', ')}`,
      }),
    })
  }

  return NextResponse.json({ stale, checked: CRON_NAMES.length })
}
```

```sql
-- scripts/supabase/setup-cron-runs.sql
CREATE TABLE IF NOT EXISTS shop.cron_runs (
  name TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,
  result JSONB
);
```

## Step 4 — wire Sentry into API routes

In `app/lib/observability/sentry.ts` (NEW):

```ts
import * as Sentry from '@sentry/nextjs'

export function captureError(err: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(err, { extra: context })
}
```

In each route handler, wrap risky calls:

```ts
import { captureError } from '@/lib/observability/sentry'

try {
  // risky call
} catch (err) {
  captureError(err, { route: '/api/checkout', userId: user.id })
  return NextResponse.json({ error: 'generic' }, { status: 500 })
}
```

## Step 5 — wire Uptime Kuma → Resend

In Uptime Kuma:
1. Settings → Notifications → Add: Type `Resend` (webhook)
2. URL: `https://api.resend.com/emails`
3. Method: POST
4. Body: `{ "from": "...", "to": ["..."], "subject": "...", "text": "..." }`
5. Headers: `Authorization: Bearer re_...`

## Acceptance

- Sentry catches 1+ error in test
- Uptime Kuma shows all 3 monitors (Homepage, Healthz, Supabase) = 200
- Resend alert arrives when a cron is missed for >25h

## Closing

```sh
gh issue close 39 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Sentry + Uptime Kuma + Resend cron-health alerts deployed."
```
