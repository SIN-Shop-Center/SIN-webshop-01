# Fix #25 — Aufräumen + End-to-End-Verifizierung

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/25

## Context

After ~50 PRs and 6 months of development, there is dead code, TODOs, inconsistent naming, and "magic strings" everywhere. This is the **tech-debt reduction** epic.

## Audit (run on the repo, takes ~15 min)

```sh
# 1. TODOs and FIXMEs
grep -RIn --color=never -E 'TODO|FIXME|XXX|HACK' app/ components/ 2>/dev/null \
  | head -50

# 2. console.log statements
grep -RIn --color=never -E 'console\.(log|debug)' app/ 2>/dev/null \
  | grep -v '__tests__' | head -30

# 3. Dead imports
# Use: npx ts-prune (or unimported)

# 4. Unused dependencies
pnpm dlx depcheck

# 5. Hard-coded URLs (should be env)
grep -RIn --color=never -E 'https?://(localhost|127\.0\.0\.1|shopsin\.delqhi\.com|supabase\.delqhi\.com)' \
  app/ components/ 2>/dev/null | grep -v 'env.example' | head -20

# 6. Inconsistent naming (productId vs product_id vs productID)
grep -RIn --color=never -E '\bproductId\b|\bProductID\b' app/ 2>/dev/null | head -10

# 7. Long files (>400 lines)
find app components -name '*.ts' -o -name '*.tsx' | xargs wc -l 2>/dev/null \
  | sort -n | tail -20
```

## Concrete cleanup targets (likely)

| Pattern | Action |
|---------|--------|
| `app/lib/legacy/` | Delete dir, `grep` for imports, fix all callers |
| `app/lib/utils/old-helpers.ts` | Same |
| `*.doc.md` without matching code file | Delete (orphan doc) |
| Hard-coded `http://localhost:3000` | Replace with `process.env.NEXT_PUBLIC_APP_URL` |
| Inline `style={{...}}` in >10 places | Extract to `tailwind.config`/`globals.css` |
| TODO comments in critical paths (cart, checkout, fulfillment) | Either fix or create issue |
| `console.log` in production code | Replace with proper `logger` (e.g. pino) or remove |
| Direct `process.env.X` in components | Wrap in `getEnv()` helper |

## Polish pass (script)

```ts
// scripts/lint-cleanup.sh
#!/usr/bin/env bash
set -euo pipefail

echo "=== console.log in production ==="
grep -RIn --include="*.ts" --include="*.tsx" -E 'console\.(log|debug)' app/ 2>/dev/null \
  | grep -v '__tests__' \
  | head -50 \
  || echo "  (clean)"

echo ""
echo "=== TODOs in critical paths ==="
grep -RIn --include="*.ts" --include="*.tsx" -E 'TODO|FIXME' \
  app/lib/actions/cart.ts app/lib/actions/checkout.ts \
  app/lib/fulfillment/ app/api/stripe/ 2>/dev/null \
  || echo "  (clean)"

echo ""
echo "=== Files > 500 lines ==="
find app -name '*.ts' -o -name '*.tsx' | xargs wc -l 2>/dev/null \
  | awk '$1 > 500 { print $0 }' | head -10

echo ""
echo "=== Long functions (>100 lines) ==="
grep -RIn -E '^export (async )?function [a-zA-Z]+' app/ 2>/dev/null | head -5
```

## Specific deletions (likely)

```sh
# Remove orphan docs
rm -f app/lib/LEGACY.md app/lib/legacy-README.md
rm -rf app/legacy/ components/old/ 2>/dev/null

# Remove duplicate Supabase client
ls app/lib/supabase/
# Should be: admin.ts, client.ts, data-client.ts, middleware.ts, queries.ts, server.ts
# Delete any duplicates (e.g. old-client.ts, new-server.ts)
```

## Specific rewrites

```ts
// app/lib/utils/env.ts (new)
export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  cjToken: (await import('node:fs')).readFileSync(
    `${process.env.HOME}/.cj-tokens.json`,
    'utf-8',
  ),
  cronSecret: process.env.CRON_SECRET!,
  resendKey: process.env.RESEND_API_KEY!,
}
```

Replace `process.env.X` direct reads with this.

## Acceptance

- `pnpm dlx depcheck` → 0 unused deps
- `npx ts-prune` → 0 unused exports
- 0 `console.log` in production
- 0 hard-coded localhost / production URLs in `app/`
- 0 files > 500 lines
- `pnpm typecheck && pnpm build` green

## Closing

```sh
gh issue close 25 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Cleanup pass done. 0 TODOs in critical paths, 0 console.log, 0 hardcoded URLs."
```
