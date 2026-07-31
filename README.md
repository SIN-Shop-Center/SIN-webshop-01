# ShopSIN — SIN-webshop-01

E-Commerce-Storefront auf Next.js 16, deployed auf Cloudflare Workers (OpenNext),
mit self-hosted Supabase als Backend und Stripe für Zahlungen.

**Produktionsziel:** https://shopsin.delqhi.com
**Aktueller Audit:** [docs/CEO_AUDIT_2026-07-23.md](./docs/CEO_AUDIT_2026-07-23.md)

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

## Repository-Struktur

Der Code ist in sechs sichtbare Hauptbereiche gegliedert: `src`, `packages`,
`platform`, `tooling`, `docs` und `public`. `src/app` enthält ausschließlich die
Next.js-Routingstruktur; wiederverwendbare Komponenten, Server Actions und
Domänenlogik liegen daneben. Die vollständigen Grenzen und die CI-Regel stehen
in [docs/REPOSITORY_STRUCTURE.md](./docs/REPOSITORY_STRUCTURE.md).

```bash
pnpm check:structure
```

## Supabase-Client-Pattern

| Client | Datei | Verwendung |
|---|---|---|
| Data-Client (`supabase-js`, `persistSession: false`) | `src/lib/supabase/data-client.ts` | Öffentliche Lesezugriffe (Produkte, Kategorien) — funktioniert in jedem Worker-Kontext |
| SSR-Client (`@supabase/ssr`) | `src/lib/supabase/server.ts` | Auth-gebundene Operationen (Login, Wishlist, Orders) — braucht Request-Kontext mit Cookies |

Die kanonischen TypeScript-Typen liegen in `src/types/database.generated.ts` und
werden ausschließlich aus dem lokal mit allen versionierten Migrationen
aufgebauten Supabase-Stack erzeugt:

```bash
pnpm db:local:start
pnpm db:types:generate
pnpm db:types:check
pnpm db:local:stop
```

`db:types:check` vergleicht den eingebetteten Schema-Fingerprint mit allen
Migrationen und ist Teil von `pnpm run ci`. Eine Zielinstanz bleibt zusätzlich vor
Migrationen mit `pnpm db:migrate:status` zu auditieren.

Warum: `@supabase/ssr` nutzt `cookies()` aus `next/headers`, was in
Cloudflare Workers außerhalb von Request-Kontexten fehlschlägt. Details in
[AGENTS.md](./AGENTS.md).

## Lokale Entwicklung

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # Werte eintragen (siehe unten)
pnpm dev
```

Das Admin-Dashboard kann ohne Supabase, Anbieterzugänge oder Schreibzugriffe als
lokale Vorschau gestartet werden:

```bash
pnpm dev:admin
```

Der Preview-Modus verwendet deterministische Beispieldaten, deaktiviert alle
Queue-Schreibaktionen und wird in Produktion sowie CI technisch ignoriert.

### Benötigte Env-Vars

Siehe [.env.example](./.env.example). Wichtig:
- `NEXT_PUBLIC_SUPABASE_URL=https://supabase.delqhi.com` — **ohne Port, https**
- `NEXT_PUBLIC_*`-Werte werden zur **Build-Zeit eingebrannt** — Änderungen
  erfordern einen neuen Build + Deploy.

## Deployment

Deployed via OpenNext auf Cloudflare Workers:

```bash
pnpm go-live:today           # vollstaendiges Release-Gate
pnpm run deploy:cloudflare   # erst danach bauen und via Wrangler deployen
```

Secrets verwaltet über `wrangler secret` bzw. das Cloudflare-Dashboard.
**Nie** eine Worker-Route auf `supabase.delqhi.com/*` anlegen (blockiert den
Tunnel — siehe AGENTS.md, Regel 3).

## Infrastruktur (VM)

Supabase läuft self-hosted via Docker Compose auf der Produktions-VM,
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

Betriebs-Runbook und Release-Reihenfolge: [EXECUTE.md](./EXECUTE.md).
Agentenregeln und Infrastrukturhinweise: [AGENTS.md](./AGENTS.md).

## Sicherheit

- RLS default-deny ist die Zielvorgabe; der aktuelle Stand muss durch Migration-/Policy-Audit belegt werden
- `SERVICE_ROLE_KEY` nur serverseitig, nie im Client-Bundle
- Secrets rotiert (keine Supabase-Docker-Defaults)
- Postgres-Port 5432 nicht öffentlich
- Studio hinter Cloudflare Access
- Cloudflare WAF + Rate Limiting auf `/auth/v1`
