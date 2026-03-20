#!/usr/bin/env bash
set -euo pipefail

cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
mkdir -p /tmp/simone-webshop-01
exec /opt/homebrew/bin/pnpm secrets:run -- env PORT=8000 /opt/homebrew/bin/pnpm dev:api
