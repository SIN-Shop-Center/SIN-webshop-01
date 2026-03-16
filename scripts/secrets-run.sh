#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET_FILE="${SIMONE_AGENT_SECRETS_FILE:-$ROOT_DIR/secrets/agents.enc.env}"
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-$HOME/.config/sops/age/keys.txt}"

if [[ ! -f "$SECRET_FILE" ]]; then
  echo "secret_file_missing: $SECRET_FILE" >&2
  exit 1
fi

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ $# -eq 0 ]]; then
  echo "usage: scripts/secrets-run.sh <command> [args...]" >&2
  exit 1
fi

printf -v COMMAND_STR '%q ' "$@"
exec sops exec-env "$SECRET_FILE" "$COMMAND_STR"
