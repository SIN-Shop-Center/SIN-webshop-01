#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET_FILE="${1:-$ROOT_DIR/secrets/agents.enc.env}"
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-$HOME/.config/sops/age/keys.txt}"

mkdir -p "$(dirname "$SECRET_FILE")"

if [[ ! -f "$SECRET_FILE" ]]; then
  TMP_FILE="$(mktemp)"
  printf '%s\n' '# Agent runtime secrets (encrypted with SOPS + age)' > "$TMP_FILE"
  sops --filename-override "$SECRET_FILE" -e "$TMP_FILE" > "$SECRET_FILE"
  rm -f "$TMP_FILE"
fi

exec sops "$SECRET_FILE"
