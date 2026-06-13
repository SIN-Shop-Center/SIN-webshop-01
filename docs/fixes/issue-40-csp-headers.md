# Fix #40 — CSP/Security-Headers: next.config.ts headers() + Permissions-Policy + COOP/COEP

> **Status:** OPEN · **Priority:** HIGH (P1) · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/40

## Status

Bereits deployed (mit `Report-Only` Modus in v11). Die echte Enforcung wartet auf 7 Tage ohne Violations, dann `CSP_ENFORCE=true` setzen.

## Step 1 — verify the current CSP

```sh
curl -sI https://shopsin.delqhi.com/ | grep -iE 'content-security|strict-transport|frame|nosniff|permissions-policy|cross-origin'
```

Expected (Report-Only):
```
Content-Security-Policy-Report-Only: default-src 'self'; script-src ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), ...
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-site
```

## Step 2 — monitor for violations (7 days)

```sh
# Add a report-uri in next.config.ts (in the csp array):
"report-uri https://shopsin.delqhi.com/api/csp-report"
```

```ts
// app/api/csp-report/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = createAdminClient()
  await supabase.from('csp_violations').insert({
    document_uri: body['document-uri'],
    violated_directive: body['violated-directive'],
    blocked_uri: body['blocked-uri'],
    original_policy: body['original-policy'],
    user_agent: req.headers.get('user-agent'),
    received_at: new Date().toISOString(),
  })
  return NextResponse.json({ ok: true })
}
```

```sql
-- scripts/supabase/setup-csp-violations.sql
CREATE TABLE IF NOT EXISTS shop.csp_violations (
  id BIGSERIAL PRIMARY KEY,
  document_uri TEXT,
  violated_directive TEXT,
  blocked_uri TEXT,
  original_policy TEXT,
  user_agent TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Step 3 — daily review

```sql
SELECT
  violated_directive,
  count(*) as hits,
  max(received_at) as last_seen
FROM shop.csp_violations
WHERE received_at > NOW() - INTERVAL '7 days'
GROUP BY violated_directive
ORDER BY hits DESC;
```

## Step 4 — wenn 0 Violations: enforce!

```sh
# Auf Cloudflare:
wrangler secret put CSP_ENFORCE
# Wert: true

# Lösche Content-Security-Policy-Report-Only header, behalte nur CSP
```

## Step 5 — the final csp array (after 7 days without violations)

```ts
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cf.cjdropshipping.com https://*.cjdropshipping.com https://cbu01.alicdn.com https://images.unsplash.com https://lh3.googleusercontent.com https://supabase.delqhi.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://api.delqhi.com https://supabase.delqhi.com wss: https://plausible.delqhi.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "report-uri /api/csp-report",
  'upgrade-insecure-requests',
].join('; ')
```

## Step 6 — add COOP `same-origin` + Permissions-Policy (already done in v11)

```ts
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },          // NOW enforced (not Report-Only)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
]
```

## Acceptance

- 0 CSP violations in the last 7 days (check `shop.csp_violations`)
- `CSP_ENFORCE=true` set as Cloudflare secret
- `curl -sI` shows `Content-Security-Policy:` (NOT `Report-Only`)
- securityheaders.com Grade: A+

## Closing

```sh
gh issue close 40 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "CSP enforced nach 7 Tagen 0 Violations. securityheaders.com Grade A+."
```
