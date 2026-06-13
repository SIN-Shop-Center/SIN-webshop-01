#!/usr/bin/env bash
# /usr/local/bin/offsite-copy-r2.sh — weekly 3-2-1 offsite to Cloudflare R2
# Docs: scripts/ops/offsite-copy-r2.doc.md
set -euo pipefail

OCI_BUCKET="s3://simone-backups"
R2_BUCKET="s3://shopsin-backups-offsite"
R2_ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
R2_PROFILE="r2"
RETENTION_DAYS=90

# ── Find latest backup in OCI ─────────────────
LATEST=$(aws s3 ls "${OCI_BUCKET}/db/" --endpoint-url "$OCI_S3_ENDPOINT" \
  | sort | tail -1 | awk '{print $4}')

if [ -z "$LATEST" ]; then
  echo "ERROR: No backups found in OCI" >&2
  exit 1
fi

# ── Download backup + checksum from OCI ────────
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

aws s3 cp "${OCI_BUCKET}/db/${LATEST}" "${TMPDIR}/${LATEST}" \
  --endpoint-url "$OCI_S3_ENDPOINT"
aws s3 cp "${OCI_BUCKET}/db/${LATEST}.sha256" "${TMPDIR}/${LATEST}.sha256" \
  --endpoint-url "$OCI_S3_ENDPOINT"

# ── Verify SHA256 before offsite upload ───────
cd "$TMPDIR"
if ! sha256sum -c "${LATEST}.sha256"; then
  echo "ERROR: SHA256 mismatch for ${LATEST} — aborting offsite copy" >&2
  exit 1
fi

# ── Upload to R2 ──────────────────────────────
aws s3 cp "${TMPDIR}/${LATEST}" "${R2_BUCKET}/db/${LATEST}" \
  --endpoint-url "$R2_ENDPOINT" \
  --profile "$R2_PROFILE"
aws s3 cp "${TMPDIR}/${LATEST}.sha256" "${R2_BUCKET}/db/${LATEST}.sha256" \
  --endpoint-url "$R2_ENDPOINT" \
  --profile "$R2_PROFILE"

# ── R2 Retention: 90 days ─────────────────────
CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d)
aws s3 ls "${R2_BUCKET}/db/" \
  --endpoint-url "$R2_ENDPOINT" \
  --profile "$R2_PROFILE" \
  | awk '{print $4}' | while read -r f; do
  FDATE=$(echo "$f" | grep -oP '\d{8}' | head -1 || true)
  if [ -n "$FDATE" ] && [ "$FDATE" -lt "$CUTOFF" ]; then
    aws s3 rm "${R2_BUCKET}/db/${f}" \
      --endpoint-url "$R2_ENDPOINT" \
      --profile "$R2_PROFILE"
  fi
done

echo "Offsite copy OK: ${LATEST}"
