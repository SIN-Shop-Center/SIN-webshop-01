# Fix #20 — Next.js-App aufsetzen + UI portieren (ersetzt Vite-SPA)

> **Status:** OPEN (im Issue-Tracker, ABER in der Praxis: DONE) · **Priority:** low
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/20

## Context

This issue tracked the original migration from a Vite-based SPA to a Next.js App Router app. **The migration is already complete**: `main` is a working Next.js 16 storefront on Cloudflare Workers, deployed at https://shopsin.delqhi.com.

## Verifizierung

```sh
cd /Users/jeremy/dev/SIN-webshop-01
git log --oneline | head -5
# should show: cdb86ba fix(cart), 8dc4923 feat(cj), aa8dd15 fix(import), ...

cat package.json | python3 -c "
import json, sys
p = json.load(sys.stdin)
print('framework:', p.get('dependencies', {}).get('next'))
print('react:', p.get('dependencies', {}).get('react'))
"
# Expected: next 16.x, react 19.x

ls app/ | head
# Expected: page.tsx, layout.tsx, components/, lib/, api/, etc.
```

## Was damals passierte

- Next.js 16 mit App Router aufgesetzt
- Bestehende React-Komponenten portiert von Vite zu Next.js
- OpenNext-Build-Pipeline für Cloudflare Workers
- DNS, CSP, Stripe-Webhook, CJ-Integration, Supabase-Anbindung

## Was noch fehlt

Nichts technisch — der Issue-Text ist historisch.

## Closing

```sh
gh issue close 20 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Migration Vite → Next.js 16 abgeschlossen. Live auf https://shopsin.delqhi.com."
```
