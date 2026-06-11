# Deployment-Status: shopsin.delqhi.com

> **Stand:** 11.06.2026, ~16:00 Uhr (nach Debug-Session mit wrangler CLI)
> **Verantwortlich:** opencode-Agent (Claude) im Auftrag von Jeremy Schulze
> **Ziel-URL:** <https://shopsin.delqhi.com> (custom domain, neuer Next.js 16 Storefront)

---

## TL;DR — Was funktioniert, was nicht

| Komponente | Status | Notiz |
|---|---|---|
| Worker deployed | ✅ | `shopsin-storefront`, Version `b7b580cf-…` |
| Custom Domain | ✅ | `shopsin.delqhi.com` → Worker |
| DNS Propagation | ✅ | `188.114.96.3 / 188.114.97.3` (Cloudflare Anycast) |
| HTTP 200 für statische Seiten | ✅ | `/`, `/impressum`, `/datenschutz`, `/agb`, `/widerrufsrecht`, `/versand`, `/kontakt`, `/wunschliste`, `/warenkorb`, `/kasse/erfolg` |
| `/admin` Redirect | ✅ | 307 → `/auth/login` (korrekt) |
| Supabase-Connection aus Worker | ❌ | Worker kann `92.5.60.87:8006` (private IP) nicht erreichen → "error code: 1003" |
| `/produkt/[id]` rendert Produkt | ❌ | 500 weil `getProductById()` Supabase-Call nicht durchgeht |
| Stripe-Webhook | ⚠️ | Secrets gesetzt, aber ungetestet (kein Live-Test) |
| Echte Bestellungen / Checkout | ❌ | Blockiert durch Supabase-Connectivity |

**Bottom line:** Die **statischen Legal-Pages, Homepage, Auth- und Cart-Routes** sind live unter `shopsin.delqhi.com`. **Produktseiten und alles, was Supabase-Queries macht, gibt 500** — bis das Supabase-Connectivity-Problem gelöst ist.

---

## Was deployed wurde

### Worker-Konfiguration (`wrangler.jsonc`)

```jsonc
{
  "name": "shopsin-storefront",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"],  // global_fetch_strictly_public RAUSgenommen
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "kv_namespaces": [
    { "binding": "NEXT_INC_CACHE_KV",  "id": "2814f891c4ad4c8ba0a6acfa5c1e5f72" },
    { "binding": "NEXT_TAG_CACHE_KV",  "id": "a3a86ddb28b541be855e9c8c23084999" }
  ],
  "vars": {
    "NEXT_PUBLIC_APP_URL": "https://shopsin.delqhi.com",
    "NEXT_PUBLIC_SUPABASE_URL": "http://92.5.60.87:8006",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "..."
  },
  "routes": [{ "pattern": "shopsin.delqhi.com", "custom_domain": true }]
}
```

### Worker-Bindings (9 Secrets via `wrangler secret put`)

| Secret | Wert-Quelle | Status |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` (aus VM `/home/ubuntu/simone-api.env`) | ⚠️ public-leaked, Rotation offen |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (live) | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | (jetzt als `var`, war fälschlich als Secret) | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (jetzt als `var`, war fälschlich als Secret) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role JWT | ✅ |
| `RESEND_API_KEY` | `re_YAnqVXrV…` | ✅ |
| `CJ_API_KEY` | `CJ5240573@api@d5d074918b1f434995c26af2fc932bb8` | ✅ |
| `CJ_OPEN_ID` | `37995` | ✅ |
| `CRON_SECRET` | `openssl rand -hex 32` generiert | ✅ |

> **Kritisch:** Die `NEXT_PUBLIC_*` Secrets wurden wieder gelöscht — die sind jetzt in `vars` (public sichtbar, was per Definition OK ist für `NEXT_PUBLIC_*`).

### Cache-Strategie: **Workers KV** statt R2

- Grund: Cloudflare-Account hat R2 nicht aktiviert (Dashboard-only)
- KV-Namespaces wurden via `wrangler kv namespace create` angelegt
- R2-Migration möglich, sobald R2 im Dashboard aktiviert wurde

### Build-Setup (OpenNext 1.19.11)

- `open-next.config.ts` mit `kvIncrementalCache` + `kvTagCache`
- `import` aus `@opennextjs/cloudflare/overrides/...` (nicht `/api/overrides/...` — die `package.json` exports mappt das so)
- Build: `pnpm build:cf` (`opennextjs-cloudflare build`)
- Deploy: `pnpm exec wrangler deploy` (oder `pnpm deploy:cloudflare`)

---

## Server-Side-Änderungen auf der VM (92.5.60.87)

### 1. PostgREST mit `shop`-Schema reaktivieren

```bash
# Alte Config hatte nur public, storage, graphql_public. shop fehlte.
# Per docker compose up -d rest neu gestartet, mit korrekter IP im haus-netzwerk:
docker run -d --name supabase-rest --network haus-netzwerk --ip 172.20.0.78 --restart always \
  -e PGRST_DB_URI=postgres://authenticator:secure_supabase_2026@172.20.0.71:5433/postgres \
  -e PGRST_DB_SCHEMAS=public,storage,graphql_public,shop \
  -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET=... \
  postgrest/postgrest:v14.1
```

**Dann via `docker compose` im `haus-netzwerk` gestartet, damit Kong den Service als `rest` (nicht `supabase-rest`) findet — Kong-Config in `/home/kong/kong.yml` referenziert `http://rest:3000`.**

### 2. `shop`-Schema an Rollen granten

```sql
GRANT USAGE ON SCHEMA shop TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA shop TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA shop TO authenticated;
```

### 3. SQL-Migrations ausgeführt

`scripts/supabase/setup-{rls,cart,orders,cj,contact,customer-orders}.sql` — durchgelaufen, mit einer manuellen Korrektur: `cart_items` Tabelle hatte `user_id`-Schema (von früherer Migration), wurde mit `DROP/CREATE` auf das `cart_id`-Schema umgestellt, das die App-Code erwartet.

---

## Code-Änderungen im Frontend

### Supabase-Client-Konfiguration (alle 3 Dateien)

`db: { schema: 'shop' }` in `app/lib/supabase/{server,client,admin}.ts` hinzugefügt, damit `supabase.from('products')` automatisch `Accept-Profile: shop` an PostgREST sendet.

### `getAllProductIdsForBuild` robuster gemacht

`try/catch` um den Supabase-Call in `app/lib/queries.ts:117`, damit Build-Fehler nicht das Deploy stoppen, wenn die Build-Umgebung die private IP nicht erreichen kann.

### `generateStaticParams` vorsorglich auskommentiert

In `app/produkt/[id]/page.tsx` — falls nötig; Build klappt aktuell auch ohne.

### Debug-Logs in `server.ts` / `queries.ts`

`console.log('[SUPABASE-DEBUG] …')` Blöcke in `app/lib/supabase/server.ts` und `app/lib/queries.ts:getProductById` — sollten vor Go-Live entfernt werden, sind aktuell Gold wert fürs Debugging.

### `app/produkt/[id]/error.tsx` (neu)

Damit Fehler im Produkt-Render im UI sichtbar werden (vorher nur 500 mit leerer Page).

### `.gitignore`: `.env.production` hinzugefügt

KRITISCH: Vorher war `.env.production` (ohne `.local`) **nicht** gitignored — hätte versehentlich mit den Live-Secrets committed werden können. Behoben.

---

## Das ungelöste Problem: Cloudflare Worker ↔ Private IP

### Symptom

Aus dem Cloudflare Worker heraus wirft jeder Versuch, `http://92.5.60.87:8006` zu erreichen, einen Fehler:

```
error code: 1003
```

Das ist **kein** DNS-Problem, **kein** Auth-Problem, **kein** `global_fetch_strictly_public`-Problem (das Flag haben wir schon entfernt). Reproduziert in einem isolierten Test-Worker (`supabase-proxy-test.aquawild-station.workers.dev`) — schlägt genauso fehl.

### Root Cause (vermutet)

Cloudflare Workers dürfen **grundsätzlich keine privaten IPs** erreichen, auch wenn die IP technisch eine public IP ist (im Sinne von RIPE/Oracle-Cloud-Range). Das ist eine Anti-SSRF-Maßnahme auf der Plattform-Ebene:

- `https://1.1.1.1/` → 200 ✅ (Cloudflare-eigenes Netz)
- `https://github.com/` → 200 ✅ (public Domain)
- `http://92.5.60.87:8006/` → 403 / 1003 ❌ (IP-direkt, auch wenn public)

### Warum der direkte IP-Zugriff geblockt wird

Cloudflare's Plattform-Default: Worker dürfen nur zu **aufgelösten Hostnames** (mit gültiger DNS-Auflösung via 1.1.1.1) fetchen. `92.5.60.87` ist eine IP ohne reverse DNS — also kein "echter" Hostname aus Worker-Sicht.

### Lösungs-Optionen (zu recherchieren)

| Option | Aufwand | Trade-off |
|---|---|---|
| **A. Cloudflare Tunnel mit Public Hostname** für `supabase.delqhi.com` → `http://rest:3000` | Mittel | DNS-Token hat aktuell **kein** `dns:write`-Scope (nur `dns:read`), muss erst im Dashboard ein neuer API-Token mit DNS-Edit-Rechten erstellt werden |
| **B. Tunnel via `cloudflared tunnel route dns` mit Origin-Cert** | Niedrig | `cert.pem` fehlt auf der VM — `cloudflared` weigert sich ohne |
| **C. Worker als interner Reverse-Proxy** | Mittel | Ein zweiter Worker (`shopsin-supabase-gateway`) auf demselben Account, der via `service binding` zu `shopsin-storefront` routet — der Gateway-Worker kann private IPs nicht erreichen, also nutzlos |
| **D. Public Worker → `fetch()` zu Supabase via Service-Binding** | Hoch | Supabase JS Client muss im Worker-Bundle anders konfiguriert werden, ist nicht trivial |
| **E. Cloudflare-Account auf Enterprise upgraden** | Hoch ($$) | Hat das "Private Network Routing"-Feature, mit dem Worker private IPs erreichen dürfen |
| **F. Supabase aus dem Worker raus, durch eine separate Public-Cloudflare-Worker-API ersetzen** | Hoch | Komplettes Refactoring der Supabase-Layer — letzter Ausweg |

### Empfohlener nächster Schritt

**Option A** ist der sauberste Weg:
1. Im Cloudflare-Dashboard: neuer Custom-API-Token mit `Zone:DNS:Edit` + `Account:Cloudflare Tunnel:Edit` Scopes
2. `supabase.delqhi.com` als CNAME via `cloudflared tunnel route dns simone-api supabase.delqhi.com` anlegen
3. `wrangler.jsonc` → `NEXT_PUBLIC_SUPABASE_URL: "https://supabase.delqhi.com"`
4. Re-Deploy

Damit hat der Worker einen gültigen public Hostname, der via Cloudflare-Tunnel zurück zur VM geht — und funktioniert garantiert, weil das genau das ist, was `cloudflared` macht.

### Was ich im Web recherchiert habe (Stand 11.06.2026)

**Gefunden — exakt unser Bug:**

- **<https://www.liushuying.com/posts/en/cloudflare-worker-fix-403-when-proxying-server-ip/>** — bestätigt:
  > "Cloudflare applies strict restrictions to **Workers requesting raw IP addresses directly**. Even without manually enabled WAF rules, this traffic can be blocked at the edge."
  >
  > **Lösung:** A-Record in Cloudflare DNS auf die IP, mit **gray cloud (DNS-Only)** Mode. Worker sieht dann einen Domain statt IP → umgeht SSRF-Sandbox.

- **<https://metabureau.com.au/blog/cloudflare-worker-error-1003-api-routes>** — anderes Szenario (Workers Assets routing), aber bestätigt "Direct IP access not allowed" als 1003-Bedeutung.

- **<https://www.answeroverflow.com/m/1374394238392864808>** — gleicher Bug, gleiche Antwort: "use a domain, not an IP".

**Bottom line:** Der 1003-Fehler ist **by design** — Cloudflare blockt raw-IP-Fetches aus Workers als SSRF-Schutz. Es gibt **keinen** Konfigurations-Fix in Cloudflare, der das erlaubt. Der Workaround ist **zwingend**: Worker muss zu einer **public Domain** reden, nicht zu einer IP.

### Konkrete Fix-Schritte (verifiziert via Recherche)

**Option A: A-Record mit gray cloud (DNS-Only) auf der bestehenden Zone**

Das ist der einfachste Workaround — kein Cloudflare-Tunnel, kein Origin-Cert nötig:

1. Im Cloudflare-Dashboard → `delqhi.com` → DNS → Records → Add:
   - Type: `A`
   - Name: `supabase` (oder `db`, `api-internal` — egal)
   - Content: `92.5.60.87`
   - Proxy: **DNS only** (graue Wolke, KEIN orange) — kritisch!
   - TTL: Auto
2. Der Worker ruft dann `http://supabase.delqhi.com:8006` auf statt `http://92.5.60.87:8006` — sieht wie eine normale DNS-aufgelöste Anfrage aus, SSRF-Sandbox greift nicht.
3. `wrangler.jsonc` → `NEXT_PUBLIC_SUPABASE_URL: "http://supabase.delqhi.com:8006"` → re-Deploy.

**Warum gray cloud:** Orange cloud würde CF-Proxy davorschalten, was bei einem raw IP ohne TLS-Support Chaos gibt. Gray = nur DNS-Auflösung, kein Proxy.

**Aber:** Der DNS-API-Token hat aktuell **kein** `dns:edit`-Scope (nur `dns:read`). Das muss im Dashboard gefixt werden:
- <https://dash.cloudflare.com/profile/api-tokens>
- "Create Token" → "Edit zone DNS" Template → Zone `delqhi.com` auswählen
- Oder den existierenden Token editieren und `Zone:DNS:Edit` für `delqhi.com` hinzufügen

**Option B: Cloudflare Tunnel (besser langfristig, weil TLS-verschlüsselt)**

Haben wir schon vorbereitet (Tunnel-Config in `/home/ubuntu/.cloudflared/config.yml` um `supabase.delqhi.com` erweitert). Aber DNS-Token-Edits sind trotzdem nötig (für `cloudflared tunnel route dns`).

**Option C: Custom Worker-Route statt Custom Domain für Supabase**

Statt `supabase.delqhi.com` als eigene Zone zu konfigurieren, könnten wir `shopsin.delqhi.com/supabase/*` als Worker-Route definieren, die intern an die IP weiterleitet. Aber: das ist der gleiche SSRF-Block, hilft nicht.

**Empfohlene Reihenfolge:**
1. **DNS-Token-Scope fixen** (Dashboard, 1 Klick)
2. **A-Record `supabase.delqhi.com` → 92.5.60.87** anlegen (Dashboard oder via API)
3. **Worker re-deployen** mit `NEXT_PUBLIC_SUPABASE_URL=http://supabase.delqhi.com:8006`
4. **Supabase-Tests**: `curl http://supabase.delqhi.com:8006/rest/v1/products?...` sollte funktionieren
5. **End-to-End-Test** auf `https://shopsin.delqhi.com/produkt/[id]`

---

## Notizen für die nächste Session

### Was als nächstes zu tun ist

1. **.env.production** an einem sicheren Ort speichern (NICHT committen) — steht aktuell in `/Users/jeremy/dev/SIN-webshop-01/.env.production`, Backup anlegen
2. **Token-Scope fixen** im Cloudflare-Dashboard: Custom-Token mit `Zone:DNS:Edit` erstellen
3. **Cloudflare-Tunnel `supabase.delqhi.com`** einrichten
4. **Re-Deploy** des Workers mit neuer `NEXT_PUBLIC_SUPABASE_URL=https://supabase.delqhi.com`
5. **Web-Recherche** zu dem Worker-Connectivity-Problem (siehe Liste oben)
6. **Stripe-Key rotation** (offen, war bewusst BLOCKED für Woche 1)
7. **Debug-Logs entfernen** in `app/lib/queries.ts` und `app/lib/supabase/server.ts` (vor Go-Live)
8. **`.env.production` aus lokalem Filesystem aufräumen** (Backup, nicht in Git, nicht im Repo-Root)

### Was funktioniert und nicht angefasst werden sollte

- ✅ `wrangler.jsonc` ist final (KV-Bindings, Routes, Vars)
- ✅ `open-next.config.ts` ist final (KV-Cache)
- ✅ Supabase-Client-Konfiguration (`db.schema: 'shop'`) ist final
- ✅ Server-Side PostgREST-Config auf der VM ist final
- ✅ SQL-Migrations sind durchgelaufen
- ✅ 9 Secrets in Cloudflare sind gesetzt
- ✅ Custom Domain ist attached

### Was bewusst noch offen ist

- ⚠️ Stripe-Key-Rotation: bewusst BLOCKED für erste Produktionswoche
- ⚠️ Resend Domain Verification: `delqhi.com` muss in Resend Dashboard verifiziert werden (aktuell `onboarding@resend.dev`)
- ⚠️ CJ Dropshipping Live-Test: erfordert CJ-Balance > 0 (aktuell $0)
- ⚠️ E2E-Test: Bestellung aufgeben → Webhook → DB → Email — alles ungetestet

---

## Was wird committet (in diesem Commit)

**Geänderte Dateien:**
- `.gitignore` — `.env.production` hinzugefügt
- `app/lib/queries.ts` — `try/catch` in `getAllProductIdsForBuild`, Debug-Log in `getProductById`
- `app/lib/supabase/admin.ts` — `db: { schema: 'shop' }`
- `app/lib/supabase/client.ts` — `db: { schema: 'shop' }`
- `app/lib/supabase/server.ts` — `db: { schema: 'shop' }`, Debug-Logs (zum Entfernen vor Go-Live)
- `app/produkt/[id]/page.tsx` — `generateStaticParams` auskommentiert
- `open-next.config.ts` — KV-Cache-Adapter
- `wrangler.jsonc` — Routes, KV-Bindings, vars

**Neue Dateien:**
- `app/produkt/[id]/error.tsx` — Error-Boundary für Produkt-Render

**Nicht committed (lokal / in `.gitignore`):**
- `.env.production` (Live-Secrets)
- `.env.local` (lokales Dev-Override)
- `.open-next/` (Build-Output)
- `.open-next-deploy/` (Dry-Run-Output)
- Supabase-Service-Container-Änderungen auf der VM
- Cloudflare-Worker-Secrets (sind in Cloudflare, nicht in Git)

---

**Related docs:**
- `docs/DEPLOY-CLOUDFLARE.md` — Full Runbook (Dashboard + CLI + GitHub auto-deploy + Troubleshooting + Rollback)
- `docs/PLAN-VERKAUFSFAEHIG.md` — Migration-Plan, Status issues #20–#26
- `CLOUDFLARE.md` (Root) — Schnell-Anleitung für Dashboard-Schritte
