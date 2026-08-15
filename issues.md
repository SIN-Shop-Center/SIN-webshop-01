# ShopSIN Issues

> **Stand:** 2. August 2026
> **Scope:** Technisch belegbarer Restbestand nach Abschluss der lokalen CEO-Verifikation.
> **Statuswerte:** `OPEN`, `BLOCKED`, `READY FOR REVIEW`, `DONE`.

## Übersicht

| ID | Priorität | Status | Thema |
|---|---:|---|---|
| `REPO-001` | P0 | DONE | Abschluss-Diff, Sicherheitsgates und Push nach `main` |
| `DATA-001` | P0 | DONE | Generierte Supabase-Datenbanktypen und Schema-Fingerprint |
| `TEST-001` | P0 | DONE | Reproduzierbare lokale Integration- und E2E-Umgebung |
| `OPS-001` | P0 | BLOCKED | Echte Produktions-, Anbieter- und Marketplace-Abnahmen |
| `AGENT-001` | P1 | DONE | `sin-shop-logistic` mit sicheren Dry-Run-Verträgen |
| `TOOL-001` | P2 | OPEN | Große Tooling-Orchestratoren schrittweise modularisieren |

---

## REPO-001 — Abschluss-Diff und Push

> **Status:** DONE

Der Abschlusslauf basiert auf `origin/main` bei `4018686` und enthält nur den
beabsichtigten technischen Completion-Diff. Commit-, Push- und Workflow-Evidence
wird im repository-lokalen `.sin-gpt-web/COMPLETION_REPORT.md` geführt.

Abschluss-Evidence:

- vollständiger Diff-, Secret- und Artefakt-Review ohne Treffer in getracktem HEAD,
- `sin verify`, `sin review` und Taskplan-Validierung ausgeführt,
- frische CI-, Audit-, Migrations- und E2E-Gates grün,
- der erforderliche leere Ordner `platform/secrets/` bleibt über `.gitkeep` in
  sauberen Clones vorhanden, während echte Runtime-Secrets ignoriert bleiben,
- die vorhandene `sin_goal_mode.db` wurde erhalten und aus dem Repository-Root
  nach `.sin/sin_goal_mode.db` verschoben,
- wiederholt fehlschlagende Scheduled-Crons verwenden nun eine validierte
  öffentliche Basis-URL und bleiben ohne `CRON_SECRET` fail-closed,
- `git diff --check` und der Repository-Strukturcheck sind grün.

---

## DATA-001 — Supabase-Typisierung

> **Status:** DONE

Evidence:

- `src/types/database.generated.ts` ist kanonisch und deckt alle 37 Migrationen ab.
- `pnpm db:types:check` bestätigt den aktuellen Schema-Fingerprint.
- Browser-, Server-, Data- und Admin-Clients verwenden `Database` direkt.
- `LooseSupabaseClient`, `asLooseSupabaseClient`, `LooseQueryBuilder` und
  `loose-client` kommen im Produktions- oder Tooling-Code nicht mehr vor.
- Typecheck, Build, Unit-, Integration- und E2E-Tests sind grün.

---

## TEST-001 — Reproduzierbare lokale Tests

> **Status:** DONE

Die Testläufe beziehen ihre isolierten lokalen Supabase-Werte über
`tooling/scripts/lib/local-supabase-env.mjs`. Werte werden nur an Kindprozesse
weitergegeben und nicht protokolliert.

Evidence:

- lokale Supabase-Migrationshistorie: 37 Dateien, 37 Ledger-Einträge, keine Drift,
- projektspezifischer Migration-Status auf der isolierten lokalen DB: 37 angewandt,
  0 ausstehend,
- `pnpm run ci`: grün, einschließlich 50 Node-Tests, 12 Unit-Tests und 11 echten
  Integrationstests,
- `pnpm test:e2e`: im frischen Produktionsmodus grün, 19 bestanden und 1 bewusst
  übersprungener Stripe-Hosted-Checkout,
- Desktop Chromium, Mobile Chromium, Auth, Cart, A11y und ungültige
  Stripe-Webhook-Signatur sind im reproduzierbaren Lauf enthalten,
- Reports, Traces, Screenshots und `test-results/` bleiben außerhalb von Git.

Der echte Stripe-Hosted-Checkout bleibt ausschließlich bei vorhandenen
freigegebenen Testmode-Werten aktiv und wird nicht mit erfundenen Credentials
simuliert.

---

## AGENT-001 — `sin-shop-logistic`

> **Status:** DONE

Der frühere Audit-Hinweis auf eine fehlende Runtime ist nicht mehr aktuell.

Evidence:

- Registry: `status: active`, `repo.status: active`,
- kanonische Runtime unter
  `platform/agents/a2a/team-shop/sin-shop-logistic`,
- Syntax-/Python-Check grün,
- vier Contract-Tests grün,
- Health, Agent Card, REST, JSON-RPC und MCP liefern Dry-Run-Pläne,
- Nicht-Dry-Run-Ausführung wird abgelehnt,
- Browser-Automator erzeugt Audit-Artefakte, führt aber keine externe Aktion aus,
- Login, CAPTCHA, Zahlung, Veröffentlichung und rechtlich relevante Schritte
  bleiben Human-Gates.

---

## OPS-001 — Externe Go-live-Abnahmen

> **Status:** BLOCKED

Die Codebasis ist lokal verifiziert, aber eine Produktionsfreigabe bleibt NO-GO,
bis folgende externe Nachweise vorliegen. Es wurden keine Secrets erfunden,
ausgegeben oder committed. Der verbindliche Setup- und Evidenzablauf ist in
`docs/PRODUCTION-EXTERNAL-SETUP.md` konsolidiert.

### Runtime und Anbieter

| Bereich | Ursache | Owner | Nächster Schritt |
|---|---|---|---|
| Produktions-Supabase | Ziel-URL, Keys und `DATABASE_URL` in diesem Lauf nicht bereitgestellt | ShopSIN Operations | Werte über den freigegebenen Secret-Manager bereitstellen; Zielmigrationen, RLS, `/api/healthz`, Backup und Restore prüfen |
| Stripe | Live-/Testmode-Konten und signierte End-to-End-Abnahme fehlen | Payments Owner | Testcheckout, signierten Webhook, Idempotenz, Bestellung und E-Mail in freigegebener Sandbox prüfen |
| CJ Dropshipping | Konto, API-Zugang und kontrollierter Testauftrag fehlen | Supplier Operations | Import, Varianten, Quote, Fulfillment, Retry und Statusupdates mit Testauftrag abnehmen |
| Resend/E-Mail | API-Zugang und Domain-Abnahme fehlen | Messaging Owner | SPF, DKIM, DMARC sowie Bestell-/Versandmails an Testempfänger prüfen |
| Cloudflare | Preview-/Produktionsbindings und öffentlicher Smoke fehlen | Platform Operations | Preview-Build, Worker, Tunnel, DNS, Secrets, Monitoring und Rollback abnehmen |

### Marketplace, Recht und Betrieb

| Bereich | Ursache | Owner | Nächster Schritt |
|---|---|---|---|
| TikTok Shop | App, Development Shop, Scopes, Seller-OAuth und Testkonten fehlen | Marketplace Owner | Draft-, Listing-, Order-, Tracking-, Storno- und Retourenfluss im Development Shop abnehmen |
| GPSR/Hersteller/EU-Verantwortliche | Produktbezogene Belege und fachliche Freigabe fehlen | Legal/Compliance Owner | Daten je veröffentlichbarem Produkt dokumentieren und fachlich freigeben |
| Rechtstexte/Unternehmensdaten | Externe fachliche Prüfung ist nicht belegt | Legal Owner | Impressum, Datenschutz, AGB, Widerruf, Steuer- und Kontaktdaten final prüfen |
| Backup/Restore/Incident | Produktionsnaher Restore-Test, Alerts und Incident Owner fehlen | SRE/Operations | Isolierten Restore durchführen, Monitoring/Alerts testen und Verantwortlichkeit dokumentieren |
| Trendquellen | TikTok-/Marketplace-Browser-Evidence ist nicht verbunden | Product Research Owner | Freigegebene Quellen anbinden und Provenienz-/Freshness-Nachweis prüfen |

Frische Gate-Evidence:

- `pnpm audit --audit-level=high` ist nach gepinnten, getesteten Transitiv-Fixes
  grün; es verbleiben nur vier moderate und zwei niedrige Findings,
- `pnpm pipeline:verify` bestätigt alle erforderlichen Dateien, OpenMontage-Komponenten,
  lokalen Werkzeuge und sicheren Defaults, stoppt aber an fehlender Live-Konfiguration.
- `pnpm check:env:live` stoppt an den nicht bereitgestellten Runtime-Werten.
- `TIKTOK_SAVE_MODE=AS_DRAFT`, deaktivierter Content-Upload, EU-Stock-Anforderung und
  deaktiviertes automatisches Social Engagement bleiben sichere Defaults.

---

## TOOL-001 — Tooling modularisieren

> **Priorität:** P2 · **Status:** OPEN · **Kein aktueller Release-Blocker**

Die großen Orchestratoren bleiben technische Schuld, wurden für diesen Abschluss
aber gegen weiteres unkontrolliertes Wachstum abgesichert:

- Line-Guard erfasst jetzt zusätzlich `.mjs` mit einem Regellimit von 400 Zeilen.
- Complexity-Guard erfasst jetzt ebenfalls `.mjs`.
- Sechs bestehende Großskripte besitzen exakte Ist-Baselines; jede Vergrößerung
  oder veraltete Baseline lässt CI fehlschlagen.
- Tests beweisen die Erkennung eines 401-zeiligen und eines 121-Branch-`.mjs`-Files.
- Gemeinsame lokale Supabase-Auflösung wurde bereits aus E2E, Integration und
  Build in ein getestetes Hilfsmodul extrahiert.

Verbleibende, nicht release-blockierende Arbeit:

- [ ] OpenMontage-Bridge in I/O-, Checkpoint-, Approval- und Reporting-Module teilen.
- [ ] Seed- und Produktpipeline in Normalisierung, Compliance, Scoring und Persistenz teilen.
- [ ] Governance-/Google-CLI in Auth, API, Cache und Rendering teilen.
- [ ] Baseline-Pins bei jeder echten Modulzerlegung reduzieren oder entfernen.

---

## Verbindliche Abschlussprüfung

```sh
pnpm install --frozen-lockfile
pnpm db:migrate:status
pnpm run ci
pnpm test:e2e
pnpm pipeline:verify
sin verify
sin review
sin-gpt-web-state --repo . validate
```

Lokale Gates müssen grün sein. Externe Gates dürfen nur mit Ursache, Owner,
nächstem Schritt und Evidence als blockiert gelten.
