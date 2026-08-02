# ShopSIN Produktions-Setup: externe Konten, Secrets und Abnahmen

> **Stand:** 1. August 2026  
> **Zweck:** Verbindlicher Setup- und Evidenzleitfaden fuer alle externen
> Produktionsblocker. Dieser Guide ersetzt keine Freigabe durch Konto-, Legal-
> oder Operations-Verantwortliche und enthaelt absichtlich keine echten Secrets.

## 1. Grundregeln und Freigabestatus

ShopSIN bleibt **NO-GO fuer Produktion**, solange auch nur eine erforderliche
Abnahme in diesem Dokument offen ist.

- Echte Werte gehoeren ausschliesslich in den freigegebenen Secret Manager, die
  Cloudflare-Worker-Umgebung beziehungsweise einen geschuetzten Release-Kontext.
- Keine Secrets in Git, Shell-History, Screenshots, Tickets, Logs oder Reports.
- `NEXT_PUBLIC_*`-Werte werden beim Build eingebrannt. Jede Aenderung erfordert
  einen neuen Build und Deploy.
- Supabase ist oeffentlich nur als HTTPS-Domain ohne Port erreichbar. Port 5432
  bleibt privat; Port 8006 darf nie in einer oeffentlichen URL stehen.
- TikTok startet immer mit `TIKTOK_SAVE_MODE=AS_DRAFT` und
  `TIKTOK_CONTENT_UPLOAD_ENABLED=false`.
- Unbekannte Hersteller-, GPSR-, Rechts- oder Produkteigenschaften duerfen nicht
  aus Defaults abgeleitet oder erfunden werden.

| Bereich | Technischer Stand | Externe Freigabe durch | Erforderliche Abschluss-Evidenz |
|---|---|---|---|
| Supabase | Code, 37 Migrationen und lokale Tests vorhanden | ShopSIN Operations | Zielmigrationen, RLS, Health, Backup und isolierter Restore belegt |
| Stripe | Checkout und signierter Webhook implementiert | Payments Owner | Checkout, Webhook, Idempotenz, Bestellung und Rueckerstattung abgenommen |
| Resend | Versand und signierter Delivery-Webhook implementiert | Messaging Owner | Domain verifiziert; SPF, DKIM, DMARC und Zustellereignis bestanden |
| CJ Dropshipping | API, Fulfillment, Retry und signierter Webhook implementiert | Supplier Operations | Konto, Wallet, Testorder, Tracking und Fehlerpfad abgenommen |
| TikTok Shop | OAuth, Draft, Sync, Webhook, Order und Returns implementiert | Marketplace Owner | App, Development Shop, Scopes und kompletter Draft-/Order-Test belegt |
| Cloudflare | OpenNext-Konfiguration vorhanden | Platform Operations | Bindings, Secrets, Domain, Smoke, Monitoring und Rollback geprueft |
| GPSR/Hersteller | Produktbezogene harte Publish-Gates vorhanden | Legal/Compliance Owner | Belegquellen und manuelle Freigabe je Produkt vorhanden |
| Rechtstexte | Gemeinsame Storefront-Konfiguration vorhanden | Legal Owner | Unternehmensdaten und Texte fachlich beziehungsweise anwaltlich geprueft |
| Backup/Monitoring | Skripte und Runbooks vorhanden | SRE/Operations | Frisches Backup, Restore-Drill, Alerts und Incident Owner belegt |

## 2. Kanonischer Produktionsvertrag

`.env.live.example` ist die kanonische Namensliste. Reale Werte werden aus den
jeweiligen Anbieter-Dashboards oder der geschuetzten Infrastruktur uebernommen.

### Pflichtwerte fuer den Basisbetrieb

```env
SITE_URL=https://shopsin.delqhi.com
NEXT_PUBLIC_APP_URL=https://shopsin.delqhi.com
CSP_ENFORCE=true

NEXT_PUBLIC_SUPABASE_URL=https://supabase.delqhi.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<secret-manager>
SUPABASE_SERVICE_ROLE_KEY=<secret-manager>
DATABASE_URL=<private-postgresql-url>

STRIPE_SECRET_KEY=<stripe-live-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe-live-publishable>
STRIPE_WEBHOOK_SECRET=<stripe-endpoint-signing-secret>

RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL="ShopSIN <bestellungen@verified-domain>"
RESEND_WEBHOOK_SECRET=<resend-webhook-signing-secret>

CJ_EMAIL=<cj-account-email>
CJ_API_KEY=<cj-api-key>
CJ_WEBHOOK_SECRET=<independent-random-webhook-secret>

CRON_SECRET=<independent-long-random-secret>
```

`NEXT_PUBLIC_LEGAL_PHONE` und `NEXT_PUBLIC_VAT_ID` duerfen erst gesetzt werden,
wenn die Werte fachlich bestaetigt sind. Provider-Secrets und `CRON_SECRET`
muessen unabhaengig voneinander erzeugt beziehungsweise bezogen werden.

### Secret-Verteilung

1. Werte im freigegebenen Secret Manager erfassen.
2. Server-only-Werte als verschluesselte Cloudflare-Worker-Secrets setzen.
3. Oeffentliche Build-Werte als kontrollierte Worker-/CI-Variablen setzen.
4. Release- und Migrationswerte wie `DATABASE_URL` nur dem begrenzten
   Release-Kontext geben, nicht dem Browser oder unnoetigen Laufzeitprozessen.
5. Nach jeder Rotation den betroffenen Build, Webhook oder Provider-Smoke erneut
   ausfuehren und alte Werte beim Anbieter widerrufen.

Der nicht-invasive Namens- und Formatcheck lautet:

```bash
pnpm check:env:template
pnpm check:env:live
```

Die Befehle duerfen nur Presence- und Formatstatus ausgeben, niemals Werte.

## 3. Supabase

### Benoetigte Werte

- `NEXT_PUBLIC_SUPABASE_URL`: oeffentliche HTTPS-Domain ohne Port.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: oeffentlicher Anon-Key fuer RLS-geschuetzte
  Browserzugriffe.
- `SUPABASE_SERVICE_ROLE_KEY`: ausschliesslich serverseitig.
- `DATABASE_URL`: private PostgreSQL-Verbindung nur fuer Migration/Release.

Die kanonische Infrastruktur liegt auf der VM `sin-supabase`; geschuetzte
Serverwerte werden dort aus der vorhandenen Supabase-Konfiguration bezogen und
nicht in das Repository kopiert.

### Einrichtung

1. Sicherstellen, dass Kong unter `https://supabase.delqhi.com` erreichbar ist.
2. Anon- und Service-Role-Key aus derselben Zielinstanz beziehen.
3. Private `DATABASE_URL` fuer den Release-Kontext bereitstellen.
4. Vor jeder produktiven Migration ein Backup erstellen.
5. Migration-Status gegen die Zielinstanz pruefen; ausstehende Migrationen
   zuerst in einer isolierten Umgebung testen und danach kontrolliert anwenden.
6. RLS fuer alle exponierten Tabellen und die Public-Read-Policy der
   Storefront-Views pruefen.

### Abnahme

```bash
pnpm check:migrations
pnpm db:migrate:status
curl -fsS https://supabase.delqhi.com/auth/v1/health
curl -fsS https://shopsin.delqhi.com/api/healthz
```

Zusaetzlich muessen ein Anon-Read auf `shop.products_v`, ein verweigerter
unautorisierter Schreibzugriff und ein isolierter Restore-Test dokumentiert sein.

**NO-GO:** Zielmigrationen unbekannt, RLS nicht belegt, Service Role im
Client-Bundle, oeffentliche DB-Ports oder kein erfolgreicher Restore-Test.

## 4. Stripe

### Benoetigte Werte und Endpunkt

- `STRIPE_SECRET_KEY` aus dem Stripe-Live-Modus (`sk_live_...`).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` aus demselben Live-Konto
  (`pk_live_...`).
- `STRIPE_WEBHOOK_SECRET` vom konkreten Live-Webhook-Endpunkt (`whsec_...`).
- Webhook-URL: `https://shopsin.delqhi.com/api/stripe/webhook`.
- Mindestens das Ereignis `checkout.session.completed` abonnieren.

Test- und Live-Schluessel duerfen niemals gemischt werden. Ein Signing Secret
ist an den konkreten Endpoint und Modus gebunden und darf nicht von einem
anderen Stripe-Webhook uebernommen werden.

### Einrichtung und Abnahme

1. Checkout und Webhook zuerst mit freigegebenen Testmode-Werten in einer
   isolierten Umgebung testen.
2. Live-Webhook im Stripe-Dashboard anlegen und das dort erzeugte Signing Secret
   als `STRIPE_WEBHOOK_SECRET` setzen.
3. Produktionsbuild nach Setzen des Publishable Key neu erstellen.
4. Einen kontrollierten Checkout durchfuehren und im Stripe-Dashboard sowie in
   `shop.orders` abgleichen.
5. Dasselbe Stripe-Ereignis erneut zustellen. Es darf keine zweite Bestellung
   entstehen.
6. Bestellbestaetigung, Fulfillment-Uebergabe und Fehler-/Retry-Status pruefen.
7. Rueckerstattungs- und Support-Ablauf durch den Payments Owner bestaetigen.

```bash
pnpm check:env:live
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://shopsin.delqhi.com/api/cron/health-check
```

**NO-GO:** Webhook liefert nicht 2xx, ungueltige Signatur wird akzeptiert,
Doppelbestellung bei Redelivery, Auszahlungen/Konto nicht freigegeben oder
Checkout und Webhook verwenden verschiedene Modi.

## 5. Resend und E-Mail-Zustellung

### Benoetigte Werte und Endpunkt

- `RESEND_API_KEY` aus dem freigegebenen Resend-Konto.
- `RESEND_FROM_EMAIL` mit einer verifizierten Absenderdomain.
- `RESEND_WEBHOOK_SECRET` vom Resend-Webhook.
- Webhook-URL: `https://shopsin.delqhi.com/api/email/webhook`.

### Einrichtung

1. Absenderdomain im Resend-Dashboard anlegen.
2. Die dort angezeigten, domain- und regionsspezifischen DNS-Werte unveraendert
   in Cloudflare DNS eintragen. MX-, SPF- und DKIM-Werte nicht raten.
3. DMARC fuer die Domain einrichten und den gewuenschten Reporting-Empfaenger
   bestaetigen.
4. Nach erfolgreicher Domain-Verifizierung API-Key und Absender setzen.
5. Delivery-Webhook im Resend-Dashboard anlegen, relevante Zustell-, Bounce-
   und Complaint-Ereignisse abonnieren und dessen Signing Secret setzen.
6. Testmails an mindestens zwei unabhaengige Provider senden und Header pruefen.

### Abnahme

- Resend zeigt die Domain als verifiziert.
- Mail-Header zeigen SPF und DKIM als bestanden; DMARC ist ausgerichtet.
- Ein signiertes Zustellereignis erreicht `/api/email/webhook` mit 2xx.
- Fehlende oder ungueltige Svix-Signatur wird abgelehnt.
- Bounce-/Complaint-Ereignisse werden replay-sicher verarbeitet.

**NO-GO:** `onboarding@resend.dev`, unverifizierte From-Domain, fehlendes
Webhook-Signing-Secret oder keine Zustell-/Bounce-Evidenz.

## 6. CJ Dropshipping

### Benoetigte Werte und Endpunkt

- `CJ_EMAIL` und `CJ_API_KEY` aus dem freigegebenen CJ-Konto.
- `CJ_WEBHOOK_SECRET` als unabhaengiges, langes Secret.
- Webhook-URL: `https://shopsin.delqhi.com/api/webhooks/cj`.
- Erwartete Ereignisse: `order.shipped`, `order.delivered`,
  `order.exception`, `tracking.updated`.

### Einrichtung und Abnahme

1. API-Zugang im CJ-Dashboard aktivieren und Login/Token-Abruf testen.
2. Wallet und Zahlungsmethode durch den Konto-Owner pruefen. Auto-Recharge darf
   nur nach ausdruecklicher finanzieller Freigabe aktiviert werden.
3. Den signierten Webhook auf den kanonischen `/api/webhooks/cj`-Endpoint
   konfigurieren; keine Cron-Route als Webhook verwenden.
4. Mit einem realen Testprodukt Varianten, Einkaufspreis, Versandangebot,
   Lieferland und Lieferzeit pruefen.
5. Kontrollierte Testorder mit Menge groesser eins oder mehreren Positionen
   durchlaufen lassen.
6. Tracking-, Delivered- und Exception-Update sowie Retry nach einem
   absichtlich kontrollierten Providerfehler pruefen.
7. Falsche HMAC-Signatur muss 401 liefern; wiederholtes Ereignis darf keine
   doppelte Statusaktion oder E-Mail erzeugen.

```bash
pnpm pipeline:verify
```

**NO-GO:** Wallet/Zahlungsmethode ungeprueft, Variantenmapping unklar,
Fulfillment nur mit Einzelposition getestet, Webhook unsigniert oder kein
nachweisbarer Retry-/Tracking-Fluss.

## 7. TikTok Shop

### Sichere Startkonfiguration

```env
TIKTOK_SAVE_MODE=AS_DRAFT
TIKTOK_CONTENT_UPLOAD_ENABLED=false
TIKTOK_SERVICE_ID=<partner-center>
TIKTOK_APP_KEY=<partner-center>
TIKTOK_APP_SECRET=<partner-center>
```

- OAuth-Callback:
  `https://shopsin.delqhi.com/api/tiktok/oauth/callback`
- Order-/Event-Webhook:
  `https://shopsin.delqhi.com/api/tiktok/webhook`
- Der authentifizierte Seller-OAuth wird im Adminbereich `/admin/tiktok`
  gestartet. Persistierte Tokens werden nicht aus Reports kopiert.

### Externe Voraussetzungen

1. App beziehungsweise Custom App im TikTok Partner Center genehmigen lassen.
2. Development Shop/Test-Seller bereitstellen.
3. Benoetigte Seller-, Product-, Order-, Fulfillment- und Event-Scopes
   freischalten.
4. Redirect- und Webhook-URL exakt registrieren.
5. Seller-OAuth als MFA-geschuetzter Admin abschliessen.
6. Versanddienstleister-ID, Kategorien und Pflichtattribute mit echten
   Testprodukten validieren.

### Abnahme in dieser Reihenfolge

1. OAuth-State, Token-Austausch und Shop-Cipher pruefen.
2. Ein vollstaendig verifiziertes Produkt als **Draft** erzeugen.
3. Titel, Bilder, Kategorieattribute, Preis, Bestand, Hersteller und GPSR im
   Seller Center vergleichen.
4. Development-Shop-Order mit mehreren Positionen/Mengen testen.
5. CJ-Uebergabe, Tracking, Storno und Retoure pruefen.
6. Webhook-Redelivery auf Replay-Sicherheit pruefen.
7. Content Upload nur nach gesonderter API-Freigabe aktivieren und weiterhin als
   Draft behandeln.
8. `TIKTOK_SAVE_MODE=LISTING` erst nach dokumentierter menschlicher Freigabe
   und erfolgreicher Gesamt-Abnahme setzen.

**NO-GO:** keine Development-Shop-Evidenz, fehlende Scopes, unbekannte
Kategorieattribute, unvollstaendige GPSR-Daten oder direkter Listing-Modus vor
Abnahme.

## 8. Cloudflare, Domain und Deployment

1. Worker, R2-/D1-Bindings und Custom Domain gemaess
   `docs/DEPLOY-CLOUDFLARE.md` bereitstellen.
2. Server-Secrets verschluesselt setzen; Build-Variablen kontrolliert setzen.
3. Sicherstellen, dass keine Worker-Route `supabase.delqhi.com/*` uebernimmt.
4. Nach Aenderungen an `NEXT_PUBLIC_*` immer neu bauen.
5. Preview, Produktionsdeploy, Domain, TLS, CSP und alle externen Callback-URLs
   pruefen.
6. Vor Freigabe einen bekannten funktionierenden Worker-Stand und den
   Rollback-Verantwortlichen dokumentieren.

**NO-GO:** fehlende Bindings, unbekannter Secret-Stand, keine Custom Domain,
kein Rollback oder Produktionsdeploy ohne erfolgreiches Release-Gate.

## 9. GPSR, Hersteller und EU-Verantwortliche

Fuer jedes veroeffentlichbare Produkt muessen im Adminbereich
`/admin/freigaben` mindestens folgende Daten manuell geprueft werden:

- Herstellername, Adresse und E-Mail,
- EU-Verantwortlicher mit Name, Adresse und E-Mail,
- HTTPS-Belegquelle fuer Hersteller und EU-Verantwortlichen,
- produktbezogene Sicherheits-/Compliance-Informationen,
- gesetzter Pruefzeitpunkt `gpsr_verified_at`.

Die technischen Publish-Gates verlangen `manufacturer_verified`,
`responsible_person_verified` und `gpsr_verified_at`. Ein pauschaler Firmenwert
ist kein produktbezogener Nachweis.

**NO-GO:** fehlende Quelle, unklare Identitaet, nur vermutete Daten oder
Freigabe ohne fachlich verantwortliche Person.

## 10. Rechtstexte und Unternehmensdaten

Der Legal Owner muss Impressum, Datenschutz, AGB, Widerruf, Kontakt-, Steuer-
und Unternehmensdaten gegen den tatsaechlichen Betreiber pruefen. Insbesondere
sind Adresse, verantwortliche Person, E-Mail, Telefon und Umsatzsteuer-ID zu
bestaetigen. Erst danach duerfen optionale oeffentliche Werte gesetzt werden.

Abnahme umfasst die gerenderten Seiten:

- `/impressum`
- `/datenschutz`
- `/agb`
- `/widerrufsrecht`
- `/kontakt`
- `/versand`

**NO-GO:** Platzhalter, widerspruechliche Betreiberangaben oder keine
fachliche/anwaltliche Freigabe.

## 11. Backup, Restore, Monitoring und Incident-Verantwortung

Die vorhandenen Skripte und Runbooks sind erst dann Produktionsnachweis, wenn
sie gegen die Zielumgebung ausgefuehrt wurden:

- `tooling/scripts/ops/backup-shop-db.sh`
- `tooling/scripts/ops/restore-shop-db.sh`
- `tooling/scripts/ops/monitor-vm.sh`
- `tooling/scripts/ops/alert.sh`
- `docs/RUNBOOK-BACKUP-RESTORE.md`
- `docs/RUNBOOK-MONITORING.md`

Erforderlich sind:

1. taegliches verschluesseltes beziehungsweise zugriffsgeschuetztes Backup,
2. getrennte Offsite-Kopie und dokumentierte Aufbewahrung,
3. SHA256-/Integritaetspruefung,
4. Restore in einen isolierten Test-Postgres,
5. belegte RTO-/RPO-Messung,
6. Uptime-/Deep-Health-Monitore und Queue-Heartbeats,
7. erfolgreich ausgeloester Testalarm,
8. benannter Incident Owner und Eskalationsweg.

**NO-GO:** nur vorhandenes Skript ohne Laufnachweis, kein Restore-Drill,
Alerts ohne Empfaenger oder keine verantwortliche Person.

## 12. Verbindliches Abschluss-Gate

Nach Abschluss aller externen Setups in einem autorisierten Release-Kontext:

```bash
pnpm check:env:template
pnpm check:env:live -- --with-smoke
pnpm pipeline:verify
pnpm db:migrate:status
pnpm run ci
pnpm test:e2e
pnpm check:web:runtime:strict
pnpm smoke:go-live
pnpm go-live:today
```

Ein Fehler stoppt die Freigabe. Externe Abnahmen duerfen nicht durch Mockwerte,
lokale Fallbacks oder manuell geaenderte Testresultate ersetzt werden.

## 13. Evidenzprotokoll

Pro Anbieter beziehungsweise Bereich ist mindestens zu dokumentieren:

- Datum und verantwortliche Person,
- Zielkonto/Zielumgebung ohne Secret-Werte,
- konfigurierte Endpunkte und Ereignisse,
- ausgefuehrte Checks mit Exit-Code beziehungsweise Provider-Event-ID,
- Screenshots nur ohne Tokens, Keys, personenbezogene Bestelldaten oder
  Zahlungsdetails,
- Ergebnis und offene Restpunkte,
- Rollback-/Rotationsschritt.

Die Freigabe ist erst abgeschlossen, wenn `issues.md` von `OPS-001 BLOCKED` auf
einen belegten Review-/Done-Status aktualisiert wurde.
