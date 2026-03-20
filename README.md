# Simone Webshop: Cross-Category Trend-Commerce Engine

Stand: **26. Februar 2026**

## Cloudflare Production

- Runtime: **Cloudflare Workers**
- Canonical deployment record: `CLOUDFLARE.md`
- Live URL: `https://delqhi.com`
- Live storefront routes:
  - `/` home
  - `/products` catalog
  - `/products/:slug` product detail
  - `/cart` cart
  - `/checkout` checkout
  - `/order-success` success page
- Deploy command:

```bash
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
pnpm deploy:cloudflare
```

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

1. **Admin Control Tower API** fuer Automation, Trends, Growth, Channels, Attribution, Kill-Switch:
   - `apps/api/internal/http/router_admin.go`
2. **Supplier Webhook Inbound**:
   - `apps/api/internal/http/router_suppliers.go`
3. **Worker-Orchestrierung** fuer zentrale Jobs (`payment.succeeded`, `supplier.order.*`, `trend.candidate.launch.requested`, `channel.*`, Fulfillment):
   - `apps/api/internal/worker/processor.go`
4. **Autonomes Dropshipping-Datenmodell** (`product_suppliers`, `supplier_orders`, Supplier-Readiness-Felder):
   - `infra/supabase/migrations/20260225000800_supplier_autopilot.sql`
5. **Cross-Category Growth-Datenmodell** (`trend_*`, `channel_*`, `campaign_*`, `creative_*`, `affiliate_*`, `attribution_*`, `budget_*`):
   - `infra/supabase/migrations/20260225001000_growth_engine.sql`
6. **Admin-Endpunkte fuer Trend/Growth/Channels/Attribution** sind live im API-Surface.
7. **Neu in diesem Stand**: Revenue-Forecast ueber Admin API steuerbar:
   - `GET|PUT /api/v1/admin/revenue/forecast-policy`
   - `GET /api/v1/admin/revenue/forecast?scenario=conservative|base|scale`
   - Implementierung:
     - `apps/api/internal/admin/store_growth_revenue_forecast.go`
     - `apps/api/internal/admin/handler_growth.go`
     - `apps/api/internal/http/router_admin.go`
8. **Neu in diesem Stand**: Growth-Ops Surface erweitert:
   - `POST /api/v1/admin/trends/signals/ingest`
   - `GET /api/v1/admin/channels/{channel}/health`
   - `POST /api/v1/admin/channels/{channel}/events/ingest`
   - `GET /api/v1/admin/kpi/scorecard`
   - `GET|POST /api/v1/admin/creatives`
   - `GET|POST /api/v1/admin/creators`
   - `GET|POST /api/v1/admin/affiliate/offers`

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

Wenn eine Aussage in diesem README nicht ueber Code, Metrik oder Quelle belegbar ist, gilt sie nicht als Tatsache.
