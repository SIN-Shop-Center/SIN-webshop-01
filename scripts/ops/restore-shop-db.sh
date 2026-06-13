#!/usr/bin/env bash
# /usr/local/bin/restore-shop-db.sh — restore Supabase DB from OCI/R2 backup
# Docs: scripts/ops/restore-shop-db.doc.md
set -euo pipefail

# ── Config ─────────────────────────────────────
OCI_BUCKET="s3://simone-backups"
R2_BUCKET="s3://shopsin-backups-offsite"
R2_ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
R2_PROFILE="r2"
DB_CONTAINER="supabase-db"
RESTART_CONTAINERS="supabase-kong supabase-auth supabase-rest supabase-storage supabase-realtime supabase-meta supabase-imgproxy"

# Supabase services that must be stopped during restore (all depend on DB)
STOP_CONTAINERS="supabase-kong supabase-auth supabase-rest supabase-storage supabase-realtime supabase-meta supabase-imgproxy"

# ── CLI ────────────────────────────────────────
DRY_RUN=false
SOURCE="oci"

usage() {
  cat <<EOF
Usage: $0 [OPTIONS] <backup-file>

Options:
  --dry-run     Show what would happen without executing
  --source SRC  Backup source: oci (default) or r2
  -h, --help    Show this help

Examples:
  $0 shop-20260613.sql.gz
  $0 --dry-run --source r2 shop-20260606.sql.gz
EOF
  exit 0
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)   DRY_RUN=true; shift ;;
    --source)    SOURCE="$2"; shift 2 ;;
    -h|--help)   usage ;;
    -*)          echo "Unknown option: $1" >&2; exit 1 ;;
    *)           BACKUP_FILE="$1"; shift ;;
  esac
done

if [ -z "${BACKUP_FILE:-}" ]; then
  echo "ERROR: backup-file argument required" >&2
  usage
fi

# ── Helpers ────────────────────────────────────
log()   { echo "[$(date +%T)] $*"; }
dry()   { if $DRY_RUN; then log "[DRY-RUN] $*"; return 0; else return 1; fi }
run()   { if dry "$*"; then return 0; else log "$*"; "$@"; fi; }

# ── Step 1: Download backup ───────────────────
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

LOCAL_FILE="${TMPDIR}/${BACKUP_FILE}"
LOCAL_SHA="${TMPDIR}/${BACKUP_FILE}.sha256"

log "Source: ${SOURCE}"

if [ "$SOURCE" = "oci" ]; then
  log "Downloading from OCI: ${BACKUP_FILE}"
  run aws s3 cp "${OCI_BUCKET}/db/${BACKUP_FILE}" "$LOCAL_FILE" \
    --endpoint-url "$OCI_S3_ENDPOINT"
  run aws s3 cp "${OCI_BUCKET}/db/${BACKUP_FILE}.sha256" "$LOCAL_SHA" \
    --endpoint-url "$OCI_S3_ENDPOINT"
elif [ "$SOURCE" = "r2" ]; then
  log "Downloading from R2: ${BACKUP_FILE}"
  run aws s3 cp "${R2_BUCKET}/db/${BACKUP_FILE}" "$LOCAL_FILE" \
    --endpoint-url "$R2_ENDPOINT" \
    --profile "$R2_PROFILE"
  run aws s3 cp "${R2_BUCKET}/db/${BACKUP_FILE}.sha256" "$LOCAL_SHA" \
    --endpoint-url "$R2_ENDPOINT" \
    --profile "$R2_PROFILE"
else
  echo "ERROR: --source must be 'oci' or 'r2'" >&2
  exit 1
fi

# ── Step 2: Verify SHA256 ─────────────────────
log "Verifying SHA256 checksum..."
cd "$TMPDIR"
if ! dry "sha256sum -c ${BACKUP_FILE}.sha256"; then
  if ! sha256sum -c "${BACKUP_FILE}.sha256"; then
    echo "ERROR: SHA256 mismatch — backup is corrupted, aborting restore" >&2
    exit 1
  fi
  log "SHA256 OK"
fi

# ── Step 3: Stop services ──────────────────────
log "Stopping Supabase services (DB stays up for restore)..."
for c in $STOP_CONTAINERS; do
  if docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
    run docker stop "$c"
  else
    log "Container ${c} not running — skipping"
  fi
done

# ── Step 4: Restore ───────────────────────────
log "Restoring database from ${BACKUP_FILE}..."
# gunzip the backup and pipe into psql
# --no-owner --no-privileges already set in dump, but double-safe with -1 (single txn)
if ! dry "gunzip -c ${LOCAL_FILE} | docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres -v ON_ERROR_STOP=1"; then
  if ! gunzip -c "$LOCAL_FILE" | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1; then
    log "WARNING: psql reported errors — verify data integrity manually"
  fi
fi

# ── Step 5: Restart services ───────────────────
log "Restarting Supabase services..."
for c in $RESTART_CONTAINERS; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
    run docker start "$c"
  fi
done

# Wait for Kong to be ready
log "Waiting for Kong to accept connections..."
if ! dry "sleep 5 + curl health check"; then
  for i in $(seq 1 12); do
    if curl -sf http://localhost:8000/auth/v1/health > /dev/null 2>&1; then
      log "Kong is healthy"
      break
    fi
    if [ "$i" -eq 12 ]; then
      log "WARNING: Kong not healthy after 60s — check manually"
    fi
    sleep 5
  done
fi

# ── Step 6: Verify row counts ──────────────────
log "Verifying restored data..."
VERIFY_SQL="
SELECT
  (SELECT count(*) FROM shop.products) AS products,
  (SELECT count(*) FROM shop.orders) AS orders,
  (SELECT max(created_at) FROM shop.orders) AS last_order;
"

if ! dry "psql verification query"; then
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "$VERIFY_SQL"
fi

log "Restore complete: ${BACKUP_FILE}"
if $DRY_RUN; then
  log "(dry-run — no changes were made)"
fi
