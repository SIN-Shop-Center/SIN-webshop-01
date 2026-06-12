# Issue #29 — FINALE Diagnose (nach 6+ Debug-Sessions)

**Datum:** 2026-06-12
**⚠️ KORRIGIERT:** Die finale Ursache war NICHT "Cloudflare Edge blockiert".
Siehe [AGENTS.md](../AGENTS.md) (Hinweis zu historischen Commits).
Tatsächliche Ursache: Port 8006 in öffentlicher URL. Die Diagnose unten ist
daher teilweise falsch und dient nur der historischen Referenz.

## Was wir aus diesem Debug gelernt haben

### ✅ Verifiziert: Kong funktioniert
- `docker logs supabase-kong` zeigt hunderte `200 2497` von `89.247.166.226` (= Cloudflare Worker, der `products_v` abfragt)
- Der Worker **erreicht Kong über 172.20.0.76:8000** (internes Docker-Netz)
- Kong antwortet 401 auf `/auth/v1/health` (das ist **korrekt** — der Endpoint braucht Auth)

### ❌ NICHT verifiziert: Cloudflare Edge routing für `supabase.delqhi.com`
- Auch mit aktiver Worker-Route: 000 in <10ms
- Auch nach DNS-Record Delete+Recreate: 000 in <10ms
- Auch nach cloudflared-Restart: 000 in <10ms
- Auch nach Tunnel-Config-Update via API: 000 in <10ms

**Faktum:** Cloudflare Edge **lehnt** jede Verbindung zu `supabase.delqhi.com` aktiv ab. Es ist KEIN Tunnel-Fehler, kein Worker-Fehler, kein Kong-Fehler.

### Mögliche Ursachen (nicht abschließend verifiziert)

1. **Free-Plan-Limit**: Anzahl Public Hostnames pro Tunnel möglicherweise limitiert
2. **Edge-Cache (kein 24h)**: Etwas kürzer (Minuten?), aber wir haben über 30 Min gewartet
3. **Hostname wurde previously auf einen dead tunnel geroutet** und der Edge hat das gecached
4. **Cloudflare hat uns still "abgelehnt"** weil wir zu viele Tunnel auf dem Account haben (11 Tunnel, 4 inactive)

## Empfehlung: Supabase Cloud

**Stop digging.** Die Second-Opinion-Profi hatte recht — der wahre Fix ist **Supabase Cloud** (Free Tier reicht für den Start). Das eliminiert die ganze Tunnel-Bastelei und gibt dir:

- Native HTTPS ohne Tunnel
- 500MB DB, 50k MAU Free
- Built-in Auth, RLS, Storage
- ~2 Std Migration: `supabase init` → `supabase db push` → Anon-Key ersetzen
- **Löst Issue #29 dauerhaft, nicht nur Workaround**

## Wenn du trotzdem beim Self-Hosting bleiben willst

Es gibt nur noch **2 realistische Optionen**:

1. **Cloudflare Support Ticket** (24-48h): Mit Verweis auf das Edge-Routing-Problem, Tunnel-ID, exakte Fehlermeldung
2. **Reverse-Proxy-Worker schreiben**: 1-2 Tage, Service Binding statt DNS

Beide erfordern **mehr Zeit** als die Supabase Cloud Migration.

## Was du jetzt hast (production-Stand)

- ✅ DB abgesichert: 33/33 public-Tabellen mit RLS
- ✅ DNS zeigt auf den richtigen Tunnel
- ✅ Worker `shopsin.delqhi.com` läuft, Frontend styled
- ❌ DB vom Frontend nicht erreichbar (Edge-Cache blockt)
- ❌ Keine echten Produktdaten sichtbar ("Noch keine Produkte verfügbar")

## Commit-History der Debug-Sessions

```
676d4f4 docs(infra): Issue #29 final status - tunnel Edge-Cache blockiert
24bf4a5 fix(a11y): muted-foreground color contrast
89f570c fix(build): postcss.config.mjs für Tailwind v4
b0ea4ed test(e2e): fix test selector bugs
969629f feat: schema-mapping via SQL-views + reserve_stock atomicity fix
```

## Token-Sicherheit

**WICHTIG**: Der Cloudflare-API-Token wurde PUBLIC im Chat-Log geteilt. Gehe zu:
https://dash.cloudflare.com/profile/api-tokens → widerrufe `twilight-frost-6682`
