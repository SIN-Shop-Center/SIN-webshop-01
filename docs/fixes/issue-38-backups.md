# Fix #38 — Supabase Backups automatisieren + Disaster-Recovery testen

> **Status:** OPEN · **Priority:** HIGH (P1) · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/38
> **Code:** deployed to VM — BLOCKED on OCI/R2 credentials + Resend domain verification

## Status

Im Repo bereits vorhanden (in PR #69):
- `scripts/ops/backup-shop-db.sh` — pg_dump → OCI Object Storage + 30d Retention + Resend-Alert
- `scripts/ops/offsite-copy-r2.sh` — 3-2-1 wöchentlich nach R2

Auf der OCI-VM `92.5.60.87` sind die Scripts deployt (`/opt/sin-shop/ops/`), cron läuft täglich 02:00 und sonntags 03:00. Fehlend: OCI/R2-Credentials und Resend-Domain-Verifizierung (Alerts landen sonst im Reject).

## Step 1 — deploy to VM (manuell, 5 Min)

```sh
# 1. Script kopieren
scp scripts/ops/backup-shop-db.sh ubuntu@92.5.60.87:/tmp/
scp scripts/ops/offsite-copy-r2.sh ubuntu@92.5.60.87:/tmp/

# 2. Auf der VM:
ssh ubuntu@92.5.60.87
sudo install -m 755 /tmp/backup-shop-db.sh /etc/cron.daily/backup-shop-db
sudo install -m 755 /tmp/offsite-copy-r2.sh /etc/cron.daily/offsite-copy-r2

# 3. ENV-File anlegen
sudo mkdir -p /etc/backup
sudo tee /etc/backup/resend.key > /dev/null << 'EOF'
re_YAnqVXrV_DUsgUHWtdP8FcNWGQfPgLiL6
EOF
sudo chmod 600 /etc/backup/resend.key

sudo tee /etc/backup-shop-db.env > /dev/null << 'EOF'
OCI_S3_ENDPOINT=https://<namespace>.compat.objectstorage.eu-frankfurt-1.oci.oraclecloud.com
RESEND_API_KEY=re_YAnqVXrV_DUsgUHWtdP8FcNWGQfPgLiL6
RESEND_FROM_EMAIL=alerts@delqhi.com
RESEND_ALERT_TO=opensin@gmx.com
EOF
sudo chmod 600 /etc/backup-shop-db.env

# 4. Cron-Job mit env-Loading anlegen
sudo tee /etc/cron.d/shop-backup > /dev/null << 'EOF'
0 3 * * * root set -a; . /etc/backup-shop-db.env; set +a; /etc/cron.daily/backup-shop-db >> /var/log/backup-shop.log 2>&1
0 4 * * 0 root set -a; . /etc/backup-shop-db.env; set +a; /etc/cron.daily/offsite-copy-r2 >> /var/log/backup-offsite.log 2>&1
EOF
sudo chmod 644 /etc/cron.d/shop-backup

# 5. Test-Run (manuell)
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; /etc/cron.daily/backup-shop-db'
ls -la /tmp/shop-*.sql.gz  # should exist
aws s3 ls s3://simone-backups/db/ --endpoint-url "$OCI_S3_ENDPOINT"  # should show today's file
```

## Step 2 — Restore-Test (1 Mal monatlich!)

Dokumentiere in `docs/RUNBOOK-BACKUP-RESTORE.md`.

```sh
# 1. Latest backup holen
LATEST=$(aws s3 ls s3://simone-backups/db/ --endpoint-url "$OCI_S3_ENDPOINT" | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://simone-backups/db/${LATEST}" ./restore-test.sql.gz \
  --endpoint-url "$OCI_S3_ENDPOINT"

# 2. Hash prüfen
aws s3 cp "s3://simone-backups/db/${LATEST}.sha256" ./restore-test.sql.gz.sha256 \
  --endpoint-url "$OCI_S3_ENDPOINT"
sha256sum -c restore-test.sql.gz.sha256

# 3. Test-Container starten
docker run -d --name backup-restore-test \
  -e POSTGRES_PASSWORD=test \
  -p 5499:5432 \
  postgres:15
sleep 10  # wait for postgres ready

# 4. Restore
gunzip -c restore-test.sql.gz | docker exec -i backup-restore-test psql -U postgres

# 5. Smoke-Test
docker exec backup-restore-test psql -U postgres -d postgres -c "
SELECT
  (SELECT count(*) FROM shop.products) as products,
  (SELECT count(*) FROM shop.orders) as orders,
  (SELECT max(created_at) FROM shop.orders) as last_order;
"
# Erwartet: products > 0, orders > 0, last_order < 1 Tag alt

# 6. Cleanup
docker rm -f backup-restore-test
rm restore-test.sql.gz restore-test.sql.gz.sha256
```

## Step 3 — Runbook anlegen

```markdown
# RUNBOOK: Backup & Restore (Shop-DB)

## Letzter erfolgreicher Restore-Test
| Datum | Backup-Datei | Tester | Ergebnis |
|-------|-------------|--------|----------|

## Disaster-Recovery-Pfad (PITR)
- WAL-Archiving: ❌ nicht enabled (PITR not possible)
- Falls VM stirbt: OCI-VM neu provisionieren, restore latest backup, point supabase.delqhi.com DNS to new IP
- Recovery-Time-Objective: ~1-2h
- Recovery-Point-Objective: 24h (last daily backup)

## 3-2-1 Backup-Strategie
- Primary: OCI Object Storage Frankfurt (daily)
- Offsite: Cloudflare R2 (weekly)
- 30 Tage Retention Primary, 90 Tage Retention Offsite
```

## Acceptance

- `crontab -l` shows the daily 3am entry
- `/var/log/backup-shop.log` has at least 1 success line
- OCI Object Storage `s3://simone-backups/db/` has today's file
- Restore-Test passes monthly (test in `docs/RUNBOOK-BACKUP-RESTORE.md`)

## Closing

```sh
gh issue close 38 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Backups deployed + cron aktiv, monatlicher Restore-Test dokumentiert in docs/RUNBOOK-BACKUP-RESTORE.md."
```
