# RUNBOOK: Backup & Restore (ShopSIN Database)

> **RTO target:** < 2h · **RPO target:** < 24h (daily backup)
> **Last restore test:** _(fill in after first drill)_

## Overview

3-2-1 backup strategy for the Supabase PostgreSQL database on VM `92.5.60.87`:

| Layer | Storage | Frequency | Retention | How |
|-------|---------|-----------|-----------|-----|
| **Primary** | OCI Object Storage (eu-frankfurt-1) | Daily (03:00) | 30 days | `backup-shop-db.sh` via cron |
| **Offsite** | Cloudflare R2 | Weekly (Sun 04:00) | 90 days | `offsite-copy-r2.sh` via cron |
| **On-VM** | `/tmp/` (ephemeral) | During run only | deleted after upload | pg_dump → gzip |

Backup flow: `pg_dump` → gzip → SHA256 → upload OCI → weekly copy to R2.

## Prerequisites

### OCI CLI / AWS S3-compatible

The scripts use `aws` CLI with `--endpoint-url` pointing to OCI's S3-compatible API.

```bash
# Verify OCI access
aws s3 ls s3://simone-backups/ --endpoint-url "$OCI_S3_ENDPOINT"
```

Required env vars (set in `/etc/backup-shop-db.env` on the VM):

```
OCI_S3_ENDPOINT=https://<namespace>.compat.objectstorage.eu-frankfurt-1.oci.oraclecloud.com
AWS_ACCESS_KEY_ID=<oci-access-key>
AWS_SECRET_ACCESS_KEY=<oci-secret-key>
```

### R2 credentials

For the weekly offsite copy, configure an AWS profile named `r2`:

```bash
aws configure --profile r2
# Access key + secret from Cloudflare R2 dashboard
```

Required env var:

```
CLOUDFLARE_ACCOUNT_ID=<account-id>
```

### Resend API key (alert on failure)

```
RESEND_KEY_FILE=/etc/backup/resend.key   # contains re_xxx...
```

Alerts go to `opensin@gmx.com` from `alerts@delqhi.com`.

## Daily Backup

### Manual run

```bash
# On the VM (92.5.60.87):
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; /etc/cron.daily/backup-shop-db'
```

### Cron (auto)

Configured in `/etc/cron.d/shop-backup`:

```
0 3 * * * root set -a; . /etc/backup-shop-db.env; set +a; /etc/cron.daily/backup-shop-db >> /var/log/backup-shop.log 2>&1
```

### What the script does

1. `pg_dump -U postgres -d postgres -n shop -n public` — dumps both `shop` and `public` schemas (auth, storage, etc.)
2. Gzip + SHA256 checksum
3. Upload to `s3://simone-backups/db/shop-YYYYMMDD.sql.gz` + `.sha256`
4. Delete OCI backups older than 30 days
5. Alert via Resend on failure

### Verify backup exists

```bash
aws s3 ls s3://simone-backups/db/ --endpoint-url "$OCI_S3_ENDPOINT" | tail -5
```

## Weekly Offsite Copy

### Manual run

```bash
# On the VM:
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; /etc/cron.daily/offsite-copy-r2'
```

### Cron (auto)

```
0 4 * * 0 root set -a; . /etc/backup-shop-db.env; set +a; /etc/cron.daily/offsite-copy-r2 >> /var/log/backup-offsite.log 2>&1
```

### What the script does

1. Finds latest backup in OCI
2. Downloads backup + SHA256 to temp dir
3. Verifies SHA256 (aborts on mismatch)
4. Uploads both files to R2 `s3://shopsin-backups-offsite/db/`
5. Deletes R2 backups older than 90 days

## Restore Procedure

### Option A: Using the restore script (recommended)

```bash
# From OCI (primary)
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; /usr/local/bin/restore-shop-db.sh shop-20260613.sql.gz'

# From R2 (offsite — if OCI is unavailable)
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; /usr/local/bin/restore-shop-db.sh --source r2 shop-20260606.sql.gz'

# Dry run (no changes made)
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; /usr/local/bin/restore-shop-db.sh --dry-run shop-20260613.sql.gz'
```

The script performs all steps below automatically.

### Option B: Manual step-by-step restore

#### Step 1: Download backup

From OCI:

```bash
aws s3 cp s3://simone-backups/db/shop-20260613.sql.gz ./restore.sql.gz \
  --endpoint-url "$OCI_S3_ENDPOINT"
aws s3 cp s3://simone-backups/db/shop-20260613.sql.gz.sha256 ./restore.sql.gz.sha256 \
  --endpoint-url "$OCI_S3_ENDPOINT"
```

From R2 (if OCI unavailable):

```bash
aws s3 cp s3://shopsin-backups-offsite/db/shop-20260606.sql.gz ./restore.sql.gz \
  --endpoint-url "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --profile r2
aws s3 cp s3://shopsin-backups-offsite/db/shop-20260606.sql.gz.sha256 ./restore.sql.gz.sha256 \
  --endpoint-url "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --profile r2
```

#### Step 2: Verify SHA256

```bash
sha256sum -c restore.sql.gz.sha256
# MUST print "restore.sql.gz: OK" — abort if mismatch
```

#### Step 3: Stop Supabase services

Stop all services that depend on the DB (but keep the DB container running):

```bash
ssh ubuntu@92.5.60.87
docker stop supabase-kong supabase-auth supabase-rest supabase-storage supabase-realtime supabase-meta supabase-imgproxy
```

#### Step 4: Restore

```bash
gunzip -c restore.sql.gz | docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

If `ON_ERROR_STOP=1` causes abort on non-fatal warnings, retry without it:
```bash
gunzip -c restore.sql.gz | docker exec -i supabase-db psql -U postgres -d postgres
```

#### Step 5: Restart services

```bash
docker start supabase-meta supabase-auth supabase-rest supabase-storage supabase-realtime supabase-imgproxy supabase-kong
```

Wait for Kong health:
```bash
for i in $(seq 1 12); do
  curl -sf http://localhost:8000/auth/v1/health && break
  sleep 5
done
```

#### Step 6: Verify

```bash
# Row counts
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT
  (SELECT count(*) FROM shop.products) AS products,
  (SELECT count(*) FROM shop.orders) AS orders,
  (SELECT max(created_at) FROM shop.orders) AS last_order;
"

# RLS policies intact
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'shop';
"

# Public API still works
curl -s "https://supabase.delqhi.com/rest/v1/products_v?select=id&limit=1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -H "Accept-Profile: shop"

# Storefront live
curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/
```

## Test Restore (Monthly Drill)

Restore into a separate test container — never touch production DB for drills.

```bash
# 1. Download latest backup
LATEST=$(aws s3 ls s3://simone-backups/db/ --endpoint-url "$OCI_S3_ENDPOINT" | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://simone-backups/db/${LATEST}" ./restore-test.sql.gz \
  --endpoint-url "$OCI_S3_ENDPOINT"
aws s3 cp "s3://simone-backups/db/${LATEST}.sha256" ./restore-test.sql.gz.sha256 \
  --endpoint-url "$OCI_S3_ENDPOINT"

# 2. Verify checksum
sha256sum -c restore-test.sql.gz.sha256

# 3. Start isolated test container
docker run -d --name backup-restore-test \
  -e POSTGRES_PASSWORD=test \
  -p 5499:5432 \
  postgres:15
sleep 10

# 4. Restore
gunzip -c restore-test.sql.gz | docker exec -i backup-restore-test psql -U postgres

# 5. Smoke test
docker exec backup-restore-test psql -U postgres -d postgres -c "
SELECT
  (SELECT count(*) FROM shop.products) AS products,
  (SELECT count(*) FROM shop.orders) AS orders,
  (SELECT max(created_at) FROM shop.orders) AS last_order;
"
# Expected: products > 0, orders >= 0, last_order < 24h old (for recent backup)

# 6. Cleanup
docker rm -f backup-restore-test
rm -f restore-test.sql.gz restore-test.sql.gz.sha256
```

**Record the drill:**

| Date | Backup file | Tester | Result | Notes |
|------|-------------|--------|--------|-------|
| | | | PASS / FAIL | |

## Monitoring

### Check for recent backups

```bash
# OCI: should show a file from today or yesterday
aws s3 ls s3://simone-backups/db/ --endpoint-url "$OCI_S3_ENDPOINT" | tail -3

# R2: should show a file from last Sunday or more recent
aws s3 ls s3://shopsin-backups-offsite/db/ \
  --endpoint-url "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --profile r2 | tail -3
```

### Alert on missing backup

If no backup appears in OCI within 25 hours, the backup script's Resend alert should fire.
Additionally, check the VM cron log:

```bash
ssh ubuntu@92.5.60.87 "tail -20 /var/log/backup-shop.log"
```

### Cron log rotation

Add to `/etc/logrotate.d/shop-backup`:

```
/var/log/backup-shop.log /var/log/backup-offsite.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
}
```

## Disaster Recovery Path

| Scenario | Action | RTO |
|----------|--------|-----|
| Data corruption / accidental DROP | Restore from latest OCI backup | ~30 min |
| VM disk failure | New VM → install Docker → restore from OCI | ~1-2 h |
| OCI region outage | Restore from R2 offsite copy | ~1-2 h |
| Full VM destruction | Provision new VM → Docker → restore → DNS update | ~2 h |

**WAL archiving / PITR:** Not enabled. Only point-in-time to last daily backup (RPO < 24h).

## Files

| File | Location on VM | Purpose |
|------|----------------|---------|
| `backup-shop-db.sh` | `/etc/cron.daily/backup-shop-db` | Daily pg_dump → OCI |
| `offsite-copy-r2.sh` | `/etc/cron.daily/offsite-copy-r2` | Weekly OCI → R2 copy |
| `restore-shop-db.sh` | `/usr/local/bin/restore-shop-db.sh` | Interactive restore |
| Cron config | `/etc/cron.d/shop-backup` | Schedule + env loading |
| Env file | `/etc/backup-shop-db.env` | OCI/R2 credentials |
| Resend key | `/etc/backup/resend.key` | Alert API key |
| Log | `/var/log/backup-shop.log` | Daily backup output |
| Log | `/var/log/backup-offsite.log` | Weekly offsite output |
