# ShopSIN Goal-to-End Execution Runbook

Stand: 23. Juli 2026

Dieses Dokument ist die operative Reihenfolge fuer einen sicheren ShopSIN-Release. Es ersetzt alte Einmal-Anweisungen mit festen Produktzahlen oder veralteten Simone-/Vercel-Endpunkten.

## 1. Unveraenderliche Sicherheitsregeln

- Keine echten Secrets in Git, Logs, Screenshots oder Reports.
- Supabase oeffentlich ausschliesslich ueber HTTPS und ohne Port `8006`.
- TikTok bleibt standardmaessig `TIKTOK_SAVE_MODE=AS_DRAFT`.
- Produktfreigabe, Creative-Freigabe, GPSR/Herstellerdaten und Datenqualitaet duerfen nicht umgangen werden.
- Destruktive Integrationstests duerfen nur gegen eine isolierte Testdatenbank mit explizitem Opt-in laufen.
- Kein Produktionsdeploy ohne erfolgreiches `pnpm go-live:today`.

## 2. Repository-Preflight

```bash
cd /Users/jeremy/dev/SIN-webshop-01
node --version
pnpm --version
git status --short
pnpm install --frozen-lockfile
```

Erwartung:

- Node entspricht `package.json#engines`.
- Aenderungen sind verstanden und gehoeren zum aktuellen Auftrag.
- Lockfile wird nicht implizit neu geschrieben.

## 3. Konfiguration

Nutze `.env.example` lokal und `.env.live.example` als Produktionsvertrag. Reale Werte gehoeren in den Secret Manager beziehungsweise die Deployment-Umgebung. Der verbindliche Anbieter-, Secret- und Abnahmeleitfaden steht in `docs/PRODUCTION-EXTERNAL-SETUP.md`.

```bash
pnpm check:env:template
pnpm check:env:live
pnpm pipeline:verify
```

Vor TikTok-OAuth muessen mindestens `TIKTOK_SERVICE_ID`, `TIKTOK_APP_KEY` und `TIKTOK_APP_SECRET` gesetzt sein. Der Seller startet die Verbindung authentifiziert unter `/admin/tiktok`; Tokens werden in `tiktok_auth` gespeichert.

## 4. Datenbank und Migrationen

```bash
pnpm check:migrations
pnpm db:migrate
```

Vor produktiven Migrationen:

1. Datenbank-Backup erstellen und Wiederherstellung testen.
2. Migrationen gegen Staging/Test ausfuehren.
3. RLS-, Idempotenz-, Queue- und Fulfillment-Constraints pruefen.
4. Erst danach Produktion migrieren.

## 5. Vollstaendiges lokales Release-Gate

```bash
pnpm run ci
```

Das Gate umfasst:

- Governance- und Dokumentationsvertrag
- TypeScript
- Route-, Migrations-, Environment- und Architektur-Gates
- Unit- und sichere Integrationstests
- Produktionsbuild
- Scan auf Legacy-/Placeholder-Fallbacks
- Start des gebauten Next.js-Servers und Runtime-Smoke

Destruktive Datenbanktests laufen nur mit isolierten Test-Credentials:

```bash
ALLOW_DESTRUCTIVE_INTEGRATION_TESTS=true \
TEST_SUPABASE_URL=https://YOUR_TEST_SUPABASE \
TEST_SUPABASE_SERVICE_ROLE_KEY=YOUR_TEST_SERVICE_ROLE_KEY \
pnpm test:integration
```

Webhook-E2E benoetigt zusaetzlich einen laufenden Testserver, einen Test-Webhook-Key und `ALLOW_DESTRUCTIVE_WEBHOOK_TESTS=true`. Niemals gegen die Produktionsdatenbank ausfuehren.

## 6. Browser- und Produktionssimulation

```bash
pnpm exec playwright install chromium
E2E_USE_PRODUCTION=true pnpm build
E2E_USE_PRODUCTION=true pnpm test:e2e
```

Mindestens pruefen:

- Startseite und Katalog
- Produktdetail
- Warenkorb und leerer Checkout
- Login/Admin-MFA
- Rechtstexte
- Mobile Darstellung
- Checkout mit Stripe-Testmodus in einer isolierten Umgebung

## 7. TikTok Shop Goal-to-End

1. Development Shop und benoetigte Scopes im TikTok Partner Center aktivieren.
2. Redirect URL auf `https://shopsin.delqhi.com/api/tiktok/oauth/callback` setzen.
3. Als MFA-geschuetzter Admin `/admin/tiktok` oeffnen und die sichere Verbindung starten.
4. Mindestens ein vollstaendig verifiziertes Produkt durch die Pipeline fuehren.
5. Zuerst Draft erzeugen und im Seller Center pruefen.
6. Order, Mehrpositionen, Mengen, CJ-Fulfillment, Tracking, Storno und Retoure im Development Shop testen.
7. Erst nach dokumentierter Abnahme `TIKTOK_SAVE_MODE=LISTING` setzen.

## 8. Produktionsfreigabe

```bash
pnpm go-live:today
```

Dieses Gate verlangt echte Live-Credentials, einen erfolgreichen Produktionsbuild, strikte Datenbankbereitschaft und externe HTTPS-Smokes. Ein Fehler ist ein Release-Stopper.

Manuelle Freigaben, die Code nicht ersetzen kann:

- Unternehmens-, Steuer- und Kontaktangaben fachlich bestaetigt
- Rechtstexte anwaltlich/fachlich geprueft
- Stripe Live-Account, Webhook und Auszahlungsstatus aktiv
- Resend-Domain verifiziert
- CJ-Konto, Versandprodukte und Webhook real getestet
- TikTok App/Development Shop/Scopes genehmigt
- GPSR-, Hersteller- und EU-Verantwortlichen-Daten je Produkt belegt
- Backup, Monitoring, Alerts und Incident-Verantwortung aktiv

## 9. Beweise und Abschluss

Jeder Release-Bericht muss enthalten:

- Commit beziehungsweise Diff-Umfang
- ausgefuehrte Commands und Exit-Codes
- Test-/Build-/Smoke-Ergebnisse
- migrierte Datenbankversion
- gepruefte Produktions-URLs
- bekannte Rest-Risiken und Owner
- Rollback-Schritte

Ein Bericht ohne ausgefuehrte Gates ist kein Release-Nachweis.
