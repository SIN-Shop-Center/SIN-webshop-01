# Cloudflare Deployment Record

> **SUPERSEDED:** Diese Datei wurde archiviert am 12.06.2026. Die aktuelle
> Single-Source-of-Truth ist [AGENTS.md](../AGENTS.md) (Architektur,
> Debugging, Regeln) und [README.md](../README.md) (Übersicht, Deployment).

Stand: **11.06.2026** (Next.js 16 + OpenNext Stack)

## Production Targets

| Domain | Stack | Status |
|--------|-------|--------|
| `delqhi.com` | Alter Vite-Worker (`simone-worldbest-shop`) | 🔵 Live (unverändert) |
| `shopsin.delqhi.com` | **Neuer Next.js 16 + OpenNext Cloudflare** | 🟡 Ready to deploy |

## Neues Deployment-Target: `shopsin.delqhi.com`

- **Stack:** Next.js 16 (App Router) + OpenNext 1.19 → Cloudflare Workers
- **Worker-Name:** `shopsin-storefront`
- **R2-Cache:** `shopsin-storefront-cache` (für ISR, wird von OpenNext auto-provisioniert beim ersten Deploy)
- **Route:** `shopsin.delqhi.com/*` → Worker

## Was du im Cloudflare-Dashboard machen musst (einmalig)

### 1. Worker erstellen
Cloudflare Dashboard → Workers & Pages → Create Worker → Name: `shopsin-storefront` → Deploy (leer reicht vorerst).

### 2. Custom Domain hinzufügen
Worker → Settings → Triggers → Custom Domains → `shopsin.delqhi.com` hinzufügen.
Cloudflare legt automatisch den DNS-Record (CNAME) an, da `delqhi.com` in deinem Cloudflare-Account ist.

### 3. Environment Variables setzen
Worker → Settings → Variables → folgende Secrets hinzufügen (aus Infisical kopieren):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
CJ_EMAIL
CJ_API_KEY
CJ_PRICE_MULTIPLIER
CRON_SECRET
```

`NEXT_PUBLIC_APP_URL` ist bereits in `wrangler.jsonc` als `https://shopsin.delqhi.com` gesetzt (kein Secret nötig).

### 4. Live-Deploy per CLI (einmalig oder bei jedem Update)
```bash
# Auth einmalig (öffnet Browser)
pnpm exec wrangler login

# Build + Deploy
pnpm deploy:cloudflare
# (= pnpm build:cf && pnpm exec wrangler deploy)
```

### 5. Auto-Deploy via GitHub (optional, empfohlen)
- Cloudflare Dashboard → Workers → `shopsin-storefront` → Settings → Builds
- Connect to GitHub → Repo `SIN-Shop-Center/SIN-webshop-01` auswählen
- Build command: `pnpm install && pnpm build:cf`
- Deploy command: `pnpm exec wrangler deploy`
- Branch: `main`

## DNS-Records (automatisch durch Cloudflare)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `shopsin` | `shopsin-storefront.<account>.workers.dev` | Proxied (orange) |

## Routes (Next.js 16 App Router)

24 Routen: `/`, `/produkt/[id]`, `/warenkorb`, `/kasse/erfolg`, `/wunschliste`,
`/auth/*`, `/impressum`, `/datenschutz`, `/agb`, `/widerrufsrecht`, `/versand`,
`/kontakt`, `/konto/bestellungen`, `/admin/*`, `/api/cron/*`, `/api/stripe/webhook`.

## Alte Domain `delqhi.com` (NICHT anfassen)

Der bisherige `simone-worldbest-shop` Worker bleibt unverändert online.
Migration auf `shopsin.delqhi.com` ist VOR dem Switch — der alte Worker
wird erst dann abgeschaltet, wenn alles stabil läuft.

## Auth Strategy (Cloudflare)

- **Primary:** `~/.config/.wrangler/config/default.toml` (Wrangler OAuth) für lokales Deploy
- **For CI/GitHub:** Cloudflare API Token in GitHub Secrets → `CLOUDFLARE_API_TOKEN`
- **Token-Scope:** `Edit Cloudflare Workers` (reicht für Deploy)

## Notes

- OpenNext baut automatisch R2-Bucket `shopsin-storefront-cache` beim ersten
  Deploy, falls `--new-remote` benutzt wird
- Drizzle + pg funktionieren auf Cloudflare (Workerd hat `nodejs_compat` Flag)
- `better-auth` nicht in Verwendung (wir nutzen Supabase SSR direkt)
- Stripe-Webhook-URL nach Deploy updaten: `https://shopsin.delqhi.com/api/stripe/webhook`
- CJ-Webhook-URLs aktualisieren (falls in CJ konfiguriert)
- Resend-Domain `delqhi.com` muss VOR Live verifiziert sein, sonst Mails fail
