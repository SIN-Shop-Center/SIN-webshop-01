#!/usr/bin/env bash
set -euo pipefail

KEY_FILE="${SOPS_AGE_KEY_FILE:-$HOME/.config/sops/age/keys.txt}"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "age_key_missing: $KEY_FILE" >&2
  exit 1
fi

exec age-keygen -y "$KEY_FILE"
