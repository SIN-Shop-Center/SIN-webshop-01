# ShopSIN Daten-Reparatur — Komplette Anleitung

## Was du brauchst (1x, 5 Minuten)

1. **Supabase SQL Editor** öffnen (https://supabase.delqhi.com/project/sql)
2. **Ein Script** auf der VM ausführen (`ssh user@92.5.60.87` oder lokal via Docker)

---

## Schritt 1: SQL im Supabase Editor (2 Minuten)

1. Öffne: https://supabase.delqhi.com/project/sql
2. Kopiere den Inhalt von `scripts/supabase/setup-title-de.sql`:

```sql
alter table public.products
  add column if not exists title_de text,
  add column if not exists description_de text;
```

3. Klicke **Run**
4. Erledigt ✅

---

## Schritt 2: Alles automatisch ausführen (3 Minuten)

### Option A: Auf der VM (empfohlen)

```bash
# SSH auf die VM
ssh user@92.5.60.87

# In das Projektverzeichnis
cd /opt/shopsin  # oder wo das Projekt liegt

# Alles ausführen
./scripts/execute-all.sh
```

### Option B: Lokal (falls du den DB-Port tunnelst)

```bash
# DB-Port tunneln
ssh -L 5432:localhost:5432 user@92.5.60.87

# Im anderen Terminal:
cd /Users/jeremy/dev/SIN-webshop-01
./scripts/execute-all.sh
```

### Option C: Schritt für Schritt manuell

```bash
# 1. Env laden
source .env.local

# 2. Backfill (Varianten + Bilder)
node scripts/cj/backfill-product-data.mjs

# 3. Deutsche Titel übersetzen (braucht AI_GATEWAY_API_KEY)
export AI_GATEWAY_API_KEY="vck_..."
node scripts/cj/translate-products.mjs

# 4. Bewertungen importieren
export CRON_SECRET="..."
node scripts/cj/trigger-reviews.mjs
```

---

## Was passiert automatisch?

| Schritt | Was passiert | Dauer |
|---------|-------------|-------|
| SQL | `title_de` + `description_de` Spalten | 2 Sek |
| Backfill | 51 Produkte: Varianten + Bilder | 2 Min |
| Übersetzung | 51 Titel: Englisch → Deutsch | 3 Min |
| Reviews | CJ-Bewertungen importieren | 1 Min |

---

## Was danach noch fehlt (manuell)

1. **CJ-Wallet aufladen** (#31) — bei cjdropshipping.com → Mein Konto → Wallet
2. **Resend-Domain verifizieren** (#33) — bei resend.com → Domains
3. **Sortiment erweitern** — mehr Produkte importieren

---

## Troubleshooting

**Fehler: "column products.title_de does not exist"**
→ SQL aus Schritt 1 wurde nicht ausgeführt. Im Supabase SQL Editor ausführen.

**Fehler: "CJ auth failed"**
→ CJ-API-Key ist abgelaufen. Im CJ Dashboard neuen Key generieren.

**Fehler: "API Gateway error"**
→ `AI_GATEWAY_API_KEY` fehlt. Bei Vercel AI Gateway holen.

**Fehler: "CRON_SECRET fehlt"**
→ In `.env.local` nach `CRON_SECRET` suchen und exportieren.
