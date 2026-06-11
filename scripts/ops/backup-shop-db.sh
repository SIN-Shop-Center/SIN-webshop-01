#!/usr/bin/env bash
#
# backup-shop-db.sh — Issue #38
# Auf der OCI VM unter /etc/cron.daily/ installieren.
# Tägliches pg_dump → OCI Object Storage, 30 Tage Retention, SHA256-Manifest,
# Failure-Alert via Resend.
#
# Voraussetzungen (auf der VM):
#   - aws-cli mit OCI-Endpoint konfiguriert
#   - docker compose / docker ps zeigt supabase-db
#   - ENV: OCI_S3_ENDPOINT, RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_ALERT_TO
#
# Installation:
#   sudo install -m 755 backup-shop-db.sh /etc/cron.daily/backup-shop-db
#   sudo install -m 600 -o root backup-shop-db.env /etc/backup-shop-db.env
#   0 3 * * * root set -a; . /etc/backup-shop-db.env; set +a; /etc/cron.daily/backup-shop-db

set -euo pipefail

BUCKET="${BACKUP_BUCKET:-s3://simone-backups/db}"
STAMP="$(date +%Y%m%d-%H%M)"
TMP="/tmp/shop-${STAMP}.sql.gz"

RESEND_FROM="${RESEND_FROM_EMAIL:-alerts@delqhi.com}"
RESEND_TO="${RESEND_ALERT_TO:-opensin@gmx.com}"

on_error() {
  local exit_code=$?
  echo "[backup] FAILED with exit ${exit_code}" >&2
  if [ -n "${RESEND_API_KEY:-}" ]; then
    curl -sf --max-time 10 \
      -H "Authorization: Bearer ${RESEND_API_KEY}" \
      -H "Content-Type: application/json" \
      -X POST "https://api.resend.com/emails" \
      -d "{\"from\":\"${RESEND_FROM}\",\"to\":\"${RESEND_TO}\",\"subject\":\"[ShopSIN] DB-Backup FAILED\",\"text\":\"DB-Backup fehlgeschlagen um ${STAMP}. Exit ${exit_code}. Check: /var/log/syslog\"}" \
      || echo "[backup] alert email failed" >&2
  fi
  exit "${exit_code}"
}
trap on_error ERR

echo "[backup] starting ${STAMP}"

# Dump + Komprimierung
docker exec supabase-db pg_dump \
  -U postgres -d postgres -n shop --no-owner --clean --if-exists \
  | gzip > "${TMP}"

# Integritäts-Hash
sha256sum "${TMP}" | awk '{print $1}' > "${TMP}.sha256"

# Upload zu OCI Object Storage
aws s3 cp "${TMP}"     "${BUCKET}/shop-${STAMP}.sql.gz"      --endpoint-url "${OCI_S3_ENDPOINT}"
aws s3 cp "${TMP}.sha256" "${BUCKET}/shop-${STAMP}.sql.gz.sha256" --endpoint-url "${OCI_S3_ENDPOINT}"

# Retention: 30 Tage — alle Keys älter als cutoff löschen
CUTOFF="$(date -d '30 days ago' +%Y%m%d 2>/dev/null || date -v-30d +%Y%m%d)"
aws s3 ls "${BUCKET}/" --endpoint-url "${OCI_S3_ENDPOINT}" \
  | while read -r _ _ _ key; do
      fdate="$(echo "${key}" | grep -oE '[0-9]{8}' | head -1 || true)"
      [ -n "${fdate:-}" ] && [ "${fdate}" -lt "${CUTOFF}" ] && \
        aws s3 rm "${BUCKET}/${key}" --endpoint-url "${OCI_S3_ENDPOINT}"
    done

rm -f "${TMP}" "${TMP}.sha256"
echo "[backup] ok ${STAMP}"
