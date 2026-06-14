# Deploy: Next.js 16 Storefront auf Cloudflare Workers

> **Ziel:** `shopsin.delqhi.com` (neuer Next.js 16 Stack)
> **Methode:** OpenNext 1.19 Cloudflare Adapter
> **Alter Worker** (`simone-worldbest-shop` auf `delqhi.com`) bleibt **unverändert**.

## Voraussetzungen (einmalig)

1. **Cloudflare Account** mit Zone `delqhi.com` (sollte bereits vorhanden sein)
2. **Node.js 24 LTS** lokal (via `nvm use 24` oder `fnm use 24`)
3. **Wrangler CLI** ist als dev-Dependency installiert (`pnpm exec wrangler --version`)
4. **Alle Secrets** in Infisical vorhanden (siehe `CLOUDFLARE.md`)

## Schritte

### 1. Cloudflare-Dashboard (einmalig)

| Schritt | Wo | Was |
|---------|-----|-----|
| Worker erstellen | Workers & Pages → Create Worker | Name: `shopsin-storefront` (kann vorerst leer deployt werden) |
| Custom Domain | Worker → Settings → Triggers | `shopsin.delqhi.com` hinzufügen — Cloudflare legt DNS-Record automatisch an |
| Environment Variables | Worker → Settings → Variables | Alle Secrets aus `.env.example` als "Encrypted" eintragen (außer `NEXT_PUBLIC_APP_URL`, das ist im `wrangler.jsonc` als Public Var) |

### 2. Lokales Auth (einmalig pro Entwickler)

```bash
pnpm exec wrangler login
# Öffnet Browser, Cloudflare OAuth
```

### 3. Erstes Deploy

```bash
# Voraussetzungen vor dem ersten Deploy (R2 + D1 + DO Queue)
# R2 muss im Cloudflare-Dashboard aktiviert sein
pnpm exec wrangler r2 bucket create shopsin-storefront-cache
pnpm exec wrangler d1 create shopsin-tag-cache
pnpm exec wrangler d1 execute shopsin-tag-cache --remote --command \
  "CREATE TABLE IF NOT EXISTS revalidations (tag TEXT PRIMARY KEY, revalidatedAt INTEGER NOT NULL, stale INTEGER, expire INTEGER);"

# Build + Deploy
pnpm deploy:cloudflare
# (= pnpm build:cf && pnpm exec wrangler deploy)
```

### 4. GitHub Auto-Deploy (empfohlen)

Cloudflare Dashboard → Workers → `shopsin-storefront` → Settings → Builds:
- Connect to GitHub → `SIN-Shop-Center/SIN-webshop-01`
- Branch: `main`
- Build command: `pnpm install && pnpm build:cf`
- Deploy command: `pnpm exec wrangler deploy`
- Environment variables: aus Cloudflare Secrets (automatisch verfügbar)

### 5. Nach dem Deploy — URLs updaten

| Dienst | URL |
|--------|-----|
| Stripe Webhook | `https://shopsin.delqhi.com/api/stripe/webhook` (Live-`whsec` setzen) |
| Resend Sender Domain | `delqhi.com` muss verifiziert sein, dann `noreply@delqhi.com` |
| CJ Cron URLs | unverändert (cron läuft im Worker, nicht extern) |
| OAI / Notion / sonstige Tools | URLs von `delqhi.com` auf `shopsin.delqhi.com` umstellen |

### 6. Alte Domain `delqhi.com` (NICHT anfassen)

Der bestehende `simone-worldbest-shop` Cloudflare Worker bleibt so lange online, bis:
- ShopSIN-Deployment stabil läuft (mindestens 1 Woche ohne major issues)
- DNS-Records umgezogen sind (NICHT vor dem 7.–14. Tag)
- Stripe-Webhook nur noch auf neue Domain zeigt

## Lokales Dev vs Cloudflare-Dev

| Befehl | Zweck |
|--------|-------|
| `pnpm dev` | Next.js Dev-Server (HMR, schnelles Feedback) — `localhost:3000` |
| `pnpm build:cf` | OpenNext-Build (für Cloudflare Workers) — Output in `.open-next/` |
| `pnpm preview` | Lokale Wrangler-Preview (simuliert Cloudflare-Env) — `localhost:8787` |

## Troubleshooting

**Build-Fehler "Node.js middleware is not currently supported":**
→ Du hast noch `proxy.ts` oder `middleware.ts` aktiv. OpenNext unterstützt nur Edge Middleware. Wir haben die Supabase-Session-Refresh-Middleware entfernt — die Auth-Prüfung passiert jetzt per-Page via `requireAdmin()` und RLS.

**"R2 bucket not found":**
→ `pnpm exec wrangler r2 bucket create shopsin-storefront-cache`

**"Custom domain not configured":**
→ Im Cloudflare-Dashboard → Worker → Settings → Triggers → Custom Domains → `shopsin.delqhi.com` hinzufügen

**Deploy erfolgreich aber 404 auf der URL:**
→ Custom Domain noch nicht registriert. Warte ~1 Min nach Hinzufügen.

## Rollback-Plan

Falls etwas schief geht:
1. Cloudflare Dashboard → Workers → `shopsin-storefront` → Settings → Triggers → Custom Domain **entfernen** (nicht den Worker löschen)
2. DNS-Record `shopsin.delqhi.com` bleibt erhalten, zeigt aber auf nichts
3. Alte `delqhi.com` Worker läuft unverändert weiter
