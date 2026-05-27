# Infisical Secrets Import-Anleitung

## Warum diese Datei?

Infisical verschlüsselt alle Secrets **Ende-zu-Ende** (E2EE). Das bedeutet: Selbst mit einem gültigen API-Token können Secrets **nicht direkt** per API/CLI gepusht werden — der Verschlüsselungsschlüssel liegt im Browser.

**Lösung:** Manueller Import via Infisical Web-UI.

---

## Schnell-Import (30 Sekunden)

### Schritt 1: Infisical öffnen
1. Browser: https://eu.infisical.com
2. Einloggen (Google-Account)
3. Projekt: **SIN-Webshop-01** auswählen

### Schritt 2: Zum Import gehen
1. Links im Menü: **"Secrets"** → **"Overview"**
2. Oben rechts: **"Import"** klicken
3. Format wählen: **".env file"**

### Schritt 3: Secrets einfügen
Kopiere den Inhalt von `docs/infisical-secrets.env` (unten) und füge ihn ein.

### Schritt 4: Speichern
1. Auf **"Import"** klicken
2. Secrets werden automatisch geparst und gespeichert
3. Überprüfen: Alle Keys sind jetzt unter `/SIN-Webshop-01` sichtbar

---

## Alternative: Environment Secrets

Falls du verschiedene Umgebungen hast (dev, staging, prod):

1. Oben links: Umgebung wählen (z. B. **"dev"**)
2. Dann Import durchführen
3. Wiederholen für jede Umgebung

---

## Secrets-Datei (kopieren & einfügen)

```
# SIN-Webshop-01 Secrets
# Infisical Path: /SIN-Webshop-01
# Created: 2026-05-27

# --- CJ Dropshipping ---
CJ_API_KEY=d5d074918b1f434995c26af2fc932bb8
CJ_OPEN_ID=37995
CJ_BASE_URL=https://developers.cjdropshipping.com/api2.0/v1
CJ_EMAIL=CJ5240573@api

# --- Stripe (Live) ---
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_THCR4ppa1RMhadpdJR9ziLLjuL7VEqgr
STRIPE_PUBLISHABLE_KEY=pk_live_51TEhmvAZZTxFQVSB9xHz6nOTkXPFaPxIJaNHLjS2xzRsGUwDb3kc8wRILHHB3xP8Kr09vI7qQYClwB7rHuvcm4800BLtK3y0r

# --- Database (VM intern) ---
DATABASE_URL=postgresql://simone:simone123@supabase-db:5433/postgres?sslmode=disable&search_path=shop

# --- Supabase ---
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_JWT_SECRET=aDKJ+tPZvBYR5JrYRpYbsFD/6hsc8BXCRmefE41D

# --- Cloudflare ---
CLOUDFLARE_API_KEY=4d3a15a8dbaaca24904f3e0f4c503b80a1811
CLOUDFLARE_ACCOUNT_ID=1f7ab05e43657db15341b691070ea4c8
CLOUDFLARE_ZONE_ID=3e7ca14550be834b017846ec7f960d16

# --- Resend (E-Mail) ---
RESEND_API_KEY=re_YAnqVXrV_DUsgUHWtdP8FcNWGQfPgLiL6

# --- n8n ---
N8N_ENCRYPTION_KEY=l0NetY+GIrFOauHsXyBj8kyRIYiJ6GTE

# --- App ---
APP_ENV=development
JWT_REQUIRED=false
```

---

## Automatisierung (für die Zukunft)

Für künftige automatische Updates:

1. **Infisical CLI** installieren: https://infisical.com/docs/cli/overview
2. Login: `infisical login`
3. Projekt initialisieren: `infisical init`
4. Secrets pushen: `infisical secrets set --env=dev CJ_API_KEY=d5d074918b1f434995c26af2fc932bb8`

**Hinweis:** Die CLI erfordert einmalige Browser-Authentifizierung für E2EE.

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| "Import button nicht sichtbar" | Stelle sicher, dass du **Owner** oder **Admin** im Projekt bist |
| "Secrets nicht geparst" | Prüfe ob `.env` Format korrekt ist (KEY=VALUE, keine Leerzeichen um =) |
| "Falsche Umgebung" | Wähle oben links die richtige Umgebung (dev/staging/prod) |
| "Token abgelaufen" | Token läuft ab nach ~30 Tagen — neu generieren unter Settings → API Keys |

---

## Kritische Hinweise

⚠️ **Diese Datei enthält LIVE Secrets.**
- Niemals öffentlich committen (ist bereits in `.gitignore` gepflegt)
- Nach Import: Datei lokal sicher löschen oder verschlüsselt speichern
- Token regelmäßig rotieren (alle 90 Tage empfohlen)

---

*Anleitung erstellt: 2026-05-27*
*Für: SIN-Webshop-01 / delqhi.com*
