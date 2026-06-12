#!/usr/bin/env bash
# /usr/local/bin/offsite-copy-r2.sh — weekly 3-2-1 offsite to Cloudflare R2
set -euo pipefail

# Latest backup from OCI
LATEST=$(aws s3 ls s3://simone-backups/db/ --endpoint-url "$OCI_S3_ENDPOINT" | sort | tail -1 | awk '{print $4}')

if [ -z "$LATEST" ]; then
  echo "No backups found"
  exit 1
fi

aws s3 cp "s3://simone-backups/db/${LATEST}" /tmp/offsite.sql.gz --endpoint-url "$OCI_S3_ENDPOINT"

# Copy to R2
aws s3 cp /tmp/offsite.sql.gz "s3://shopsin-backups-offsite/db/${LATEST}" \
  --endpoint-url "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --profile r2

rm -f /tmp/offsite.sql.gz
echo "Offsite copy OK: ${LATEST}"
