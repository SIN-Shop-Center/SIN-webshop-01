#!/usr/bin/env bash
set -euo pipefail

KEY_DIR="${SOPS_AGE_KEY_DIR:-$HOME/.config/sops/age}"
KEY_FILE="${SOPS_AGE_KEY_FILE:-$KEY_DIR/keys.txt}"

mkdir -p "$KEY_DIR"

if [[ ! -f "$KEY_FILE" ]]; then
  age-keygen -o "$KEY_FILE" >/dev/null
  chmod 600 "$KEY_FILE"
  echo "created: $KEY_FILE"
else
  chmod 600 "$KEY_FILE"
  echo "exists: $KEY_FILE"
fi

echo "public_key: $(age-keygen -y "$KEY_FILE")"
