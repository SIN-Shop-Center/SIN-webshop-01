#!/bin/zsh
set -euo pipefail

PROJECT_ROOT="/Users/jeremy/dev/SIN-webshop-01"
MODE="${1:-worker}"

cd "$PROJECT_ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

case "$MODE" in
  worker)
    exec /usr/bin/env node tooling/scripts/pipeline/commerce-worker.mjs
    ;;
  enqueue-daily)
    exec /usr/bin/env node tooling/scripts/pipeline/enqueue-daily.mjs
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    exit 64
    ;;
esac
