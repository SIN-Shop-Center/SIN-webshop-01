#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="${CLOUDFLARE_WRANGLER_CONFIG:-$ROOT_DIR/workers/cloudflare/wrangler.toml}"
LIVE_URL="${CLOUDFLARE_LIVE_URL:-https://delqhi.com/health}"
CF_EMAIL_VALUE="${CLOUDFLARE_EMAIL:-${CF_API_EMAIL:-${CF_EMAIL:-zukunftsorientierte.energie@gmail.com}}}"

[[ -f "$CONFIG_FILE" ]] || { echo "missing wrangler config: $CONFIG_FILE" >&2; exit 1; }
[[ -n "$CF_EMAIL_VALUE" ]] && export CLOUDFLARE_EMAIL="$CF_EMAIL_VALUE"

echo "Verifying Cloudflare auth..."
npx wrangler whoami >/dev/null

echo "Deploying via Wrangler..."
npx wrangler deploy --config "$CONFIG_FILE"

echo "Verifying live health..."
curl -fsS "$LIVE_URL" | python3 -c "import sys,json; data=json.load(sys.stdin); print('ok=' + str(data.get('ok')) + ', service=' + str(data.get('service')) + ', build=' + str(data.get('buildDate')))"
