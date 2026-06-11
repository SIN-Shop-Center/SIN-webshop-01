#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="${CLOUDFLARE_WRANGLER_CONFIG:-$ROOT_DIR/workers/cloudflare/wrangler.toml}"
WORKER_FILE="$ROOT_DIR/workers/cloudflare/worker.mjs"
LIVE_URL="${CLOUDFLARE_LIVE_URL:-https://delqhi.com/health}"
CF_EMAIL_VALUE="${CLOUDFLARE_EMAIL:-${CF_API_EMAIL:-${CF_EMAIL:-zukunftsorientierte.energie@gmail.com}}}"

[[ -f "$CONFIG_FILE" ]] || { echo "missing wrangler config: $CONFIG_FILE" >&2; exit 1; }
[[ -f "$WORKER_FILE" ]] || { echo "missing worker file: $WORKER_FILE" >&2; exit 1; }
[[ -n "$CF_EMAIL_VALUE" ]] && export CLOUDFLARE_EMAIL="$CF_EMAIL_VALUE"

# WARNING: This is a stub worker. Do not deploy to production without
# implementing full static file serving for the storefront!
if grep -q "STUB\|Coming Soon" "$WORKER_FILE" 2>/dev/null; then
  echo "WARNING: Worker is a stub - production deployment will show placeholder only!" >&2
  echo "Build apps/web first and uncomment [site] in wrangler.toml before deploying." >&2
fi

echo "Verifying Cloudflare auth..."
# Prefer pnpm dlx for consistency with dev:storefront script
if command -v pnpm >/dev/null 2>&1; then
  pnpm dlx wrangler whoami >/dev/null
  WRANGLER="pnpm dlx wrangler"
else
  npx wrangler whoami >/dev/null
  WRANGLER="npx wrangler"
fi

echo "Deploying via Wrangler..."
$WRANGLER deploy --config "$CONFIG_FILE"

echo "Verifying live health..."
curl -fsS "$LIVE_URL" | python3 -c "import sys,json; data=json.load(sys.stdin); print('ok=' + str(data.get('ok')) + ', service=' + str(data.get('service')) + ', build=' + str(data.get('buildDate')))"
