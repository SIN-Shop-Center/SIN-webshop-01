# ShopSIN — SIN-webshop-01

E-Commerce-Storefront auf Next.js 16, deployed auf Cloudflare Workers (OpenNext),
mit self-hosted Supabase als Backend und Stripe für Zahlungen.

**Live:** https://shopsin.delqhi.com

## Architektur

```
Browser
  ├─ shopsin.delqhi.com  (Cloudflare Worker, Next.js via OpenNext)
  │    └─ supabase.delqhi.com  (Cloudflare Tunnel, HTTPS/443)
  │         └─ Kong API Gateway :8006  (VM, Docker, intern)
  │              ├─ GoTrue (Auth)
  │              ├─ PostgREST (REST API, Schema: shop)
  │              ├─ Realtime
  │              └─ Postgres :5432  (privat, NICHT öffentlich)
  └─ status.delqhi.com  (Uptime Kuma, self-hosted auf VM)
```

- **DB-Zugriff** ausschließlich über die Supabase-API (Kong) per HTTPS.
  Postgres ist nie direkt aus dem Internet erreichbar.
- **Row Level Security** ist auf allen public-Tabellen aktiv (default-deny).
  Shop-Daten (Produkte, Kategorien) haben explizite public-read-Policies.
- **Supabase Studio** ist hinter Cloudflare Access gesperrt.

## Supabase-Client-Pattern

| Client | Datei | Verwendung |
|---|---|---|
| Data-Client (`supabase-js`, `persistSession: false`) | `app/lib/supabase/data-client.ts` | Öffentliche Lesezugriffe (Produkte, Kategorien) — funktioniert in jedem Worker-Kontext |
| SSR-Client (`@supabase/ssr`) | `app/lib/supabase/server.ts` | Auth-gebundene Operationen (Login, Wishlist, Orders) — braucht Request-Kontext mit Cookies |

Warum: `@supabase/ssr` nutzt `cookies()` aus `next/headers`, was in
Cloudflare Workers außerhalb von Request-Kontexten fehlschlägt. Details in
[AGENTS.md](./AGENTS.md).

## Lokale Entwicklung

```bash
pnpm install
cp .env.example .env.local   # Werte eintragen (siehe unten)
pnpm dev
```

### Benötigte Env-Vars

Siehe [.env.example](./.env.example). Wichtig:
- `NEXT_PUBLIC_SUPABASE_URL=https://supabase.delqhi.com` — **ohne Port, https**
- `NEXT_PUBLIC_*`-Werte werden zur **Build-Zeit eingebrannt** — Änderungen
  erfordern einen neuen Build + Deploy.

## Deployment

Deployed via OpenNext auf Cloudflare Workers:

```bash
pnpm run deploy:cloudflare   # baut und deployed via wrangler
```

Secrets verwaltet über `wrangler secret` bzw. das Cloudflare-Dashboard.
**Nie** eine Worker-Route auf `supabase.delqhi.com/*` anlegen (blockiert den
Tunnel — siehe AGENTS.md, Regel 3).

## Infrastruktur (VM)

Supabase läuft self-hosted via Docker Compose auf der VM (92.5.60.87),
öffentlich gemacht über einen Cloudflare Tunnel (`cloudflared`). Ingress-Config:

```yaml
ingress:
  - hostname: status.delqhi.com
    service: http://localhost:3001   # Uptime Kuma
  - hostname: api.delqhi.com
    service: http://localhost:8080
  - hostname: delqhi.com
    service: http://localhost:3005
  - hostname: shopsin.delqhi.com
    service: http://localhost:3006
  - hostname: supabase.delqhi.com
    service: http://localhost:8006    # Kong, nur intern
  - service: http_status:404
```

Betriebs-Runbook, Smoke-Tests und Debugging-Tabelle: [AGENTS.md](./AGENTS.md).

## Sicherheit

- RLS default-deny auf allen Tabellen (letzter Audit: 2026-06-13, `public.openai_tokens` public-ALL-Policy entfernt)
- `SERVICE_ROLE_KEY` nur serverseitig, nie im Client-Bundle
- Secrets rotiert (keine Supabase-Docker-Defaults)
- Postgres-Port 5432 nicht öffentlich
- Studio hinter Cloudflare Access
- Cloudflare WAF + Rate Limiting auf `/auth/v1`
