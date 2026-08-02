# ShopSIN Commerce Control Plane

Stand: 22.07.2026

## Zielbild

ShopSIN besitzt jetzt einen durchgängigen, auditierbaren Ablauf:

1. reale Trendsignale einsammeln,
2. passende CJ-Produkte mit verifiziertem EU-Bestand bewerten,
3. unvollständige Produktdaten mit belegbaren Webquellen vervollständigen,
4. Produktbilder und UGC-Videoaufträge an OpenMontage übergeben,
5. jeden kosten- oder qualitätsrelevanten Creative-Schritt im Admin freigeben,
6. nur vollständig freigegebene Produkte im Shop aktivieren,
7. TikTok-Shop-Listings standardmäßig als Seller-Draft anlegen,
8. freigegebene Videos optional als TikTok-Inbox-Draft hochladen,
9. Social-Posts und Outreach ausschließlich als prüfbare Entwürfe vorbereiten.

Das System automatisiert Arbeit, nicht Verantwortung. Produkte, Claims, GPSR-Daten, Creatives und direkte Kommunikation besitzen harte Gates.

## Relevante Verzeichnisse

- Webshop und Control Plane: `/Users/jeremy/dev/SIN-webshop-01`
- Lokale Video-Pipeline: `/Users/jeremy/dev/OpenMontage`
- Admin UI: `src/app/admin`
- Server Actions: `src/lib/actions`
- Pipeline Worker: `tooling/scripts/pipeline`
- Datenbankmigration: `platform/infra/supabase/migrations/20260722000000_commerce_control_plane.sql`
- macOS-Betrieb: `platform/deploy/launchd`
- Codex/OpenMontage-Bridge: `platform/deploy/openmontage/run-product-ugc-codex.sh`

## Architektur

### Control Plane

Das Admin-Dashboard liest Shop-Daten aus dem Supabase-Schema `shop` und Queue-/Agentendaten aus `public`. Die Trennung ist in `src/lib/supabase/admin.ts` explizit.

Die zentrale Queue heißt `commerce-autopilot`. Erlaubte Jobs:

- `pipeline.daily`
- `trend.scan`
- `cj.rank`
- `product.enrich`
- `creative.generate`
- `shop.publish`
- `tiktok.publish`
- `social.prepare`

Der Worker führt keine Kommandos aus Queue-Payloads aus. Jede Stufe ist fest allowgelistet.

### Tagespipeline

`pipeline.daily` arbeitet sequenziell. Sobald ein Human-Gate offen ist, stoppt die betreffende Creative-Pipeline korrekt. Nach der Entscheidung im Admin wird ein deduplizierter `creative.generate`-Job eingeplant und das OpenMontage-Projekt fortgesetzt.

### Datenhaltung

Wichtige Tabellen:

- `public.queue_jobs`
- `public.commerce_pipeline_runs`
- `public.commerce_pipeline_stage_runs`
- `public.product_research_sources`
- `public.commerce_creative_jobs`
- `public.commerce_creative_approvals`
- `public.tiktok_content_uploads`
- `public.engagement_drafts`
- `shop.products`

`shop.products` besitzt Readiness-Felder für Pipeline, Approval, Qualität, Creative, Risiko, Blocker, Quellen und GPSR-Verifikation.

## Pipeline-Stufen

### 1. Trend Intelligence

Datei: `tooling/scripts/pipeline/trend-intelligence.mjs`

Quellen:

- Google Trends RSS für Deutschland,
- konfigurierte HTTPS-Feeds,
- lokale JSON-Captures eines freigegebenen Browser-Scrapers.

Jedes Signal behält Quelle, URL, Zeitpunkt und Rohmetriken. Ein LLM darf keine Trends erfinden.

Optionaler TikTok-/Marketplace-Scraper-Output wird über `TREND_BROWSER_OUTPUT` eingelesen. Das ermöglicht Browser-Automation außerhalb des Webshops, ohne Session-Cookies oder Scraper-Logik in die Shop-Anwendung zu mischen.

### 2. CJ Top 10

Datei: `tooling/scripts/pipeline/select-top-cj-products.mjs`

Bewertet:

- Trend-Score,
- nachgewiesenen EU-Lagerbestand,
- Daten- und Bildqualität,
- Varianten,
- Preis/Marge,
- Lieferzeit,
- Risikokategorie.

Produkte ohne EU-Bestand oder aus blockierten Kategorien werden verworfen. Die maximal zehn Tageskandidaten landen in `supplier_catalog_products` und bleiben im Review.

### 3. Product Enrichment

Datei: `tooling/scripts/pipeline/enrich-products.mjs`

Provider:

- OpenAI Responses API mit Websuche und strikt strukturiertem Output, oder
- ein internes HTTPS-Research-Endpoint.

Unbekannte Fakten bleiben unbekannt. Hersteller, Zertifikate, Material, Maße, Kompatibilität und Leistungsversprechen dürfen nicht erfunden werden. Quellen werden produktbezogen gespeichert.

### 4. Creative Factory

Datei: `tooling/scripts/pipeline/openmontage-shop-bridge.mjs`

Pro Produkt entsteht ein eigenes OpenMontage-Projekt unter `OpenMontage/projects/`. Die neue Pipeline `product-ugc` besitzt Gates für:

- Research,
- Proposal und Kosten,
- Script,
- Szenenplan,
- Assets,
- Edit,
- Compose/Final Review,
- Export.

Der Wrapper `platform/deploy/openmontage/run-product-ugc-codex.sh` verwendet `codex exec`, bleibt im OpenMontage-Workspace und beendet sich ohne Modelllauf, solange ein ungelöstes Human-Gate offen ist.

### 5. Shop Publishing

Datei: `tooling/scripts/pipeline/publish-approved-products.mjs`

Aktivierung verlangt unter anderem:

- Produktfreigabe,
- `ready_to_publish`,
- bestandenes und freigegebenes Creative,
- Mindest-Datenqualität,
- akzeptables Risiko,
- verifizierten Hersteller,
- verifizierten EU-Verantwortlichen,
- GPSR-Prüfzeitpunkt,
- Preis, Bestand, kaufbare Variante,
- ausreichende Bilder und Recherchequellen,
- keine offenen Blocker.

Die Publishing-Stufe genehmigt nichts selbst.

### 6. TikTok Shop

Produktlisting und Social-Video sind getrennt:

- `src/lib/tiktok/publish.ts` erstellt standardmäßig ein TikTok-Shop-Produkt als `AS_DRAFT`.
- `tooling/scripts/pipeline/upload-approved-tiktok-videos.mjs` kann ein freigegebenes OpenMontage-Video als TikTok-Inbox-Draft hochladen.

Direkte öffentliche Posts sind nicht der Default. Für echte Listings müssen Entwicklungsshop, Kategorien, Pflichtattribute, GPSR und API-Review erfolgreich getestet sein.

### 7. Social Distribution

Datei: `tooling/scripts/pipeline/prepare-social-drafts.mjs`

Erlaubt sind:

- Owned-Channel-Postentwürfe,
- kontextbezogene Kommentarantworten,
- einmalige Creator-Kooperationsanfragen,
- sachliche Community-Share-Entwürfe.

Nicht implementiert:

- Fake-Likes,
- Follow-Bots,
- Massenkommentare,
- unkontrollierte DMs,
- Identitäts- oder Testimonial-Täuschung.

Jeder Entwurf ist dedupliziert, prüfbar und opt-out-fähig. Die Freigabe im Admin versendet noch nichts; ein späterer offizieller Channel-Adapter muss Plattformberechtigung, Rate-Limits und Zustellung übernehmen.

## Human Review im Admin

Pfad: `/admin/freigaben`

### Produkt/GPSR

Die Oberfläche verlangt vollständige Hersteller- und EU-Verantwortlichen-Daten plus HTTPS-Belegquellen. Das Speichern bestätigt eine produktbezogene manuelle Prüfung.

### OpenMontage

Die Control Plane synchronisiert Checkpoint-Vorschauen, darunter:

- Konzepte und Produktionsplan,
- Kosten,
- Script,
- Szenen,
- Assetliste,
- Reviews,
- Final-Review-Status.

Eine Entscheidung erzeugt einen Datensatz in `commerce_creative_approvals`. Der lokale Wrapper überträgt die Entscheidung auditierbar in das Checkpoint-JSON. Bei `revision_requested` setzt Codex das konkrete Feedback um und erzeugt einen neuen Review-Checkpoint.

### Social

Die Oberfläche zeigt Nachricht, Channel, Interaktionstyp und öffentliche Kontext-URL. Freigabe setzt nur den Status `approved`.

## Inbetriebnahme

### 1. Migration anwenden

Die Migration muss zuerst gegen die produktive Supabase-Datenbank angewendet werden:

```bash
cd /Users/jeremy/dev/SIN-webshop-01
supabase db push
```

Vorher Datenbank-Backup und Migration in einer Staging-Datenbank prüfen.

### 2. Umgebungsvariablen

`.env.local` anhand `.env.example` vervollständigen. Kritisch:

- Supabase URL und Service Role,
- CJ E-Mail/API-Key,
- OpenAI API-Key oder internes Research-Endpoint,
- TikTok Shop App/OAuth/Shop-Daten,
- optionaler TikTok Content Posting User Access Token,
- OpenMontage-Provider und lokale Runtimes,
- `OPENMONTAGE_AGENT_COMMAND_JSON`.

Sichere Defaults beibehalten:

```dotenv
TIKTOK_SAVE_MODE=AS_DRAFT
TIKTOK_CONTENT_UPLOAD_ENABLED=false
```

Erst nach erfolgreichen Entwicklungs-/Stagingtests gezielt ändern.

### 3. Lokalen Worker manuell prüfen

```bash
cd /Users/jeremy/dev/SIN-webshop-01
pnpm pipeline:enqueue-daily
pnpm pipeline:once
```

Logs, Queue-Status, Pipeline-Runs, erzeugte JSON-Reports und Admin-Oberfläche prüfen.

### 4. launchd aktivieren

Siehe `platform/deploy/launchd/README.md`. Der Worker läuft dauerhaft; die Tagespipeline wird um 06:15 Uhr lokaler Mac-Zeit eingeplant.

### 5. OpenMontage/Codex prüfen

```bash
command -v codex
cd /Users/jeremy/dev/OpenMontage
python3 -c "from lib.checkpoint import init_project; print('checkpoint import ok')"
```

Falls Orca installiert ist, muss `orca status --json` gesund sein. Provider und beide verfügbaren Render-Runtimes sind vor bezahlter Generierung im Proposal offenzulegen.

## Testplan vor Produktion

1. Migration gegen Staging anwenden.
2. Next.js Typecheck, Lint und Build ausführen.
3. Einen manuellen Trend-Scan mit echten Quellen prüfen.
4. Einen CJ-Kandidaten mit EU-Bestand bis Enrichment führen.
5. Alle erfundenen/ungeklärten Produktfakten als Blocker bestätigen.
6. Ein OpenMontage-Projekt durch jedes Human-Gate führen.
7. Render-Datei, final_review und Exportpfade prüfen.
8. Produktfreigabe ohne GPSR absichtlich scheitern lassen.
9. Vollständiges Produkt im Shop aktivieren.
10. TikTok-Shop-Draft in einem Development Shop prüfen.
11. TikTok-Video-Upload zunächst deaktiviert prüfen, dann mit Testnutzer als Inbox-Draft.
12. Social-Draft freigeben und bestätigen, dass keine automatische Zustellung erfolgt.
13. Retry, Dead Letter, Worker-Neustart und Idempotenz testen.
14. Backups, Secrets, Service-Role-Zugriff und RLS auditieren.

## Bewusst offene Integrationen

Diese Punkte benötigen externe Konten, Reviews oder Provider und können nicht allein durch Repository-Code abgeschlossen werden:

- TikTok Shop Development-/Production-App-Freigabe und Pflichtattribute je Kategorie,
- TikTok Content Posting OAuth mit `video.upload`,
- produktbezogene Hersteller-/GPSR-Nachweise,
- OpenMontage Bild-/Video-/Voice-Provider und Budget,
- ein offizieller Social-Channel-Adapter für tatsächlich zulässige Zustellung,
- Browser-Scraper für TikTok/Marktplätze unter Beachtung der jeweiligen Bedingungen.

## Altlasten

Die synthetischen n8n-Flows für erfundene Trends, simulierte Lieferantenrecherche und unkontrolliertes Social-Posting liegen nur noch unter:

`platform/workers/n8n/simone/workflows/archive/legacy-synthetic/`

Sie dürfen nicht wieder aktiviert werden.
