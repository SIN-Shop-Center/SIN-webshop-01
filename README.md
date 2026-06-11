# Simone Webshop

Stand: **11. Juni 2026** — Next.js 16 Stack (v1.0.0)

> Vorher: Vite-SPA + Go-API + Cloudflare Worker (Stand 26. Mai 2026).
> Migration dokumentiert in [`docs/PLAN-VERKAUFSFAEHIG.md`](docs/PLAN-VERKAUFSFAEHIG.md) — alle 6 Schritte abgeschlossen.

## Stack

- **Framework**: Next.js 16 (App Router, Server Actions, Turbopack)
- **Datenbank**: Supabase (self-hosted auf OCI VM 92.5.60.87, Port 5433, Schema `shop`)
- **Auth**: Supabase SSR (Email/Password, httpOnly-Cookie-Sessions)
- **Payments**: Stripe Hosted Checkout (gehostet, keine PCI-Last im Shop)
- **Email**: Resend (Bestellbestätigungen)
- **Storage / Hosting**: geplant Vercel

## Routes

| Pfad | Inhalt |
|------|--------|
| `/` | Startseite mit Featured Products (Supabase-backed) |
| `/produkt/[id]` | Produktdetailseite |
| `/warenkorb` | Warenkorb (Gast-fähig via httpOnly-Cookie) |
| `/wunschliste` | Wunschliste (Login erforderlich, RLS-scoped) |
| `/kasse/erfolg` | Stripe Success Page (verifiziert Session, leert Cart) |
| `/impressum`, `/datenschutz`, `/agb`, `/widerrufsrecht`, `/versand` | Rechtstexte (shared via `config/storefront-legal.ts`) |
| `/auth/login`, `/auth/sign-up`, `/auth/sign-up-success`, `/auth/error`, `/auth/callback` | Auth-Flow |
| `/api/stripe/webhook` | Stripe Webhook → Order in DB + Resend Mail |

## Entwicklung

```bash
pnpm install
pnpm dev          # next dev auf :3000
pnpm build        # next build
pnpm test         # Unit-Tests (governance-check braucht nlm login)
```

## Datenbank-Setup (einmalig)

```bash
psql "$DATABASE_URL" -f scripts/supabase/setup-rls.sql
psql "$DATABASE_URL" -f scripts/supabase/setup-cart.sql
psql "$DATABASE_URL" -f scripts/supabase/setup-orders.sql
```

Seed (optional, legt 8 Demo-Produkte an):
```bash
pnpm seed:dev    # ohne Supabase-Verbindung (Simulation)
# oder
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… pnpm seed
```

## Env-Variablen

Siehe [`.env.example`](.env.example) — benötigt: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

## Architektur

- **Warenkorb**: Guest-fähig via httpOnly-Cookie + RLS-deny-all `cart_items` (Service-Role-Client in Server Actions)
- **Wishlist**: Login erforderlich, RLS-scoped per `auth.uid()`
- **Preise**: IMMER aus der DB im Server Action (`startCheckout`), niemals vom Client
- **Bestellungen**: Webhook-insert (idempotent via `stripe_session_id`)
- **Auth-Proxy**: `proxy.ts` (Next.js 16 Middleware-Replacement) refresht Session-Cookies

## Wahrheitsprinzip (keine Fake-Claims)

## Docs SSOT Sync

- Canonical project SSOT Google Doc: `simone-webshop-01 - SSOT-v2`
- Canonical NotebookLM source id: `34567ee6-d1c6-4a9f-96c6-1d573cf3da9e`
- Sync local markdown docs into the SSOT child-tab mirror with:

```bash
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
pnpm run sync:gdoc:project-ssot
```

- After a docs sync, refresh the project NotebookLM source with:

```bash
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
nlm source sync "8a11c91e-7ca0-4b0a-9fc0-78a5d6cd0f54" --source-ids "34567ee6-d1c6-4a9f-96c6-1d573cf3da9e" --confirm
```

## Wahrheitsprinzip (keine Fake-Claims)

Dieses Repository behauptet **nicht** blind "weltbester Shop".

Der Shop wird nur dann als "weltbeste Ausfuehrung" bewertet, wenn die definierten KPI-Gates (Reliability, Profitabilitaet, Reichweite, Autonomie) messbar erreicht sind.

## Ist-Status in einem Satz

**Technisch ist die Plattform bereits sehr weit (Core Commerce + Supplier Autopilot + Trend/Growth/Channel Control Surface), aber "weltbest" ist aktuell noch ein Zielzustand, kein bewiesener Endzustand.**

## Was heute nachweisbar implementiert ist

1. **Production E-Commerce Flow**: Stripe Checkout (Card+SEPA+Klarna) → CJ Dropshipping Auto-Fulfill (3-step: create→confirm→payBalance) → Shipment tracking emails
2. **Legal Compliance**: Impressum, AGB, Datenschutz, Widerrufsrecht, Versand — all live on delqhi.com
3. **Email System**: Resend (primary) + Gmail API (fallback), German order confirmation/invoice/shipment emails
4. **Admin Control Tower API** fuer Automation, Trends, Growth, Channels, Attribution, Kill-Switch:
   - `apps/api/internal/http/router_admin.go`
5. **Supplier Webhook Inbound** (CJ order/logistic events parsed and routed):
   - `apps/api/internal/suppliers/handler.go`
6. **Worker-Orchestrierung** fuer zentrale Jobs (`payment.succeeded`, `supplier.order.*`, `trend.candidate.launch.requested`, `channel.*`, Fulfillment):
   - `apps/api/internal/worker/processor.go`
7. **Stripe Instant Payout Trigger**: Auto-triggers on `payment.succeeded` (goroutine), needs Stripe Dashboard activation
8. **Autonomes Dropshipping-Datenmodell** (`product_suppliers`, `supplier_orders`, Supplier-Readiness-Felder):
   - `infra/supabase/migrations/20260225000800_supplier_autopilot.sql`
9. **Cross-Category Growth-Datenmodell** (`trend_*`, `channel_*`, `campaign_*`, `creative_*`, `affiliate_*`, `attribution_*`, `budget_*`):
   - `infra/supabase/migrations/20260225001000_growth_engine.sql`
10. **Admin-Endpunkte** fuer Trend/Growth/Channels/Attribution sind live im API-Surface.
11. **Revenue-Forecast** ueber Admin API steuerbar:
    - `GET|PUT /api/v1/admin/revenue/forecast-policy`
    - `GET /api/v1/admin/revenue/forecast?scenario=conservative|base|scale`
12. **Growth-Ops Surface** erweitert:
    - `POST /api/v1/admin/trends/signals/ingest`
    - `GET /api/v1/admin/channels/{channel}/health`
    - `POST /api/v1/admin/channels/{channel}/events/ingest`
    - `GET /api/v1/admin/kpi/scorecard`
    - `GET|POST /api/v1/admin/creatives`
    - `GET|POST /api/v1/admin/creators`
    - `GET|POST /api/v1/admin/affiliate/offers`

## Was noch manuell erledigt werden muss

1. **CJ Balance aufladen** ($20-50 via PayPal/Kreditkarte im CJ Dashboard) — aktuell $0, Orders werden erstellt+bestätigt aber nicht bezahlt
2. **Stripe Bank Account** hinzufügen (Dashboard → Settings → Payouts) — aktuell kein Bankkonto konfiguriert
3. **Stripe Instant Payouts** aktivieren (Dashboard → Settings → Payouts) — aktuell disabled, +1.5% Gebühr aber Auszahlung in Minuten
4. **Resend Domain Verification** — delqhi.com bei Resend hinzufügen + SPF/DKIM/DMARC DNS Records via Cloudflare

## Was dieser Shop bietet (ohne Kategorie-Limit)

1. **Cross-Category Trend-Commerce**: keine feste Produktkategorie, sondern Policy-gesteuerte Freigabe (`allow|review_required|deny`).
2. **Autonomer Checkout->Payment->Supplier-Fulfillment Flow** mit Idempotenz-Guards.
3. **Omnichannel-Wachstum** ueber TikTok, Meta, YouTube/Google, Pinterest, Snapchat (API/OAuth-first).
4. **Admin-zentrierte Steuerung** fuer Sortimente, Policies, Budgets, Launches, Kill-Switches.
5. **Event-/Queue-basierte SoR-Architektur**: Supabase/Postgres bleibt einziges Source-of-Record.

## Weltbeste-Reichweite: Faktenlage (extern, kein Marketing-Sprech)

Die folgenden Markt-/Plattformzahlen sind externe Referenzen und keine internen Erfolgszusagen:

1. US E-Commerce waechst weiter: 2024 ca. **$1.19T**, **+8.1% YoY**, Anteil am Gesamt-Retail ca. **16.1%** ([U.S. Census](https://www.census.gov/retail/ecommerce.html)).
2. Meta meldet fuer Q4/FY2025 etwa **3.43B DAP** und **3.98B MAP** ([Meta IR, 29.01.2026](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Fourth-Quarter-and-Full-Year-2025-Results/default.aspx)).
3. Pinterest meldete Ende 2025 **>600M MAUs** ([Pinterest Newsroom, 10.12.2025](https://newsroom.pinterest.com/pinterest-announces-agreement-to-acquire-the-booking-holdings-owned-leading-global-travel-planning-platform-the-fork/)).
4. Snap meldete fuer Q4 2025 ca. **460M DAUs** ([Snap IR, 04.02.2026](https://investor.snap.com/news/news-details/2026/Snap-Inc.-Announces-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx)).
5. TikTok Shop meldete starke BFCM- und US-Wachstumszahlen (u. a. deutlicher Shopper-/Seller-Anstieg) ([TikTok Newsroom](https://newsroom.tiktok.com/en-us/tiktok-shop-hits-new-sales-record-this-black-friday-cyber-monday), [TikTok Newsroom US-Year-1](https://newsroom.tiktok.com/en-us/celebrating-1-year-of-tiktok-shop-in-the-u-s)).
6. Globaler Checkout-Benchmark bleibt kritisch: durchschnittliche Cart-Abandonment-Rate ~**70.19%** ([Baymard Institute](https://baymard.com/lists/cart-abandonment-rate)).
7. Skalierungs-Benchmarks grosser Commerce-Plattformen bleiben hoch:
   - Amazon FY2025 Net Sales **$638.0B**, +11% YoY ([Amazon](https://www.aboutamazon.com/news/company-news/amazon-earnings-q4-2025))
   - Shopify FY2025 Revenue **$12.0B**, +26% YoY ([Shopify](https://news.shopify.com/shopify-announces-fourth-quarter-and-full-year-2025-financial-results))

## Umsatzprognose (echtes Modell, keine Garantie)

### Formel

1. `paid_clicks = ad_spend / cpc`
2. `organic_sessions = paid_clicks * organic_lift_pct`
3. `total_sessions = paid_clicks + organic_sessions`
4. `orders = total_sessions * cvr`
5. `gmv = orders * aov`
6. `mer = gmv / ad_spend`

### Default-Szenarien (konfigurierbar ueber Admin API)

1. **Conservative**: `ad_spend=50,000`, `cpc=0.90`, `organic_lift=20%`, `cvr=2.0%`, `aov=65`
   - Modellwert: ca. `GMV=86,666.67`, `MER=1.73`
2. **Base**: `ad_spend=100,000`, `cpc=0.70`, `organic_lift=35%`, `cvr=2.4%`, `aov=72`
   - Modellwert: ca. `GMV=333,257.14`, `MER=3.33`
3. **Scale**: `ad_spend=150,000`, `cpc=0.55`, `organic_lift=60%`, `cvr=2.8%`, `aov=78`
   - Modellwert: ca. `GMV=953,018.18`, `MER=6.35`

**Wichtig:** Das sind Szenarien aus konfigurierbaren Inputs, keine Umsatzzusage.

## API-Oberflaeche (Growth/Trend/Autonomy)

1. `GET|PUT /api/v1/admin/trends/policy`
2. `GET /api/v1/admin/trends/candidates`
3. `POST /api/v1/admin/trends/{id}/approve`
4. `POST /api/v1/admin/trends/{id}/launch`
5. `GET /api/v1/admin/trends/performance`
6. `GET|PUT /api/v1/admin/growth/budget-policy`
7. `GET|PUT /api/v1/admin/revenue/forecast-policy`
8. `GET /api/v1/admin/revenue/forecast`
9. `GET /api/v1/admin/channels`
10. `GET /api/v1/admin/channels/{channel}/health`
11. `POST /api/v1/admin/channels/{channel}/events/ingest`
12. `POST /api/v1/admin/channels/{channel}/connect/start`
13. `POST /api/v1/admin/channels/{channel}/connect/complete`
14. `POST /api/v1/admin/channels/{channel}/catalog/sync`
15. `POST /api/v1/admin/channels/{channel}/campaigns/publish`
16. `GET /api/v1/admin/attribution/summary`
17. `GET /api/v1/admin/kpi/scorecard`
18. `GET|POST /api/v1/admin/creatives`
19. `GET|POST /api/v1/admin/creators`
20. `GET|POST /api/v1/admin/affiliate/offers`
21. `POST /api/v1/admin/trends/signals/ingest`
22. `POST /api/v1/admin/kill-switch/{domain}` (`checkout|channel_sync|campaign_publish|creator_payouts`)
23. `POST /api/v1/admin/orders/{id}/supplier-dispatch`
24. `GET /api/v1/admin/orders/{id}/supplier-orders`
25. `POST /api/v1/suppliers/webhooks/{supplier}`

## KPI-Scorecard fuer den "Weltbest"-Nachweis

Der Shop darf intern nur dann als "weltbeste Ausfuehrung" gelten, wenn mindestens diese Gates stabil erreicht sind:

1. `payment -> supplier_order_placed >= 98.5%`
2. `payment -> order_confirmation_email_sent >= 99%`
3. `critical DLQ = 0` (rolling 24h)
4. `channel event match rate >= 90%`
5. `admin action -> channel effect latency p95 < 2 min`
6. keine doppelten Zahlungen/Rechnungen/Supplier-Dispatches in Replay-Tests

## Lokale Entwicklung

### Web

```bash
cd apps/web
npm install
npm run dev
```

### API

```bash
cd apps/api
go mod tidy
go run ./cmd/api
```

### Worker

```bash
cd apps/api
go run ./cmd/worker
```

## Qualitaets-Gates

```bash
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
pnpm run ci
# optional full API package sweep (includes internal/admin)
INCLUDE_ADMIN_TESTS=1 pnpm test:api
```

## Go-Live Smoke (gegen laufende Instanz)

```bash
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
pnpm check:env:live -- --with-smoke
API_BASE_URL=https://<api-host> \
ADMIN_BEARER_TOKEN=<admin_jwt> \
pnpm smoke:go-live
```

## One-Command Go-Live (Essential)

```bash
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
pnpm go-live:today
```

## Verifikation Revenue-Forecast (Admin)

```bash
# Policy lesen
curl -H "Authorization: Bearer <admin_jwt>" \
  http://localhost:8080/api/v1/admin/revenue/forecast-policy

# Scenario forecast lesen
curl -H "Authorization: Bearer <admin_jwt>" \
  "http://localhost:8080/api/v1/admin/revenue/forecast?scenario=base"

# Policy aendern
curl -X PUT -H "Authorization: Bearer <admin_jwt>" -H "Content-Type: application/json" \
  -d '{"base":{"cpc":0.65,"cvr":2.6,"aov":75}}' \
  http://localhost:8080/api/v1/admin/revenue/forecast-policy
```

## Was noch offen ist, um das Ziel zu erreichen

1. Endgueltige "weltbeste" Einstufung braucht produktive KPI-Historie, nicht nur Code-Surface.
2. Channel-Connectoren muessen in jedem Zielkonto (DACH + US) mit echten OAuth/API-Accounts produktionsnah durchgetestet werden.
3. Attribution-Match-Rate und Profit-Gates muessen ueber reales Traffic-Fenster stabil validiert werden.
4. Last-/Failure-Drills (Supplier down, Gmail 429, Channel 5xx, Stripe replay) muessen im Rollout-Fenster bestanden werden.

Detaillierter Plan: `docs/world-best-go-live-plan.md`
Sofort-Checkliste (heute live): `docs/go-live-today-checklist.md`

---

## Neue-Mac Onboarding (100% Setup aus Repos + Infisical)

### 1. Repos klonen

```bash
git clone git@github.com:SIN-Shop-Center/SIN-webshop-01.git
git clone git@github.com:SIN-Shop-Center/SIN-CJDropshipping-Bundle.git
```

### 2. Infisical Secrets pullen (ersetzt SOPS/age-key)

Alle Secrets und ENVs liegen in Infisical (EU Cloud):

| Projekt | Pfad | Inhalt |
|---------|------|--------|
| SIN-Webshop-01 | `/SIN-Webshop-01` | Stripe keys, DB credentials, CJ API key, Cloudflare keys, n8n encryption key, Supabase JWT, etc. |

```bash
brew install infisical
infisical login --domain https://eu.infisical.com
# Browser-Login mit GitHub/Email

# Secrets in .env exportieren
cd SIN-webshop-01
infisical export --domain https://eu.infisical.com \
  --project-id fa7758b4-f84c-4297-966e-710056d531ef \
  --path /SIN-Webshop-01 \
  --env dev \
  -f .env
```

Infisical Org: `https://eu.infisical.com/organizations/a83c52af-795b-437f-8f17-f1b68d3ab65c`
Infisical Project: `secret-management` / `fa7758b4-f84c-4297-966e-710056d531ef`

### 3. SSH Key fuer VM

Der SSH Key fuer die OCI VM (`92.5.60.87`) muss manuell kopiert werden:

```bash
# Auf dem alten Mac:
scp ~/.ssh/id_ed25519 neuer-mac:~/.ssh/id_ed25519

# Verifizieren:
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 "echo OK"
```

### 4. CJ API Token (auto-generiert)

```bash
cd SIN-CJDropshipping-Bundle
python3 cli/cj-cli.py auth get-token
# Erstellt automatisch ~/.cj-tokens.json
```

### 5. Node/Go Dependencies

```bash
cd SIN-webshop-01
pnpm install          # Frontend + Worker deps
cd apps/api
go mod tidy           # Go API deps
```

### 6. MCP Server (optional, fuer opencode)

```bash
pip install --system --break-system-packages mcp
# Dann in opencode config:
# "mcpServers": { "cj-dropshipping": { "command": "python3", "args": ["SIN-CJDropshipping-Bundle/mcp-server/cj-mcp-server.py"] } }
```

### Was NICHT aus den Repos kommt (manuell)

| Item | Loesung |
|------|---------|
| SSH Key `~/.ssh/id_ed25519` | Manuell kopieren |
| Infisical Login | `infisical login` (Browser-Auth) |
| CJ Token `~/.cj-tokens.json` | Auto-generiert bei erstem API Call |

### Was NUR auf der VM lebt (brauchst du nicht lokal)

| Item | Ort |
|------|-----|
| Docker Container (supabase-db, simone-api, simone-worker) | VM `92.5.60.87` |
| Cloudflare Tunnel Credentials | `/home/ubuntu/.cloudflared/` auf VM |
| PostgreSQL Daten (49 Produkte, 82 Tabellen) | `shop` Schema auf VM |
| Go API Env File | `/home/ubuntu/simone-api.env` auf VM |
| n8n Workflows + Data | Port 5678 auf VM |
| Supabase Studio | Port 3004 auf VM |

### Verwandte Repos in SIN-Shop-Center

| Repo | Zweck |
|------|-------|
| [SIN-webshop-01](https://github.com/SIN-Shop-Center/SIN-webshop-01) | Haupt-Webshop (Go API, Next.js Frontend, Cloudflare Worker, DB Migrations) |
| [SIN-CJDropshipping-Bundle](https://github.com/SIN-Shop-Center/SIN-CJDropshipping-Bundle) | CJ API CLI (73 Endpunkte), MCP Server (75 Tools), Docs, Scripts |
| [SIN-Supabase-OCI-Bundle](https://github.com/SIN-Shop-Center/SIN-Supabase-OCI-Bundle) | Supabase Docker Stack fuer OCI VM, DB Provisionierung fuer alle Shops |

---

Wenn eine Aussage in diesem README nicht ueber Code, Metrik oder Quelle belegbar ist, gilt sie nicht als Tatsache.
