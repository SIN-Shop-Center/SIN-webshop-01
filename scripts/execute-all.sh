#!/bin/bash
# Purpose: One-command execution for all DB fixes and backfills
# Usage: ./scripts/execute-all.sh
# Requirements: psql or Supabase SQL Editor access, node.js
# Docs: EXECUTE.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 ShopSIN vollständige Daten-Reparatur"
echo "========================================"
echo ""

# ── 1. SQL ausführen (title_de Spalten) ──────────────────────────────────
echo "1️⃣  SQL: Deutsche Titel-Spalten anlegen..."
echo ""
echo "   Option A: Supabase SQL Editor"
echo "   → Öffne https://supabase.delqhi.com/project/sql"
echo "   → Kopiere den Inhalt von: scripts/supabase/setup-title-de.sql"
echo "   → Klicke 'Run'"
echo ""
echo "   Option B: psql (falls du direkten DB-Zugang hast)"
echo "   → psql \"$DATABASE_URL\" -f scripts/supabase/setup-title-de.sql"
echo ""
read -p "   ⏳ Drücke ENTER, wenn das SQL ausgeführt wurde..."
echo ""

# ── 2. Backfill: Varianten + Bilder ────────────────────────────────────────
echo "2️⃣  Backfill: CJ-Produktdaten (Varianten + Bilder)..."
cd "$PROJECT_ROOT"
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|CJ_EMAIL|CJ_API_KEY)=' | xargs)
fi

node scripts/cj/backfill-product-data.mjs --dry-run 2>&1 | head -20 || true
echo ""
read -p "   🟡 Trockenlauf OK? Dann ENTER für echte Ausführung (oder Ctrl+C) ..."
echo ""
node scripts/cj/backfill-product-data.mjs 2>&1 | tail -30
echo ""

# ── 3. Deutsche Titel übersetzen ──────────────────────────────────────────
echo "3️⃣  Übersetzung: Englische Titel → Deutsch via AI Gateway..."
if [ -z "${AI_GATEWAY_API_KEY:-}" ]; then
  echo "   ⚠️  AI_GATEWAY_API_KEY nicht gesetzt."
  echo "   → Hole einen Key bei https://vercel.com/ai-gateway"
  echo "   → export AI_GATEWAY_API_KEY='vck_...'"
  echo "   → Oder überspringe diesen Schritt (Titel bleiben englisch)"
  echo ""
  read -p "   ⏳ ENTER zum Überspringen, oder setze den Key und drücke ENTER..."
fi

if [ -n "${AI_GATEWAY_API_KEY:-}" ]; then
  node scripts/cj/translate-products.mjs 2>&1 | tail -30
else
  echo "   ⚠️  Übersetzung übersprungen (kein AI_GATEWAY_API_KEY)"
fi
echo ""

# ── 4. Bewertungen importieren ────────────────────────────────────────────
echo "4️⃣  Bewertungen: CJ-Reviews importieren..."
if [ -z "${CRON_SECRET:-}" ]; then
  if [ -f .env.local ]; then
    CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2 | tr -d '"' || true)
  fi
fi

if [ -n "${CRON_SECRET:-}" ]; then
  export CRON_SECRET
  node scripts/cj/trigger-reviews.mjs 2>&1
else
  echo "   ⚠️  CRON_SECRET nicht gefunden."
  echo "   → Manueller Aufruf: curl -H \"Authorization: Bearer DEIN_CRON_SECRET\" https://shopsin.delqhi.com/api/cron/cj-reviews"
fi
echo ""

# ── 5. Verifizierung ─────────────────────────────────────────────────────
echo "5️⃣  Verifizierung: Prüfe Ergebnisse..."
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)=' | xargs)
fi

ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2 | tr -d '"' || true)

# Produkte mit deutschen Titeln
echo "   Produkte mit title_de:"
curl -s "https://supabase.delqhi.com/rest/v1/products?select=count&title_de=not.is.null" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Accept-Profile: shop" \
  -H "Range: 0-0" \
  -H "Prefer: count=exact" \
  -D - 2>&1 | grep -i "content-range" || echo "   (keine deutschen Titel gefunden)"

# Produkte mit Varianten
echo "   Produkte mit Varianten:"
curl -s "https://supabase.delqhi.com/rest/v1/products?select=count&variants=neq.{}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Accept-Profile: shop" \
  -H "Range: 0-0" \
  -H "Prefer: count=exact" \
  -D - 2>&1 | grep -i "content-range" || echo "   (keine Varianten gefunden)"

# Bewertungen
echo "   Bewertungen:"
curl -s "https://supabase.delqhi.com/rest/v1/reviews?select=count" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Accept-Profile: shop" \
  -H "Range: 0-0" \
  -H "Prefer: count=exact" \
  -D - 2>&1 | grep -i "content-range" || echo "   (keine Bewertungen)"

echo ""
echo "✅ Fertig!"
echo ""
echo "📋 Nächste Schritte (manuell):"
echo "   1. CJ-Wallet aufladen: https://cjdropshipping.com → Mein Konto → Wallet"
echo "   2. Resend-Domain verifizieren: https://resend.com → Domains → delqhi.com"
echo "   3. Cloudflare Cache leeren: wrangler deploy (bereits automatisch)"
echo ""
