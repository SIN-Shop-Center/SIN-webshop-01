# TikTok Shop API Integration — Implementierungs-Briefing

## WICHTIG: Richtige API verwenden

- ❌ FALSCH: developers.tiktok.com Research API (read-only, nur für Forscher)
- ✅ RICHTIG: TikTok Shop Open Platform — https://partner.tiktokshop.com
  - API-Basis: https://open-api.tiktokglobalshops.com
  - Auth-Basis: https://auth.tiktok-shops.com
  - API-Version: 202309 (Product API)

## Setup-Schritte (manuell, einmalig)

1. TikTok Shop Seller Account (DE) auf seller.tiktokshop.com anlegen + verifizieren
2. Partner-Account auf partner.tiktokshop.com → App anlegen (Typ: Seller-App, Region EU)
   - Scopes: Product Management, Logistics, (später: Order Management)
   - Redirect-URL: https://DEINE-DOMAIN/api/tiktok/oauth/callback
3. TIKTOK_APP_KEY + TIKTOK_APP_SECRET als Env-Vars setzen
4. SQL-Migration ausführen: infra/supabase/migrations/20260611120000_tiktok_shop.sql
5. Autorisierungs-Link aus dem Partner Center öffnen, mit Seller-Account autorisieren
   → Callback speichert Tokens automatisch in Supabase (tiktok_auth)

## Pipeline

CJ → Supabase (existiert) → TikTok Shop (neu):

1. scripts/cj/import-products.mjs importiert CJ-Produkte nach Supabase (existiert)
2. Admin markiert Produkte: tiktok_status = 'pending' (queueForTikTok action)
   oder klickt "Zu TikTok" für Sofort-Publish
3. Cron /api/cron/tiktok-publish (täglich 3:30) published pending-Produkte:
   Bilder hochladen → Kategorie empfehlen → Warehouse → POST /product/202309/products
4. Cron /api/cron/tiktok-sync (täglich 4:00) synct Bestand (nach cj-sync um 3:00)
5. Preis: cj_cost_price * TIKTOK_PRICE_MULTIPLIER (default 2.8 — TikTok-Gebühren
   von 5-15% einkalkuliert)

## API-Mechanik (für Debugging)

- Signatur: hex(HMAC-SHA256(app_secret, app_secret + path + sortierteParams + body + app_secret))
  - sign + access_token NICHT mitsignieren; bei multipart Body NICHT signieren
- Header: x-tts-access-token
- Query immer: app_key, timestamp (Sekunden), sign, meist shop_cipher
- Access-Token: 7 Tage gültig → Refresh via /api/v2/token/refresh (in client.ts automatisch)
- Antwortformat: { code: 0 = ok, message, data }

## Bekannte Stolpersteine

- Bilder: Unsplash-URLs aus data.ts funktionieren NICHT direkt — TikTok braucht
  eigene Upload-URIs (uploadProductImage erledigt das). Für echte Listings
  CJ-Produktbilder verwenden (image_url aus dem CJ-Import).
- Kategorie-Pflichtattribute: Manche Kategorien verlangen zusätzliche Attribute
  (z.B. Zertifizierungen bei Beauty/Elektronik). Fehlermeldung der API beachten
  und ggf. /product/202309/categories/{id}/attributes abfragen.
- Produkt-Review: TikTok prüft jedes Listing (Status PENDING_REVIEW → LIVE),
  dauert i.d.R. < 24h.
- GPSR/EU-Compliance: Seit 2025 verlangt TikTok EU "Responsible Person"-Angaben
  pro Produkt — im Seller Center hinterlegen.
- Order-Fulfillment (Phase 2): TikTok-Orders via GET /order/202309/orders pollen
  oder Webhooks, dann an createCjOrder (app/lib/cj/orders.ts) weiterleiten —
  gleiche Logik wie der Stripe-Flow.
