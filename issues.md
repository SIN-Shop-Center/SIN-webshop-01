# Open Issues

> **Stand:** 24. Juli 2026  
> **Scope:** Offene Arbeiten nach dem Repository- und Architektur-Refactoring von `SIN-webshop-01`.  
> **Statuswerte:** `OPEN`, `BLOCKED`, `READY FOR REVIEW`, `DONE`.

## Prioritäten

| Priorität | Bedeutung |
|---|---|
| **P0** | Blockiert einen verlässlichen Merge, Release oder kritischen Verkaufspfad. |
| **P1** | Wichtige Architektur- oder Betriebsarbeit, die unmittelbar danach erledigt werden soll. |
| **P2** | Sinnvolle Qualitätsverbesserung ohne aktuellen Release-Blocker. |

## Übersicht

| ID | Priorität | Status | Thema |
|---|---:|---|---|
| `REPO-001` | P0 | OPEN | Großen uncommitteten Refactor prüfen und sicher in Commits überführen |
| `DATA-001` | P0 | OPEN | Generierte Supabase-Datenbanktypen einführen |
| `TEST-001` | P0 | OPEN | Reproduzierbare E2E-Testumgebung und vollständigen Browserlauf herstellen |
| `OPS-001` | P0 | OPEN | Echte Produktions- und Sandbox-Integrationen Ende-zu-Ende validieren |
| `AGENT-001` | P1 | BLOCKED | `sin-shop-logistic` inklusive Browser-Automator implementieren |
| `TOOL-001` | P1 | OPEN | Große Tooling- und Pipeline-Skripte modularisieren |

---

## REPO-001 — Großen Refactor prüfen und sicher committen

> **Priorität:** P0 · **Status:** OPEN · **Bereich:** Repository / Git

### Kontext

Der Architekturumbau liegt zusammen mit bereits vorher vorhandenen Änderungen in einem großen uncommitteten Working Tree. Der aktuelle Stand wurde nicht verworfen und nicht automatisch committed. Vor einem Merge muss klar getrennt werden, welche Änderungen zum Strukturumbau gehören und welche aus älteren Arbeiten stammen.

### Aufgaben

- [ ] Vollständigen `git status` und `git diff --stat` prüfen.
- [ ] Umzüge mit `git diff --summary` und Rename-Erkennung nachvollziehen.
- [ ] Bereits vorher vorhandene fachliche Änderungen von reinen Strukturänderungen unterscheiden.
- [ ] Sicherstellen, dass keine lokalen Secrets, Build-Artefakte, Testvideos oder Screenshots committed werden.
- [ ] Die Änderungen in logisch getrennte Commits aufteilen, mindestens:
  1. Repository-Struktur und Pfade
  2. Build-, CI- und Governance-Verträge
  3. Produktionsfehler und Server/Client-Grenzen
  4. Modulzerlegung und Line-Guard
  5. E2E- und Accessibility-Korrekturen
- [ ] Vor jedem Commit die zugehörigen Qualitäts-Gates ausführen.
- [ ] Optional einen Review-Branch erstellen, bevor der aktuelle Branch verändert wird.

### Akzeptanzkriterien

- [ ] `git status` enthält nur bewusst nicht versionierte lokale Dateien oder ist sauber.
- [ ] Jeder Commit hat einen klaren fachlichen Zweck und lässt sich einzeln reviewen.
- [ ] Keine Secret-, Cache-, `.next`-, Playwright- oder Test-Result-Dateien sind im Commit enthalten.
- [ ] Der finale Commit-Stand besteht alle in `package.json` definierten CI-Gates.

### Prüfung

```sh
git status --short
git diff --stat
git diff --check
git diff --summary
pnpm ci
```

### Hinweise

Vor dem Strukturumbau wurden lokale Sicherungen außerhalb des Repositories angelegt:

```text
/tmp/SIN-webshop-01-pre-restructure.patch
/tmp/SIN-webshop-01-untracked.tar.gz
```

Diese Sicherungen dürfen erst gelöscht werden, wenn der Refactor reviewed und sicher versioniert wurde.

---

## DATA-001 — Generierte Supabase-Datenbanktypen einführen

> **Priorität:** P0 · **Status:** OPEN · **Bereich:** Datenbank / TypeScript

### Kontext

Die Anwendung verwendet aktuell den Übergangsadapter:

```text
src/lib/supabase/loose-client.ts
```

Der Adapter hält Query-Chaining typisierbar, kennt aber Tabellen, Views, RPC-Funktionen und Spalten nicht statisch. Dadurch können Schemafehler erst zur Laufzeit erkannt werden.

### Aufgaben

- [ ] Festlegen, welche Supabase-Instanz die kanonische Quelle für die Typgenerierung ist.
- [ ] Supabase-CLI reproduzierbar im Projekt oder CI verfügbar machen.
- [ ] Datenbanktypen aus dem tatsächlich migrierten Schema generieren.
- [ ] Generierte Typen an einem kanonischen Pfad ablegen, zum Beispiel:

```text
src/types/database.generated.ts
```

- [ ] `createAdminClient`, `createDataClient`, Browser- und Server-Clients mit `Database` parametrisieren.
- [ ] Tabellen- und View-Zugriffe auf echte generierte Row-, Insert- und Update-Typen umstellen.
- [ ] RPC-Aufrufe gegen die generierten Function-Signaturen prüfen.
- [ ] Unnötige `any`, `unknown`-Casts und manuelle Datenbank-Row-Typen abbauen.
- [ ] `src/lib/supabase/loose-client.ts` vollständig entfernen.
- [ ] Einen CI-Check hinzufügen, der veraltete generierte Typen erkennt.

### Akzeptanzkriterien

- [ ] Kein Produktionsmodul importiert `loose-client.ts`.
- [ ] `rg "LooseSupabaseClient|asLooseSupabaseClient|LooseQueryBuilder" src` liefert keine Treffer.
- [ ] Falsche Tabellen-, Spalten- und RPC-Namen verursachen Compile-Fehler.
- [ ] Typgenerierung ist dokumentiert und mit einem einzelnen Befehl reproduzierbar.
- [ ] Typecheck, Build, Unit-, Integration- und Governance-Tests sind grün.

### Prüfung

```sh
pnpm typecheck
pnpm build
pnpm test:quality
rg -n "LooseSupabaseClient|asLooseSupabaseClient|LooseQueryBuilder" src
```

### Abhängigkeiten

- Zugriff auf die kanonische Supabase-Instanz oder einen lokal vollständig migrierten Supabase-Stack.
- Alle 36 kanonischen Migrationen unter `platform/infra/supabase/migrations` müssen angewendet sein.

---

## TEST-001 — Reproduzierbare E2E-Testumgebung und vollständiger Browserlauf

> **Priorität:** P0 · **Status:** OPEN · **Bereich:** Playwright / CI / Testdaten

### Kontext

Der Produktionsbuild und der Runtime-Smoke-Test sind grün. Der vollständige Playwright-Lauf ist aber noch nicht zuverlässig reproduzierbar:

- Produkt- und Checkout-Tests benötigen echte oder deterministisch gesäte Produkte.
- Auth-Tests benötigen eine kontrollierte Testinstanz und Testkonten.
- Stripe-Checkout benötigt sichere Testmode-Secrets und Webhook-Verarbeitung.
- Ein Playwright-Lauf verlor nach frühen Testfehlern den gestarteten Produktionsserver; die Folgefehler waren `ECONNREFUSED` statt unabhängiger Testergebnisse.
- Die zuletzt korrigierten Auth-Selektoren, Cookie-Fokuslogik und A11y-Änderungen wurden noch nicht in einem vollständigen finalen Browserlauf bestätigt.
- Zwei Integrationstestdateien werden ohne echte Datenbankumgebung derzeit übersprungen.

### Aufgaben

#### Testumgebung

- [ ] Eine dedizierte `.env.test`-Strategie dokumentieren, ohne Secrets zu committen.
- [ ] Eine eigene Supabase-Testinstanz oder einen lokalen migrierten Stack verwenden.
- [ ] Einen idempotenten E2E-Seed für mindestens folgende Daten erstellen:
  - aktives Produkt mit Bestand und Variante
  - Produktbilder oder stabile lokale Fixtures
  - Testkunde
  - leerer und gefüllter Warenkorb
  - Bestellung für Status- und Rückgabeprüfungen
- [ ] Seed und Cleanup vor beziehungsweise nach dem Testlauf automatisieren.
- [ ] Testdaten eindeutig kennzeichnen und niemals mit Produktionskunden vermischen.

#### Playwright-Lifecycle

- [ ] Den `webServer`-Start gegen `/api/health` prüfen, nicht nur gegen eine beliebige URL.
- [ ] Sicherstellen, dass der Server bei einem einzelnen Testfehler für den restlichen Lauf aktiv bleibt.
- [ ] Server-stdout und stderr bei unerwartetem Exit in den Playwright-Report übernehmen.
- [ ] Einen festen E2E-Port verwenden, der nicht mit lokalen Dev-Servern kollidiert.
- [ ] Produktionsmodus und Dev-Modus als getrennte Scripts anbieten.

#### Tests

- [ ] Auth-Tests mit eindeutigen rollenbasierten Selektoren ausführen.
- [ ] Cookie-Hinweis prüfen, ohne den Skip-Link-Test zu verfälschen.
- [ ] Axe-Scans erst nach abgeschlossenen Animationen und stabilem Rendering starten.
- [ ] Produktliste, Produktdetail und Add-to-Cart gegen Seed-Produkte testen.
- [ ] Stripe-Hosted-Checkout nur bei vorhandenen Testmode-Secrets ausführen.
- [ ] Webhook-Signatur- und Idempotenztests unabhängig vom externen Stripe-UI-Test ausführen.
- [ ] Mobile-Viewport, horizontales Overflow und Touch-Ziele prüfen.
- [ ] Die aktuell übersprungenen Inventory-Race- und Webhook-Idempotenztests mit Testdatenbank aktivieren.

### Akzeptanzkriterien

- [ ] `pnpm test:e2e:chromium` ist zweimal hintereinander grün.
- [ ] `pnpm test:e2e:mobile` ist zweimal hintereinander grün.
- [ ] Kein Test scheitert aufgrund von `ECONNREFUSED` oder zufällig fehlenden Produkten.
- [ ] Kritische Verkaufspfade werden nicht still übersprungen.
- [ ] Tests hinter optionalen externen Integrationen verwenden einen expliziten und dokumentierten Env-Guard.
- [ ] Screenshots, Videos und Traces werden nur bei Fehlern erzeugt und bleiben gitignored.
- [ ] CI führt mindestens Chromium, A11y, Auth und Webhook-Tests reproduzierbar aus.

### Prüfung

```sh
pnpm build
E2E_USE_PRODUCTION=true pnpm test:e2e:chromium
E2E_USE_PRODUCTION=true pnpm test:e2e:chromium
E2E_USE_PRODUCTION=true pnpm test:e2e:mobile
E2E_USE_PRODUCTION=true pnpm test:e2e:mobile
pnpm test:integration
```

### Abhängigkeiten

- `DATA-001` ist nicht zwingend erforderlich, verbessert aber Test-Fixtures und Datenbankzugriffe deutlich.
- Sichere Testmode-Secrets für Supabase und Stripe.

---

## OPS-001 — Echte Integrationen Ende-zu-Ende validieren

> **Priorität:** P0 · **Status:** OPEN · **Bereich:** Produktion / Sandbox / Betrieb

### Kontext

Build und lokale Runtime wurden mit absichtlich nicht erreichbaren Dummy-Endpunkten und vorgesehenen Fallbacks geprüft. Damit ist die Codebasis buildfähig, aber die externen Verträge wurden noch nicht vollständig gegen echte Systeme bestätigt.

### Aufgaben

#### Supabase

- [ ] Alle kanonischen Migrationen auf der Zielinstanz auditieren.
- [ ] RLS, Views mit `security_invoker`, RPCs und Storage-Buckets verifizieren.
- [ ] `/api/healthz` gegen eine erreichbare Datenbank mit HTTP 200 prüfen.
- [ ] Backup und Restore mindestens einmal in einer isolierten Umgebung testen.

#### Stripe

- [ ] Testmode-Checkout mit echtem Warenkorb abschließen.
- [ ] Signierten Webhook empfangen und Idempotenz verifizieren.
- [ ] Bestellung, Zahlung, Warenkorbbindung und Bestätigungs-E-Mail prüfen.
- [ ] Fehlerszenarien für ungültige Signatur, doppeltes Event und fehlende Metadaten testen.

#### CJ Dropshipping

- [ ] Produktimport und Variantenmapping mit realem Sandbox- oder kontrolliertem Konto prüfen.
- [ ] Versandquote und Fallback-Verhalten prüfen.
- [ ] Eine Testbestellung an CJ weiterleiten und Statusupdates nachvollziehen.
- [ ] Retry- und Fehlerzustände im Adminbereich prüfen.

#### TikTok Shop

- [ ] OAuth-Verbindung mit einem Test-/Seller-Konto herstellen.
- [ ] Kategorieempfehlung, Bild-Upload und Draft-Listing testen.
- [ ] Preis-, Bestands-, Order-, Return- und Token-Watchdog-Jobs prüfen.
- [ ] Sicherstellen, dass ohne Produkt-, GPSR- und Creative-Freigabe nichts veröffentlicht wird.

#### Cloudflare

- [ ] OpenNext-Build und Deployment in einer Preview-Umgebung prüfen.
- [ ] Worker-, Tunnel-, DNS- und Secret-Bindings verifizieren.
- [ ] Health-, CSP- und Monitoring-Endpunkte über die öffentliche URL prüfen.
- [ ] Rollback-Pfad dokumentiert testen.

#### E-Mail / Resend

- [ ] Absenderdomain, SPF, DKIM und DMARC prüfen.
- [ ] Bestell-, Versand-, Zustell- und Welcome-Mail an Testempfänger senden.
- [ ] Links, HTML-Escaping und mobile Darstellung prüfen.

#### NotebookLM / Governance

- [ ] Governance-Preflight einmal ohne Cache gegen NotebookLM ausführen.
- [ ] Citation-Evidence für alle verpflichtenden Queries bestätigen.
- [ ] Quota-/Resource-Exhausted-Fallback mit vorhandenem Cache prüfen.

### Akzeptanzkriterien

- [ ] Jeder Integrationsbereich besitzt einen dokumentierten erfolgreichen Smoke-Test mit Datum und Umgebung.
- [ ] Es werden ausschließlich Test- oder explizit freigegebene Datensätze verwendet.
- [ ] Keine Integration benötigt manuelle, undokumentierte Schritte für einen Standardlauf.
- [ ] Fehlerszenarien erzeugen nachvollziehbare Logs, Statuswerte und Retry-Möglichkeiten.
- [ ] Der strikte Runtime-Check liefert bei gesunder Datenbank HTTP 200 für `/api/healthz`.
- [ ] Ein vollständiger Testauftrag kann von Produktimport bis Zahlung, Fulfillment und Tracking nachvollzogen werden.

### Prüfung

```sh
pnpm check:env:live
pnpm build:cf
pnpm check:web:runtime:strict
pnpm check:migrations
pnpm check:routes
pnpm test:integration
```

### Abhängigkeiten

- Sichere Sandbox- oder Testzugänge für alle externen Anbieter.
- `TEST-001` für wiederholbare Ende-zu-Ende-Tests.
- Teilweise `AGENT-001` für browserbasierte Supplier- und Shop-Prozesse.

---

## AGENT-001 — `sin-shop-logistic` implementieren

> **Priorität:** P1 · **Status:** BLOCKED · **Bereich:** A2A / MCP / Browser-Automation

### Kontext

Der Registry-Eintrag ist korrekt als nicht verfügbar markiert:

```text
status: blocked
repo.status: missing
runtime: platform/agents/a2a/team-shop/sin-shop-logistic
```

Runtime und Browser-Automator existieren weder im Repository noch im konfigurierten externen Agent-Root. Der Validator darf den Agenten deshalb aktuell nicht als aktiv behandeln.

### Ziel

Ein spezialisierter Shop-Logistik-Agent für:

- Dropshipping-Lieferantenregistrierung
- profitable Produktintegration
- synchronisierte TikTok-Shop-Anbindung
- nachvollziehbare Browser-Automation mit sicheren Human-Gates

### Aufgaben

- [ ] Fachlichen Scope und erlaubte Aktionen dokumentieren.
- [ ] Runtime unter folgendem kanonischen Pfad anlegen:

```text
platform/agents/a2a/team-shop/sin-shop-logistic
```

- [ ] A2A Agent Card, JSON-RPC-, REST- und Health-Endpunkte implementieren.
- [ ] MCP-Transport oder klar dokumentierte Tool-Schnittstelle implementieren.
- [ ] Browser-Automator mit expliziten Flows und überprüfbaren Eingaben anlegen.
- [ ] Login-, CAPTCHA-, Zahlungs-, Veröffentlichungs- und rechtlich relevante Schritte als Human-Gates behandeln.
- [ ] Dry-Run-Modus und Screenshot-/Audit-Artefakte implementieren.
- [ ] Unit-, Contract- und Smoke-Tests ergänzen.
- [ ] Deployment- und Secret-Konfiguration dokumentieren.
- [ ] Registry erst nach erfolgreichem Runtime-Check auf `active` setzen.
- [ ] Google-Docs-/Governance-Sync nach Aktivierung ausführen.

### Akzeptanzkriterien

- [ ] Der konfigurierte Runtime-Pfad existiert und enthält eine startbare Anwendung.
- [ ] `GET /health` ist erfolgreich.
- [ ] Agent Card und OAuth-Client-Metadaten stimmen mit der Registry überein.
- [ ] A2A JSON-RPC und REST besitzen Contract-Tests.
- [ ] Browser-Flows laufen im Dry-Run ohne irreversible Aktion.
- [ ] Irreversible oder externe Veröffentlichungen benötigen eine explizite Freigabe.
- [ ] `pnpm check:browser-automator` bestätigt eine valide aktive Runtime.
- [ ] Registry darf anschließend `status: active` und `repo.status: active` tragen.

### Prüfung

```sh
pnpm check:browser-automator
pnpm test
pnpm -r test
```

### Blocker

- Es existiert noch keine Runtime-Implementierung.
- Erforderliche Shop-, Supplier- und TikTok-Testkonten beziehungsweise Berechtigungen müssen festgelegt werden.

---

## TOOL-001 — Große Tooling- und Pipeline-Skripte modularisieren

> **Priorität:** P1 · **Status:** OPEN · **Bereich:** Tooling / Wartbarkeit

### Kontext

Die Produktionsmodule erfüllen den Line- und Complexity-Guard. Mehrere betriebliche Skripte sind jedoch weiterhin sehr groß und bündeln Parsing, Datenzugriff, Orchestrierung, Provider-Aufrufe und Reporting in einer Datei.

Größte aktuelle Kandidaten:

| Datei | Zeilen |
|---|---:|
| `tooling/scripts/pipeline/openmontage-shop-bridge.mjs` | 804 |
| `tooling/scripts/supabase/seed-products.mjs` | 579 |
| `tooling/scripts/check-governance-preflight.mjs` | 531 |
| `tooling/scripts/sync-sin-a2a-agent-to-gdoc.mjs` | 464 |
| `tooling/scripts/pipeline/enrich-products.mjs` | 436 |
| `tooling/scripts/pipeline/select-top-cj-products.mjs` | 418 |
| `tooling/scripts/pipeline/commerce-worker.mjs` | 349 |
| `tooling/scripts/pipeline/upload-approved-tiktok-videos.mjs` | 338 |
| `tooling/scripts/lib/google-api.mjs` | 335 |

### Aufgaben

#### OpenMontage-Bridge

- [ ] Projekt-/Job-Lesen von Prozessausführung trennen.
- [ ] Checkpoint-Parsing und Approval-Synchronisation in eigene Module verschieben.
- [ ] Render-, Kosten- und Final-Review-Auswertung trennen.
- [ ] Provider-/Filesystem-Abhängigkeiten injizierbar machen.
- [ ] Fehlerfälle mit Unit-Tests abdecken.

#### Seed- und Produktpipeline

- [ ] Seed-Daten von Datenbank-Schreiblogik trennen.
- [ ] Produktnormalisierung, Compliance, Scoring und Persistenz in eigene Module teilen.
- [ ] Idempotenz und Dry-Run als gemeinsame Bibliothek implementieren.
- [ ] Fixtures wiederverwendbar für `TEST-001` machen.

#### Governance und Google-API

- [ ] CLI-Parsing, Auth, API-Zugriff, Dokumentmodell und Rendering trennen.
- [ ] NotebookLM-/Google-spezifische Fehlerklassen vereinheitlichen.
- [ ] Cache- und Live-Modus separat testbar machen.

#### Guardrails

- [ ] Einen eigenen Line-/Complexity-Guard für aktive Tooling-Skripte definieren.
- [ ] Sinnvolle Ausnahmen nur mit Begründung und fixer Baseline zulassen.
- [ ] Keine Änderung an CLI-Kommandos oder Output-Verträgen ohne Migration.

### Akzeptanzkriterien

- [ ] Die genannten Orchestratoren enthalten primär Ablaufsteuerung und keine großen Inline-Implementierungen.
- [ ] Fachliche Helfer besitzen isolierte Tests.
- [ ] Bestehende CLI-Aufrufe bleiben kompatibel oder sind dokumentiert migriert.
- [ ] Dry-Run-Ausgaben und Exit-Codes bleiben stabil.
- [ ] Governance-, Pipeline- und Workspace-Tests sind grün.
- [ ] Ein Tooling-Guard verhindert erneutes unkontrolliertes Anwachsen.

### Prüfung

```sh
pnpm test
pnpm test:unit
pnpm test:integration
pnpm guard:complexity
pnpm -r test
```

---

## Empfohlene Reihenfolge

1. `REPO-001` — Refactor sicher review- und commitfähig machen.
2. `DATA-001` — Datenbankschema statisch typisieren.
3. `TEST-001` — reproduzierbare Browser- und Integrationstests herstellen.
4. `OPS-001` — echte Anbieter- und Produktionsverträge prüfen.
5. `AGENT-001` — fehlenden Logistic-Agenten implementieren.
6. `TOOL-001` — große Betriebswerkzeuge nachhaltig modularisieren.

## Definition of Done für dieses Backlog

Diese Datei kann archiviert oder auf ausschließlich neue Punkte reduziert werden, wenn:

- [ ] alle P0-Issues `DONE` sind,
- [ ] `sin-shop-logistic` entweder implementiert oder bewusst aus der Architektur entfernt wurde,
- [ ] keine aktive Übergangstypisierung für Supabase mehr existiert,
- [ ] Chromium- und Mobile-E2E reproduzierbar grün laufen,
- [ ] alle kritischen externen Integrationen mit dokumentierten Testbelegen validiert sind,
- [ ] die größten aktiven Tooling-Skripte klare Modulgrenzen und Tests besitzen.
