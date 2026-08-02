# ShopSIN Supabase — Anleitung für Agenten

Diese Anleitung ist für Agenten, die Änderungen an der ShopSIN-Datenbank
(Supabase self-hosted auf `sin-supabase`) vornehmen müssen. Lies sie VOLLSTÄNDIG,
bevor du irgendein SQL ausführst. Die Fehler, die hier beschrieben sind, hat ein
anderer Agent schon gemacht — mach sie nicht nochmal.

## 0. TL;DR (das Wichtigste)

- DB läuft in einem Docker-Container auf der VM `sin-supabase` (92.5.60.87).
- Produkte-Tabelle heißt **`shop.products`**, NICHT `public.products`.
- SQL führst du per **SSH + `docker exec` + `psql`** aus. Nicht über die Cloud-Console,
  nicht über `supabase`-CLI (ist lokal nicht installiert).
- Schema-Name im Code ist `shop` (siehe `PGRST_DB_SCHEMAS="public, storage, shop"`).

## 1. Zugang zur VM

```bash
ssh sin-supabase   # Alias in ~/.ssh/config, Key ~/.ssh/id_ed25519
```

VM-Details (aus skill-oci-oracle-cloud):
- Host: `92.5.60.87`, User `ubuntu`, ARM64, 24 GB RAM
- Docker-Container mit Postgres: `supabase-db`
- Supabase-Env auf VM: `/opt/sin-supabase/.env`

## 2. Wie du SQL ausführst (kanonischer Weg)

```bash
ssh sin-supabase 'docker exec -i supabase-db psql -U postgres -d postgres' <<'EOF'
-- dein SQL hier
EOF
```

Beispiel — Spalte prüfen:

```bash
ssh sin-supabase 'docker exec -i supabase-db psql -U postgres -d postgres -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='"'"'shop'"'"' AND table_name='"'"'products'"'"'
  ORDER BY column_name;"'
```

## 3. Fallstricke (LIES!)

### 3.1 FALSCHES SCHEMA
Die Produkte-Tabelle liegt im Schema **`shop`**, nicht in `public`.
`public.products` existiert NICHT. Ein `ALTER TABLE public.products ...` endet mit:
```
ERROR:  relation "public.products" does not exist
```
Immer `shop.products` verwenden. Die abgeleitete View heißt `shop.products_v`.

### 3.2 Container-Name
Der Postgres-Container heißt `supabase-db` (nicht `postgres`, nicht `db`).
Prüfen: `docker ps --format "{{.Names}}" | grep -i db`

### 3.3 Kein supabase-CLI
Lokal ist das `supabase`-CLI nicht installiert. Migrations NICHT via
`supabase db push` ausführen. Entweder per `docker exec psql` (siehe §2)
oder die SQL-Datei im Supabase SQL Editor (hinter Cloudflare Access) einfügen.

### 3.4 RLS (Row Level Security)
Alle Tabellen haben RLS aktiv (default-deny). Als `postgres`-User im Container
umgehst du RLS komplett — das ist für Migrationen korrekt. Aber: im
Applikations-Code (Next.js) darfst du RLS nicht umgehen. Neue Tabellen im Code
müssen SOFORT `ENABLE ROW LEVEL SECURITY` + passende Policies bekommen.

### 3.5 NEXT_PUBLIC_ ist build-time
Änderungen an Env-Vars im Frontend erfordern einen neuen Build + Deploy.
Reines ändern der Variable reicht nicht.

## 4. Migrationen im Repo

Migrations liegen in `platform/infra/supabase/migrations/`. Dateiname:
`YYYYMMDDHHMMSS_<thema>.sql`. Immer `IF NOT EXISTS` verwenden, damit
wiederholtes Ausführen sicher ist.

Ablauf für eine neue Spalte:
1. Migration-Datei im Repo anlegen (mit `shop.products`!).
2. SQL per `docker exec psql` auf der VM ausführen (siehe §2).
3. Ggf. TypeScript-Typen / Code anpassen, die die Spalte nutzen.
4. Build + Deploy (Cloudflare Workers via `pnpm run deploy:cloudflare`).

## 5. Wichtige Tabellen (Stand 2026-07)

| Tabelle | Schema | Zweck |
|---|---|---|
| `products` | `shop` | Haupt-Produkttabelle (CJ + TikTok-Felder) |
| `products_v` | `shop` | Read-View für Storefront (RLS public-read) |
| `tiktok_auth` | `public` | TikTok OAuth-Token-Cache |
| `tiktok_orders` | `public` | TikTok-Bestell-Tracking |
| `cj_auth` | `public` | CJ API-Token-Cache |
| `orders` | `shop`/`public` | Kundenbestellungen |

## 6. Supabase-Clients im Code (nicht ändern ohne Grund)

- `src/lib/supabase/data-client.ts` — anon, `persistSession: false`. Für
  öffentliche Lesezugriffe. Funktioniert in Cloudflare Workers.
- `src/lib/supabase/server.ts` — `@supabase/ssr`, nur für auth-gebundene
  Operationen in Request-Kontexten.
- `src/lib/supabase/admin.ts` — Service-Role, nur serverseitig.

## 7. Smoke-Test nach DB-Änderung

```bash
# Tunnel + Kong erreichbar?
curl -i https://supabase.delqhi.com/auth/v1/health

# Produkte lesbar (RLS public-read)?
curl -s "https://supabase.delqhi.com/rest/v1/products_v?select=id,title,price&limit=3" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept-Profile: shop"

# Storefront live?
curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/
```

## 8. Notfall

- DB direkt nicht aus dem Internet erreichbar (Port 5432 geblockt). Immer über SSH.
- Postgres-Credentials: `/opt/sin-supabase/.env` auf der VM (`POSTGRES_PASSWORD`,
  `POSTGRES_HOST=db`, `POSTGRES_DB=postgres`).
- Nie `docker compose down` auf der DB ohne Backup.

---

*Geschrieben nachdem ein Agent `public.products` statt `shop.products` nutzte
und die Migration fehlschlug. Merk dir: Schema ist `shop`.*
