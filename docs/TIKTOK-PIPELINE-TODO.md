# TikTok Master-Pipeline — Status & offene Stufen

Diese Liste ergänzt `docs/SIN_TIKTOK_MASTER_PIPELINE.md`. Sie dokumentiert,
welche der 5 Stufen als Code IM REPO vorhanden sind und welche fehlen.

## 5-Stufen-Überblick

| Stufe | Name | Repo | Status |
|---|---|---|---|
| 1 | Intelligence (Trend-Scraping) | `SIN-Hermes-Bundles/SIN-TikTok-Intelligence-Bundle` | ❌ FEHLT (Repo existiert nicht) |
| 2 | Sourcing (CJ Import) | `SIN-webshop-01/scripts/cj/import-products.mjs` | ✅ vorhanden |
| 3 | Listing (TikTok Seller API) | `app/lib/tiktok/*` + `app/api/cron/tiktok-publish` | ✅ vorhanden |
| 4 | Marketing (Video-Posting) | `SIN-Hermes-Bundles/SIN-Hermes-TikTok-Affiliate-Bundle` | ❌ FEHLT (Repo existiert nicht) |
| 5 | Fulfillment (Order → CJ) | `app/api/cron/tiktok-orders` + `app/lib/tiktok/orders.ts` | ✅ vorhanden |

## Was fehlt (Code, nicht nur Docs)

### Stufe 1 — Intelligence Bundle
- Trend-Scraping via Apify/Scrapeless fehlt komplett.
- Ausgabe-Schema (`trends-output.json`) in `SIN_TIKTOK_MASTER_PIPELINE.md`
  definiert, aber kein Producer vorhanden.
- Manuelle Freigabe vor CJ-Import ist als Prozess beschrieben, nicht automatisiert.

### Stufe 4 — Hermes TikTok Affiliate / Video-Posting
- Headfull-Browser-Agent zum Video-Posten + Produkt-Taggen fehlt.
- `workers/n8n/simone/workflows/12-tiktok-browser-metadata-sync.json` existiert
  als Flow-Skizze, aber kein lauffähiger Browser-Agent im Repo.
- A2A-Registry (`config/sin-a2a/registry.json`) kennt `sin-tiktok` Agent,
  dessen Code ist nicht Teil dieses Repos.

## Was vorhanden ist (Code im Repo)

### Stufe 2 — CJ Sourcing
- `scripts/cj/import-products.mjs` — Produktsuche + EU-Warehouse-Filter
- `scripts/cj/backfill-product-data.mjs`, `translate-products.mjs`, `trigger-reviews.mjs`
- `app/lib/cj/client.ts`, `orders.ts`, `freight.ts`

### Stufe 3 — TikTok Listing (Seller API)
- `app/lib/tiktok/client.ts`, `products.ts`, `publish.ts`, `orders.ts`,
  `returns.ts`, `alerts.ts`
- `infra/supabase/migrations/20260611120000_tiktok_shop.sql` (Auth + Publish-State)
- `app/api/cron/tiktok-publish/route.ts` (Batch 5/Lauf, 3:30 täglich)
- `app/api/cron/tiktok-sync/route.ts` (Preis/Bestand, 4:00 täglich)
- `app/admin/tiktok/page.tsx` (Admin-Übersicht)

### Stufe 5 — Fulfillment
- `app/api/cron/tiktok-orders/route.ts` (pollt AWAITING_SHIPMENT, forwarded an CJ,
  meldet Tracking zurück)
- `app/lib/tiktok/orders.ts` (getAwaitingShipmentOrders, shipTikTokOrder)
- `infra/supabase/migrations/20260611130000_tiktok_orders.sql` (Order-Tracking)

## Offene Blocker (nicht Code)
1. TikTok Seller Account muss von Jeremy im Seller Center angelegt werden.
2. GPSR Responsible Person + Manufacturer im Seller Center Qualification Center
   hinterlegen (siehe SQL-Migration `20260714000000_gpsr_responsible_person.sql`).
3. LUCID: entfällt für Dropshipping (CJ versendet, nicht der Shop).
4. CJ Wallet aufladen ($30) — blockt Fulfillment.

## Nächste Schritte (Priorität)
- [ ] Stufe 1 bauen ODER Trend-Keywords manuell in `import-products.mjs` füttern
- [ ] Stufe 4 bauen ODER Videos manuell posten (bis Agent existiert)
- [ ] TikTok Seller Account + OAuth in `tiktok_auth` Tabelle schreiben
- [ ] Erstes Produkt publishen + Review bestehen (Status LIVE)
