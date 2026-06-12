# AGENTS.md — SIN-webshop-01 (ShopSIN)

Anweisungen für KI-Agenten und Entwickler. Lies dies VOLLSTÄNDIG, bevor du
Infrastruktur- oder Datenbank-Änderungen vornimmst.

PROJECT_NOTEBOOK_ID=sin-webshop-01-main
SOURCE_COUNT_REQUIRED=3

nlm notebook query "$PROJECT_NOTEBOOK_ID" "SIN-webshop-01 architecture overview" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Supabase self-hosted setup at 92.5.60.87" --json
nlm notebook query "$PROJECT_NOTEBOOK_ID" "Cloudflare Workers OpenNext deployment" --json

## Systemübersicht

| Komponente | Wo | URL / Adresse |
|---|---|---|
| Storefront (Next.js via OpenNext) | Cloudflare Workers | https://shopsin.delqhi.com |
| Supabase (self-hosted, Docker) | VM 92.5.60.87 | https://supabase.delqhi.com (öffentlich via Cloudflare Tunnel) |
| Kong API Gateway | VM, intern | Port **8006** (NUR intern — siehe Regeln) |
| Postgres | VM, privat | Port 5432 — NIEMALS öffentlich exponieren |
| simone-api / simone-worker | VM, Docker | intern |
| Supabase Studio | VM | hinter Cloudflare Access (Zero Trust Login) |

## EISERNE REGELN (aus teuren Fehlern gelernt)

1. **NIEMALS einen Port in öffentliche URLs schreiben.**
   Cloudflare proxied NUR die Ports 80/443/8080/8443/2052/2053/2082/2083/2086/2087/2095/2096/8880.
   `https://supabase.delqhi.com:8006` wird am Edge INSTANT abgewiesen
   ("connection refused in <10ms"). Das ist KEIN Edge-Cache und KEIN Bug —
   dokumentiertes Verhalten: https://developers.cloudflare.com/fundamentals/reference/network-ports/
   Port 8006 gehört ausschließlich in die Tunnel-Ingress-Config (Edge → localhost:8006).

2. **`NEXT_PUBLIC_*` Variablen sind BUILD-TIME eingebrannt.**
   Env-Var ändern reicht nicht — es braucht zwingend einen neuen Build + Deploy.

3. **Keine Worker-Route auf `supabase.delqhi.com/*` anlegen.**
   Worker-Routes haben Vorrang vor Tunnel-Hostnames und blockieren den Tunnel
   komplett. Zusätzlich: Worker-Fetch auf same-zone Worker-Hostnames erzeugt
   Error 1042. Falls serverseitige Fetches auf eigene Zone nötig sind:
   Compatibility Flag `global_fetch_strictly_public` in wrangler.jsonc.

4. **RLS ist default-deny auf allen Tabellen.**
   Neue Tabellen: SOFORT `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
   Öffentlich lesbare Shop-Daten brauchen explizite SELECT-Policies
   (`USING (true)`), nutzerbezogene Daten `auth.uid() = user_id`.

5. **`SERVICE_ROLE_KEY` niemals im Client-Code oder mit `NEXT_PUBLIC_`-Prefix.**
   Nur in Server-Kontexten (Route Handlers, Server Actions).

6. **Supabase-Client-Architektur (NICHT ändern ohne Grund):**
   - `app/lib/supabase/data-client.ts` — purer `@supabase/supabase-js` Client
     mit `auth: { persistSession: false }`. Für ALLE öffentlichen, anonymen
     Lesezugriffe (getFeaturedProducts, getAllProducts, getProductById,
     getProductsByIds). Grund: `@supabase/ssr` ruft `cookies()` aus
     `next/headers` auf, was in Cloudflare Workers außerhalb von
     Request-Kontexten fehlschlägt und Queries stillschweigend leer macht.
   - `@supabase/ssr` Client (`app/lib/supabase/server.ts`) — NUR für
     auth-gebundene Operationen (Login, Wishlist, Orders), die in echten
     Request-Kontexten laufen.

7. **Secrets:** Niemals die Default-Secrets aus der Supabase-Docker-Doku
   verwenden (öffentlich bekannt, werden aktiv gescannt). JWT_SECRET,
   POSTGRES_PASSWORD, Dashboard-Credentials sind rotiert. ANON_KEY und
   SERVICE_ROLE_KEY werden aus dem JWT_SECRET abgeleitet — bei Rotation des
   JWT_SECRET müssen beide Keys neu generiert und ÜBERALL ersetzt werden
   (Supabase .env + Frontend-Secrets + Rebuild).

## Environment-Variablen

### Frontend (Cloudflare Workers Secrets / Build-Env)
```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.delqhi.com   # https, KEIN Port
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # nur serverseitig
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Supabase VM (docker/.env, Auszug der kritischen)
```
SUPABASE_PUBLIC_URL=https://supabase.delqhi.com
API_EXTERNAL_URL=https://supabase.delqhi.com
SITE_URL=https://shopsin.delqhi.com
ADDITIONAL_REDIRECT_URLS=https://shopsin.delqhi.com/**
PGRST_DB_SCHEMAS="public, storage, shop"
```

### Infisical (Primary Secrets Manager)
```
infisical export --domain https://eu.infisical.com \
  --project-id fa7758b4-f84c-4297-966e-710056d531ef \
  --path /SIN-Webshop-01 --env dev -f .env
```

## Smoke-Tests (vor jedem "fertig")

```bash
# Tunnel + Kong erreichbar (401 ohne Key = gesund)
curl -i https://supabase.delqhi.com/auth/v1/health

# Produkte via REST (RLS public-read greift, Schema: shop)
curl -s "https://supabase.delqhi.com/rest/v1/products_v?select=id,title,price&limit=3" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept-Profile: shop"

# RLS-Negativtest: darf NIE fremde Orders liefern
curl -s "https://supabase.delqhi.com/rest/v1/orders?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
# Erwartet: [] oder 401/403

# Postgres privat
nc -zv supabase.delqhi.com 5432   # MUSS fehlschlagen

# Storefront live
curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/   # 200
```

## Debugging-Leitfaden

| Symptom | Wahrscheinliche Ursache |
|---|---|
| `connection refused` in <10ms auf supabase.delqhi.com | Port in der URL ODER Worker-Route davor — NICHT "Edge-Cache" |
| 502 vom Tunnel | Ingress-Service-URL falsch (localhost:8006 vs kong:8006) |
| 404 vom Tunnel | Hostname fehlt in Ingress des LAUFENDEN Tunnels (locally vs remotely managed prüfen) |
| Leere Produktlisten trotz erreichbarer API | (a) SSR-Client statt data-client benutzt, (b) RLS-SELECT-Policy fehlt, (c) alter Build mit eingebrannter falscher URL |
| Auth-Mails mit falschen Links | SITE_URL / API_EXTERNAL_URL in Supabase .env falsch |
| Error 1042 bei Server-Fetch | Same-zone Worker-Fetch → `global_fetch_strictly_public` Flag |

## Hinweis zu historischen Commits

Commits mit der Diagnose "Cloudflare Edge cached/blockt supabase.delqhi.com"
(u.a. 5073007, 676d4f4) sind FALSCH diagnostiziert. Tatsächliche Ursache:
Port 8006 in der öffentlichen URL. Nicht dieser Spur folgen.
