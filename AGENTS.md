# AGENTS.md — ShopSIN / SIN-webshop-01

Stand: 23. Juli 2026

Diese Regeln gelten fuer Menschen und autonome Agenten. Vor Aenderungen zuerst
`README.md`, `EXECUTE.md`, den aktuellen CEO-Audit und die betroffenen Runbooks lesen.

## NotebookLM Judge Protocol

Die Projekt-Governance ist an genau das in `platform/governance/project-ssot.mjs` gefuehrte
Notebook und dessen zentrale Google-Docs-Quelle gebunden. Vor Architektur-,
Security-, Datenbank- oder Betriebsentscheidungen sind diese Abfragen Pflicht.

- `PROJECT_NOTEBOOK_ID=8a11c91e-7ca0-4b0a-9fc0-78a5d6cd0f54`
- `SOURCE_COUNT_REQUIRED=1`

```bash
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche <critical_invariant> und <halt_condition> gelten fuer dieses Projekt?" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche Verzeichnisstruktur und Dateien muessen initial angelegt werden (Greenpause, no code)?" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche Dokumente sind bis Definition of Done Pflicht (README, Architektur, ADR, RFC, Security, SRE, Standards)?" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche Regeln muessen in AGENTS.md stehen, damit jeder Coder-Agent immer NotebookLM als Richter nutzt?" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Welche <interaction_invariant> und <security_gate> gelten fuer Browser-Workflows?" --json
```

## Zielbild

ShopSIN ist ein Next.js-16-Commerce-System auf Cloudflare Workers/OpenNext mit:

- Storefront: `https://shopsin.delqhi.com`
- self-hosted Supabase hinter HTTPS/Cloudflare Tunnel
- Stripe Checkout und signierten Webhooks
- CJ Dropshipping fuer Beschaffung und Fulfillment
- TikTok Shop als erster Social-Marketplace-Kanal
- einer Supabase-basierten Commerce Control Plane fuer Recherche, Freigabe,
  Creative-Handoff, Publishing, Orders, Monitoring und Audit-Evidenz

Eine konfigurierte Ziel-URL ist kein Betriebsnachweis. Live-Status wird nur durch
`pnpm go-live:today` und dokumentierte externe Abnahmen belegt.

## Unveraenderliche Regeln

1. **Keine Secrets in Git, Logs, Reports oder Screenshots.**
   Service-Role-, Stripe-, CJ-, TikTok-, Resend- und Cron-Secrets sind nur in
   Secret-Managern beziehungsweise serverseitiger Runtime-Konfiguration erlaubt.

2. **Supabase oeffentlich nur via HTTPS ohne internen Port.**
   Port `8006` ist ausschliesslich Tunnel-Ingress. Niemals in Browser-, Worker-,
   Test- oder Produktions-URLs verwenden. Postgres `5432` bleibt privat.

3. **Keine Worker-Route vor `supabase.delqhi.com/*`.**
   Der Tunnel-Hostname darf nicht durch eine Worker-Route ueberschrieben werden.

4. **Schema `shop` ist der Storefront-Vertrag.**
   `createDataClient()` und `createAdminClient()` arbeiten bewusst im Schema
   `shop`; Control-Plane-Tabellen koennen explizit `public` verwenden.

5. **Nur versionierte Migrationen.**
   Produktive Schemaaenderungen gehoeren ausschliesslich nach
   `platform/infra/supabase/migrations/` und werden mit `pnpm db:migrate` angewendet.
   Historische `tooling/scripts/supabase/setup-*.sql` sind keine zweite Source of Truth.
   Bestehende Datenbanken werden nur nach Schemaabgleich und mit explizitem
   Baseline-Ziel uebernommen.

6. **RLS default-deny.**
   Jede neue Tabelle erhaelt sofort RLS. Oeffentliche Daten brauchen eine enge
   SELECT-Policy; nutzerbezogene Daten muessen an `auth.uid()` gebunden sein.
   Der Service-Role-Key darf nie einen `NEXT_PUBLIC_`-Prefix tragen.

7. **Keine Teil-Fulfillments.**
   Fehlt bei einer bezahlten Bestellung auch nur eine verifizierte CJ-Variante,
   Menge oder Lieferangabe, wird die gesamte Bestellung zur manuellen Pruefung
   gestoppt. Niemals Positionen stillschweigend auslassen oder Fake-Daten senden.

8. **Idempotenz ist Datenbankautoritaet.**
   Stripe-Orders werden durch den UNIQUE-Vertrag auf `stripe_session_id`
   serialisiert. `processed_events` ist Audit-Trail und darf einen Retry nach
   fehlgeschlagenem Order-Write nicht blockieren.

9. **Cron-Endpunkte sind fail-closed.**
   Ausschliesslich `isCronAuthorized()` verwenden. Keine direkten Vergleiche mit
   ``Bearer ${process.env.CRON_SECRET}`` und keine Default-Secrets.

10. **TikTok startet sicher.**
    OAuth ausschliesslich ueber den authentifizierten Startpunkt mit Single-Use
    State. `TIKTOK_SAVE_MODE=AS_DRAFT` und Content Upload `false` bleiben Default,
    bis Development-Shop, Scopes, Attribute, GPSR, Orders und Returns abgenommen sind.

11. **Keine erfundene Conversion oder Rechtsbehauptung.**
    Keine Fake-Countdowns, kuenstliche Verknappung, erfundene Vorbestellung,
    Telefonnummer, Steuerstatus, Lieferfrist oder Herstellerinformation.

12. **Ein Agentenbericht ersetzt keinen Laufzeitnachweis.**
    „Fertig“ setzt erfolgreiche Commands, Exit-Codes, Produktions-Smokes,
    Datenbankversion, externe Freigaben und einen dokumentierten Rollback voraus.

## Supabase-Clients

| Client | Schema | Zweck |
|---|---|---|
| `src/lib/supabase/data-client.ts` | `shop` | anonyme, read-only Storefront-Abfragen; Session-Persistenz deaktiviert |
| `src/lib/supabase/server.ts` | Request/Auth | Cookie-gebundene Nutzeroperationen |
| `src/lib/supabase/admin.ts#createAdminClient` | `shop` | privilegierte Storefront-, Order- und Fulfillment-Operationen |
| `createPublicAdminClient` | `public` | Queue, Trends, UGC und kanalunabhaengige Control Plane |

Client Components duerfen weder Admin-Client noch Service-Role-Werte importieren.

## Verbindlicher Arbeitsablauf

```bash
cd /Users/jeremy/dev/SIN-webshop-01
pnpm install --frozen-lockfile
pnpm db:migrate:status
pnpm run ci
pnpm test:e2e
pnpm pipeline:verify
```

Bei einer freigegebenen Datenbankmigration:

```bash
pnpm db:migrate
```

Nur fuer eine bereits bestehende, manuell verifizierte Datenbank ohne
Migration-Historie:

```bash
ALLOW_MIGRATION_BASELINE=true \
MIGRATION_BASELINE_THROUGH=YYYYMMDDHHMMSS \
pnpm db:migrate:baseline
pnpm db:migrate
```

Baseline niemals bis zu einer noch nicht real angewendeten Migration setzen.

## Release-Gates

```bash
pnpm check:env:template
pnpm check:env:live
pnpm run ci
pnpm test:e2e
pnpm go-live:today
```

Das finale Gate muss mindestens belegen:

- TypeScript, Unit-, Integrations- und Browsertests
- Produktionsbuild und gestarteten Runtime-Smoke
- aktuelle Migrationen, RLS und keine Schema-Drift
- Stripe-, Supabase-, Resend-, CJ- und TikTok-Readiness
- Storefront, Checkout, Rechtstexte und Deep-Health ueber HTTPS
- Backup/Restore, Monitoring, Alerts und Incident Owner

## Environment-Vertrag

Vorlage: `.env.example` lokal, `.env.live.example` fuer Produktion.

Kernwerte:

```env
SITE_URL=https://shopsin.delqhi.com
NEXT_PUBLIC_APP_URL=https://shopsin.delqhi.com
NEXT_PUBLIC_SUPABASE_URL=https://supabase.delqhi.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CJ_EMAIL=
CJ_API_KEY=
CJ_WEBHOOK_SECRET=
CRON_SECRET=
CSP_ENFORCE=true
TIKTOK_SAVE_MODE=AS_DRAFT
TIKTOK_CONTENT_UPLOAD_ENABLED=false
```

`NEXT_PUBLIC_*`-Werte werden beim Build eingebrannt. Aenderungen erfordern einen
neuen Build und Deploy.

## Abbruchkriterien

Sofort stoppen und NO-GO dokumentieren bei:

- fehlenden oder Platzhalter-Secrets
- ungeprueften Migrationen oder Datenbankduplikaten
- fehlschlagendem Typecheck, Build, Test oder Runtime-Smoke
- 5xx im Checkout-, Webhook-, Order- oder Fulfillmentpfad
- unvollstaendigen Produkt-/GPSR-/Herstellerdaten
- direktem TikTok-Listing ohne Development-Shop-Abnahme
- ungeklaerten Steuer-, Anbieter- oder Widerrufsdaten
- fehlendem Backup oder nicht getestetem Rollback

Aktueller Audit: `docs/CEO_AUDIT_2026-07-23.md`.
