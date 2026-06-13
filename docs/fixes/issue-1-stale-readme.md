# Fix #1 — Fix storefront product source and retire stale README surface

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/1

## Context

The original shop was a Vite SPA backed by a `localStorage` "Neon-style" store. The README still documents that legacy. The task is to update README + any leftover references to the old architecture so the README reflects **only** the current Supabase-backed Next.js storefront on Cloudflare Workers.

## Audit checklist (run on the repo)

```sh
# 1. Old repo name "neon-storefront" anywhere?
grep -RIn --color=never -E 'neon-storefront|localStorage' . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git

# 2. Old database references (Neon / Postgres URLs in README)?
grep -RIn --color=never -E 'postgresql://.*neon|@neon\.tech' . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git

# 3. Product source: hard-coded fixtures still referenced anywhere?
grep -RIn --color=never -E 'src/lib/fixtures|products\.json' . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git

# 4. README still claims "no backend"?
head -120 README.md
```

## Expected findings (top candidates)

1. `README.md` mentions `localStorage`, "Vitest SPA", or `neon-storefront` as a project name.
2. `package.json` or `pnpm-workspace.yaml` references a stale workspace (`packages/fixtures`, `packages/legacy-storefront`).
3. Comment in `app/page.tsx` or `app/layout.tsx` still says "TODO: replace localStorage".

## Fix recipe (concrete edits)

### Step 1 — rewrite `README.md`

Replace the "Project structure" + "Tech stack" section with the **current** description:

```markdown
# ShopSIN — Online Shop on Cloudflare

Live: https://shopsin.delqhi.com
Stack: Next.js 16 (App Router) · React 19 · Cloudflare Workers (OpenNext) ·
Supabase (PostgreSQL 15 + RLS) · Stripe Checkout · CJ Dropshipping.
```

Delete any paragraph that says "Vite", "localStorage", "Vitest SPA" or "no backend".

### Step 2 — strip legacy workspace

```sh
# Inspect
cat pnpm-workspace.yaml

# Remove stale entries (e.g. packages/fixtures, packages/legacy-storefront)
rm -rf packages/fixtures packages/legacy-storefront 2>/dev/null || true

# Verify
pnpm install --frozen-lockfile
```

### Step 3 — fix any leftover `src/lib/fixtures` imports

```sh
grep -RIn "from '@/lib/fixtures'" app components 2>/dev/null
# Replace each with: import { createAdminClient } from '@/lib/supabase/admin'
```

### Step 4 — delete or archive obsolete docs

```sh
# Anything that still references neon / localStorage / Vite / SPA
find docs -type f -name '*.md' | xargs grep -l -E 'neon|localStorage|Vite SPA' || true
# Rewrite or delete such files (prefer rewriting)
```

### Step 5 — surface the current architecture in a new `docs/ARCHITECTURE.md`

```markdown
# ShopSIN — Architecture

## Production

- Frontend: Next.js 16 App Router, deployed via OpenNext to Cloudflare Workers
  (custom domain `shopsin.delqhi.com`).
- Data: Supabase self-hosted on `sin-supabase` OCI VM, schema `shop`.
- Commerce: Stripe Checkout; order data persisted via Supabase service-role
  in `shop.orders`.
- Dropshipping: CJ Dropshipping API; orders created in `app/lib/fulfillment/`.

## Local dev

- `pnpm install`
- `pnpm dev` (Next.js dev server, port 3000).
- `cp .env.live.example .env.local` and fill real Supabase + Stripe keys.
```

## Acceptance

- `grep -RIn 'neon|localStorage|Vite SPA' . --exclude-dir=node_modules --exclude-dir=.git` returns no hits.
- README top section names Supabase + Cloudflare Workers + Stripe as the stack.
- `pnpm build` and `pnpm typecheck` are green.

## Closing the issue

```sh
gh issue close 1 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "README + workspace + docs updated. Architecture now reflects Supabase + Cloudflare."
```
