#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_FILE="$ROOT_DIR/workers/cloudflare/worker.mjs"
WORKER_NAME="${CLOUDFLARE_WORKER_NAME:-simone-worldbest-shop}"
COMPATIBILITY_DATE="${CLOUDFLARE_COMPATIBILITY_DATE:-2026-02-26}"
WRANGLER_CONFIG_DEFAULT="$HOME/Library/Preferences/.wrangler/config/default.toml"
WRANGLER_CONFIG_LEGACY="$HOME/.wrangler/config/default.toml"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-3e7ca14550be834b017846ec7f960d16}"
ROUTE_PATTERN="${CLOUDFLARE_ROUTE_PATTERN:-delqhi.com/*}"

if [[ ! -f "$WORKER_FILE" ]]; then
  echo "Missing worker file: $WORKER_FILE" >&2
  exit 1
fi

cf_auth_header() {
  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    printf 'Authorization: Bearer %s' "$CLOUDFLARE_API_TOKEN"
    return 0
  fi
  if [[ -n "${CLOUDFLARE_API_KEY:-}" && -n "${CLOUDFLARE_EMAIL:-${CF_API_EMAIL:-${CF_EMAIL:-}}}" ]]; then
    printf 'X-Auth-Key: %s\nX-Auth-Email: %s' "$CLOUDFLARE_API_KEY" "${CLOUDFLARE_EMAIL:-${CF_API_EMAIL:-${CF_EMAIL:-}}}"
    return 0
  fi
  local config_path=""
  for candidate in "$WRANGLER_CONFIG_DEFAULT" "$WRANGLER_CONFIG_LEGACY"; do
    if [[ -f "$candidate" ]]; then
      config_path="$candidate"
      break
    fi
  done
  if [[ -n "$config_path" ]]; then
    local token=""
    token="$(awk -F'"' '/oauth_token/{print $2}' "$config_path" | head -n 1)"
    if [[ -n "$token" ]]; then
      printf 'Authorization: Bearer %s' "$token"
      return 0
    fi
  fi
  return 1
}

CF_AUTH_HEADERS=()
while IFS= read -r header; do
  [[ -n "$header" ]] && CF_AUTH_HEADERS+=("$header")
done < <(cf_auth_header || true)

if [[ ${#CF_AUTH_HEADERS[@]} -eq 0 ]]; then
  echo "No usable Cloudflare auth found. Set CLOUDFLARE_API_TOKEN, or CLOUDFLARE_API_KEY plus CLOUDFLARE_EMAIL, or login with Wrangler first." >&2
  exit 1
fi

verify_payload="$(
  curl -sS "${CF_AUTH_HEADERS[@]/#/-H }" https://api.cloudflare.com/client/v4/user/tokens/verify || true
)"

if [[ "$verify_payload" == *'"success":false'* && "$verify_payload" == *'Invalid API Token'* ]]; then
  echo "Cloudflare auth is present but the current token is invalid. Refresh Wrangler login or provide a fresh CLOUDFLARE_API_TOKEN." >&2
  exit 1
fi

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
if [[ -z "$ACCOUNT_ID" ]]; then
  ACCOUNT_ID="$(
    curl -fsS "${CF_AUTH_HEADERS[@]/#/-H }" \
      https://api.cloudflare.com/client/v4/memberships \
      | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['result'][0]['account']['id'])"
  )"
fi

echo "Deploying worker '$WORKER_NAME' to account '$ACCOUNT_ID'..."

DEPLOY_RESPONSE="$(
  curl -fsS -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" \
    "${CF_AUTH_HEADERS[@]/#/-H }" \
    -F "metadata={\"main_module\":\"worker.mjs\",\"compatibility_date\":\"$COMPATIBILITY_DATE\",\"compatibility_flags\":[\"nodejs_compat\"]};type=application/json" \
    -F "worker.mjs=@$WORKER_FILE;type=application/javascript+module"
)"

DEPLOY_OK="$(
  printf "%s" "$DEPLOY_RESPONSE" | python3 -c "import sys,json; print(str(json.load(sys.stdin).get('success', False)).lower())"
)"
if [[ "$DEPLOY_OK" != "true" ]]; then
  echo "Cloudflare deploy API returned failure:" >&2
  printf "%s\n" "$DEPLOY_RESPONSE" >&2
  exit 1
fi

SUBDOMAIN="$(
  curl -fsS "${CF_AUTH_HEADERS[@]/#/-H }" \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/subdomain" \
    | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['result']['subdomain'])"
)"

LIVE_URL="https://${WORKER_NAME}.${SUBDOMAIN}.workers.dev"
echo "Workers URL candidate: $LIVE_URL"

# Enable workers.dev for this script (best effort, some accounts still return 1042 for workers.dev access).
curl -fsS -X POST \
  "${CF_AUTH_HEADERS[@]/#/-H }" \
  -H "Content-Type: application/json" \
  --data '{"enabled":true}' \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME/subdomain" \
  >/dev/null || true

echo "Health check on workers.dev..."
if curl -fsS "$LIVE_URL/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok=' + str(d.get('ok')) + ', service=' + str(d.get('service')))"; then
  echo "Deploy complete."
  exit 0
fi

echo "workers.dev check failed. Falling back to zone route: $ROUTE_PATTERN"

ROUTE_EXISTS="$(
  curl -fsS "${CF_AUTH_HEADERS[@]/#/-H }" \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/workers/routes" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); p='$ROUTE_PATTERN'; s='$WORKER_NAME'; print(any((r.get('pattern')==p and r.get('script')==s) for r in d.get('result',[])))"
)"

if [[ "$ROUTE_EXISTS" != "True" ]]; then
  curl -fsS -X POST \
    "${CF_AUTH_HEADERS[@]/#/-H }" \
    -H "Content-Type: application/json" \
    --data "{\"pattern\":\"$ROUTE_PATTERN\",\"script\":\"$WORKER_NAME\"}" \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/workers/routes" >/dev/null
fi

ROUTE_HOST="${ROUTE_PATTERN%%/*}"
LIVE_URL="https://$ROUTE_HOST"
echo "Live URL: $LIVE_URL"
curl -fsS "$LIVE_URL/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok=' + str(d.get('ok')) + ', service=' + str(d.get('service')))"

echo "Deploy complete (route mode)."
