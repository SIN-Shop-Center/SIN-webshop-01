# SIN TikTok Master-Pipeline — Briefing für den lokalen Agenten

Ziel: Vollautomatisierte $0-Pipeline von Produktrecherche bis TikTok-Verkauf,
durch Kombination von drei bestehenden SIN-Systemen plus der neuen TikTok Shop
Seller API Integration (siehe docs/TIKTOK_SHOP_API_INTEGRATION.md).

## Gesamtarchitektur

```

┌─────────────────────────────────────────────────────────────────────┐
│ STUFE 1: INTELLIGENCE (was listen?)                                 │
│ Repo: SIN-Hermes-Bundles/SIN-TikTok-Intelligence-Bundle             │
│ → Trend-Scraping (Apify/Scrapeless), liefert Produkt-Kandidaten     │
└──────────────────────────────┬──────────────────────────────────────┘
▼
┌─────────────────────────────────────────────────────────────────────┐
│ STUFE 2: SOURCING (CJ Dropshipping)                                 │
│ Repo: SIN-Shop-Center/SIN-webshop-01 (existiert)                    │
│ → scripts/cj/import-products.mjs: CJ-Suche nach Trend-Keywords,     │
│   Import nach Supabase (cj_product_id, cj_cost_price, Bilder)       │
└──────────────────────────────┬──────────────────────────────────────┘
▼
┌─────────────────────────────────────────────────────────────────────┐
│ STUFE 3: LISTING (TikTok Shop Seller API — NEU)                     │
│ Repo: SIN-Shop-Center/SIN-webshop-01                                │
│ → app/lib/tiktok/* + Crons tiktok-publish (3:30) / tiktok-sync (4:00)│
│ → Offizielle Partner API, kein Ban-Risiko, Inventar-Sync inklusive  │
└──────────────────────────────┬──────────────────────────────────────┘
▼
┌─────────────────────────────────────────────────────────────────────┐
│ STUFE 4: MARKETING (Video-Posting + Affiliate-Tagging)              │
│ Repo: SIN-Hermes-Bundles/SIN-Hermes-TikTok-Affiliate-Bundle         │
│ → Headfull-Browser-Agent postet Videos und taggt die in Stufe 3     │
│   gelisteten Shop-Produkte (das kann die Seller API NICHT)          │
└──────────────────────────────┬──────────────────────────────────────┘
▼
┌─────────────────────────────────────────────────────────────────────┐
│ STUFE 5: FULFILLMENT (Order → CJ)                                   │
│ Repo: SIN-Shop-Center/SIN-webshop-01                                │
│ → TikTok-Order via GET /order/202309/orders pollen →                │
│   bestehende createCjOrder (app/lib/cj/orders.ts) wiederverwenden   │
└─────────────────────────────────────────────────────────────────────┘

```plaintext

## Klare Aufgabentrennung (WICHTIG)

| Aufgabe | Werkzeug | Begründung |
|---|---|---|
| Produkt in TikTok Shop listen | Seller API (Stufe 3) | Offiziell, stabil, $0, kein Ban-Risiko |
| Inventar/Preis-Sync | Seller API Crons | Browser-Lösung kann das nicht zuverlässig |
| Video posten + Produkt taggen | Hermes Browser-Agent (Stufe 4) | Seller API bietet kein Video-Posting; Affiliate API in DE/EU nicht verfügbar |
| Trend-Recherche | Intelligence-Bundle (Stufe 1) | Research API nur für Forscher; Scraping ist die $0-Alternative |

REGEL: Der Browser-Agent darf NIEMALS Shop-Listings anlegen (fragil, Ban-Risiko).
Die Seller API darf NIEMALS durch Browser-Automation ersetzt werden, wo eine
offizielle API existiert.

## Schnittstellen zwischen den Stufen

### Stufe 1 → 2: Trend-Kandidaten
Das Intelligence-Bundle schreibt Kandidaten als JSON (z.B. trends-output.json):
  { "keyword": "...", "category": "...", "score": 0-100, "source_video_url": "..." }
Der lokale Agent füttert die Top-Keywords in scripts/cj/import-products.mjs
(CJ-Produktsuche). Manuelle Freigabe vor Import empfohlen (Qualität, GPSR).

### Stufe 2 → 3: Publish-Queue
Nach CJ-Import: products.tiktok_status = 'pending' setzen (queueForTikTok action
oder direkt per SQL). Der tiktok-publish Cron arbeitet die Queue ab (Batch 5/Lauf).

### Stufe 3 → 4: Tagging-Input
Nach Publish steht products.tiktok_product_id in Supabase. Der Hermes-Agent
liest daraus, welche Produkte er in Videos taggen soll:
  select id, title, tiktok_product_id from products
  where tiktok_status = 'published' order by tiktok_published_at desc;

### Stufe 3/4 → 5: Order-Fulfillment (Phase 2, noch zu bauen)
Neuer Cron /api/cron/tiktok-orders (alle 30 min, analog cj-fulfillment):
1. GET /order/202309/orders/search (Status: AWAITING_SHIPMENT)
2. Pro Order: seller_sku "SIN-{product.id}" → Supabase-Produkt → cj_variant_id
3. createCjOrder() aus app/lib/cj/orders.ts aufrufen (bestehende Logik!)
4. Tracking zurück an TikTok: POST /fulfillment/202309/packages/{id}/ship

## Kostenübersicht (Stand 2026)

| Posten | Kosten |
|---|---|
| TikTok Shop Partner API | $0 |
| TikTok Seller Account (DE) | $0 (Gewerbenachweis nötig) |
| TikTok Verkaufsprovision | ~5–9% pro Verkauf (unvermeidbar) |
| CJ Dropshipping API | $0 |
| Intelligence-Bundle (Apify Free Tier) | $0–5/Monat |
| Hermes Browser-Agent | $0 (läuft lokal) |
| Supabase Free Tier | $0 |
| Vercel | $0 Hobby (max 2 Crons!) oder $20/mo Pro |

ACHTUNG Vercel Hobby: Nur 2 Cron-Jobs erlaubt, je 1x täglich. Mit cj-sync,
cj-fulfillment, tiktok-publish, tiktok-sync (+ später tiktok-orders) sind es 5.
Optionen: (a) Vercel Pro, (b) Crons extern triggern (z.B. GitHub Actions
schedule → fetch mit CRON_SECRET — ebenfalls $0), (c) Crons zusammenlegen.
EMPFEHLUNG für $0: GitHub Actions als Cron-Trigger.

### GitHub Action als $0-Cron-Trigger (.github/workflows/crons.yml)

```yaml
name: scheduled-crons
on:
  schedule:
    - cron: "0 3 * * *"    # cj-sync
    - cron: "30 3 * * *"   # tiktok-publish
    - cron: "0 4 * * *"    # tiktok-sync
    - cron: "*/30 * * * *" # cj-fulfillment (+ später tiktok-orders)
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Call cron endpoints
        run: |
          for p in cj-sync tiktok-publish tiktok-sync cj-fulfillment; do
            curl -fsS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
              "https://DEINE-DOMAIN/api/cron/$p" || true
          done
```

(Verfeinerung: pro schedule nur den passenden Endpoint aufrufen — der Agent
kann das über github.event.schedule unterscheiden.)

## Risiken & Compliance

1. GPSR/EU: Pro Produkt "Responsible Person" im Seller Center hinterlegen (Pflicht).
2. Browser-Agent (Stufe 4): Nur für Video-Posting nutzen, menschliche Frequenz
   simulieren (max. 1–3 Posts/Tag), dediziertes Creator-Konto verwenden —
   NICHT das Seller-Hauptkonto riskieren.
3. Produkt-Review: TikTok prüft jedes Listing (< 24h). failed-Status in
   products.tiktok_last_error beachten.
4. Kategorie-Pflichtattribute (Beauty/Elektronik): ggf.
   /product/202309/categories/{id}/attributes abfragen.

## Deutschland/EU — Verfügbarkeit & Pflichten (Stand 2026)

### Verfügbarkeit

| Komponente | DE/EU | Anmerkung |
|---|---|---|
| TikTok Shop (Seller) | JA | Seit 2025 in DE live (auch FR, IT, ES, IE, UK) |
| Seller/Partner API (Stufe 3) | JA | Bei App-Registrierung im Partner Center Region EU wählen |
| CJ Dropshipping | JA | EU-Warehouses verfügbar — bevorzugen! (s.u.) |
| Affiliate API | NEIN | In DE/EU nicht offen → Stufe 4 (Hermes Browser) bleibt einzige Option |
| Research API | Irrelevant | Nur Forscher → Stufe 1 (Intelligence-Bundle) ersetzt das |
| Stripe / Supabase / Vercel / GitHub Actions | JA | Uneingeschränkt nutzbar |

### Regulatorische Pflichten (einmalig erledigen, sonst blockt TikTok)

1. **Seller-Registrierung DE:** Gewerbeanmeldung, USt-ID, Geschäftskonto,
   verifizierter Business Account. Ohne Gewerbe kein Seller-Account.
2. **GPSR (seit Dez 2024):** Jedes Produkt braucht eine EU-"Responsible Person"
   mit EU-Adresse. Bei CJ-Produkten aus China selbst stellen oder
   Dienstleister nutzen. TikTok blockt Listings ohne diese Angabe.
   → Im Seller Center pro Produkt hinterlegen, BEVOR der publish-Cron läuft.
3. **Verpackungsgesetz (LUCID):** Registrierung bei der Zentralen Stelle
   Verpackungsregister — Pflicht für DE-Versandhandel.
4. **Widerruf/Impressum/AGB:** Müssen auch im TikTok Shop hinterlegt sein
   (aus Webshop übernehmen).
5. **DSGVO:** Unkritisch, solange Stufe 1 nur öffentliche Trend-/Produktdaten
   scraped und keine personenbezogenen Daten speichert.

### WICHTIGSTE technische Konsequenz für den Agenten

TikTok DE verlangt schnellen Versand — CJ-China-Lieferzeiten (10–20 Tage)
führen zu Shop-Strafpunkten bis zur Sperrung.

REGEL: In `scripts/cj/import-products.mjs` nur Produkte mit EU/DE-Warehouse-
Bestand importieren (CJ-API: Warehouse-Filter auf EU setzen, z.B.
Lagercode "DE"/"EU" in der Variantenabfrage prüfen). Produkte ohne
EU-Bestand → `tiktok_status = 'skipped'` setzen, NICHT publishen.

### Checkliste vor dem ersten Live-Listing

- [ ] Gewerbe + USt-ID im Seller Center verifiziert
- [ ] LUCID-Registrierung abgeschlossen
- [ ] GPSR Responsible Person für alle Pilotprodukte hinterlegt
- [ ] Impressum/Widerruf/AGB im TikTok Shop hinterlegt
- [ ] CJ-Import auf EU-Warehouse gefiltert
- [ ] 1 Testprodukt published und Review bestanden (Status LIVE)

## Reihenfolge für den lokalen Agenten

1. [Manuell] Seller-Account + Partner-App anlegen (docs/TIKTOK_SHOP_API_INTEGRATION.md)
2. SQL-Migration + Env-Vars + OAuth-Autorisierung durchführen
3. Die 12 Dateien aus dem v0-Chat ins Repo übernehmen, Build prüfen
4. GitHub-Action-Cron-Workflow anlegen (s.o.), CRON_SECRET als Repo-Secret setzen
5. Test: 1 CJ-Produkt importieren → tiktok_status='pending' → publish-Cron
   manuell triggern → Listing im Seller Center verifizieren
6. Phase 2 bauen: /api/cron/tiktok-orders (Stufe 5, Spezifikation oben)
7. Stufe 1 + 4 anbinden (Intelligence-Output → CJ-Import; published-Produkte
   → Hermes-Tagging-Queue)
