#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET_FILE="${1:-$ROOT_DIR/secrets/agents.enc.env}"
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-$HOME/.config/sops/age/keys.txt}"

if [[ ! -f "$SECRET_FILE" ]]; then
  echo "secret_file_missing: $SECRET_FILE" >&2
  exit 1
fi

exec sops -d "$SECRET_FILE"
