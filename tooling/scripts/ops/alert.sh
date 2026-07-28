#!/usr/bin/env bash
# Purpose: Rate-limited alert via Resend API (max 1 per 15 min per topic)
# Docs: docs/RUNBOOK-MONITORING.md
#
# Usage: ./alert.sh "topic" "message"
# Example: ./alert.sh "disk" "Disk usage at 92% on VM"
#
# Rate-limit: uses /tmp/alert-<topic>.lock (mtime check).
# Override: ALERT_STATE_DIR env var (default /tmp).
# Requires: RESEND_API_KEY env var or /etc/backup/resend.key file.
set -euo pipefail

TOPIC="${1:?Usage: alert.sh <topic> <message>}"
MESSAGE="${2:?Usage: alert.sh <topic> <message>}"
ALERT_FROM="${ALERT_FROM:-alerts@delqhi.com}"
ALERT_TO="${ALERT_TO:-opensin@gmx.com}"
RATE_LIMIT_SECS="${ALERT_RATE_LIMIT_SECS:-900}"  # 15 min
STATE_DIR="${ALERT_STATE_DIR:-/tmp}"

LOCKFILE="${STATE_DIR}/alert-${TOPIC}.lock"

# ── Rate limit check ─────────────────────────
if [ -f "$LOCKFILE" ]; then
  lock_age=$(( $(date +%s) - $(stat -f %m "$LOCKFILE" 2>/dev/null || stat -c %Y "$LOCKFILE" 2>/dev/null || echo 0) ))
  if [ "$lock_age" -lt "$RATE_LIMIT_SECS" ]; then
    remaining=$(( RATE_LIMIT_SECS - lock_age ))
    echo "[alert] rate-limited: topic '${TOPIC}' already sent ${lock_age}s ago (next in ${remaining}s)" >&2
    exit 0
  fi
fi

# ── Resolve API key ──────────────────────────
RESEND_KEY="${RESEND_API_KEY:-}"
if [ -z "$RESEND_KEY" ] && [ -f "/etc/backup/resend.key" ]; then
  RESEND_KEY=$(cat /etc/backup/resend.key)
fi
if [ -z "$RESEND_KEY" ]; then
  echo "[alert] ERROR: RESEND_API_KEY not set and /etc/backup/resend.key missing" >&2
  exit 1
fi

# ── Send alert ───────────────────────────────
SUBJECT="[ALERT] ${TOPIC} — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
RESPONSE=$(curl -s -w '\n%{http_code}' -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer ${RESEND_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"${ALERT_FROM}\",\"to\":[\"${ALERT_TO}\"],\"subject\":\"${SUBJECT}\",\"text\":\"${MESSAGE}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  touch "$LOCKFILE"
  echo "[alert] sent: topic '${TOPIC}' → ${ALERT_TO} (HTTP ${HTTP_CODE})"
else
  echo "[alert] FAILED: topic '${TOPIC}' HTTP ${HTTP_CODE} — ${BODY}" >&2
  exit 1
fi
