#!/usr/bin/env bash
# /usr/local/bin/backup-shop-db.sh — daily pg_dump → OCI Object Storage
# FIX #38: Automated backups
set -euo pipefail

BUCKET="s3://simone-backups"
DATE=$(date +%Y%m%d)
TMP="/tmp/shop-${DATE}.sql.gz"
ALERT_EMAIL="opensin@gmx.com"
RESEND_KEY_FILE="/etc/backup/resend.key"

notify_failure() {
  local msg="$1"
  if [ -f "$RESEND_KEY_FILE" ]; then
    curl -s -X POST https://api.resend.com/emails \
      -H "Authorization: Bearer $(cat "$RESEND_KEY_FILE")" \
      -H "Content-Type: application/json" \
      -d "{\"from\":\"alerts@delqhi.com\",\"to\":[\"${ALERT_EMAIL}\"],\"subject\":\"[ALERT] DB-Backup failed ${DATE}\",\"text\":\"${msg}\"}" || true
  fi
}
trap 'notify_failure "Backup-Script aborted at line $LINENO"' ERR

# 1. Dump (shop-Schema)
docker exec supabase-db pg_dump -U postgres -d postgres -n shop | gzip > "$TMP"

# 2. Integrity: Hash + minimum size
[ "$(stat -c%s "$TMP")" -gt 1024 ] || { notify_failure "Dump suspiciously small"; exit 1; }
sha256sum "$TMP" > "${TMP}.sha256"

# 3. Upload OCI (S3-compatible)
aws s3 cp "$TMP" "${BUCKET}/db/shop-${DATE}.sql.gz" \
  --endpoint-url "$OCI_S3_ENDPOINT"
aws s3 cp "${TMP}.sha256" "${BUCKET}/db/shop-${DATE}.sql.gz.sha256" \
  --endpoint-url "$OCI_S3_ENDPOINT"

# 4. Retention: 30 days
CUTOFF=$(date -d '-30 days' +%Y%m%d)
aws s3 ls "${BUCKET}/db/" --endpoint-url "$OCI_S3_ENDPOINT" | awk '{print $4}' | while read -r f; do
  FDATE=$(echo "$f" | grep -oP '\d{8}' | head -1 || true)
  if [ -n "$FDATE" ] && [ "$FDATE" -lt "$CUTOFF" ]; then
    aws s3 rm "${BUCKET}/db/${f}" --endpoint-url "$OCI_S3_ENDPOINT"
  fi
done

rm -f "$TMP" "${TMP}.sha256"
echo "Backup OK: shop-${DATE}.sql.gz"
