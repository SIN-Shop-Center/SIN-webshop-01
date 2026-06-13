# RUNBOOK: Disaster Recovery (ShopSIN)

> **Purpose:** Step-by-step recovery procedures for all critical failure scenarios.
> **Companion:** `RUNBOOK-BACKUP-RESTORE.md` — detailed backup/restore commands.
> **Owner:** ops team · **Review cadence:** quarterly · **Last drill:** _(fill in)_

## System Map (quick reference)

```
User → Cloudflare CDN → shopsin.delqhi.com (Workers)
                          ↕
         Cloudflare Tunnel → supabase.delqhi.com → Kong:8006 → Supabase services
                                                               ↕
                                                          Postgres (VM 92.5.60.87)
                          ↕
                       Stripe API (webhooks)
                       CJ Dropshipping API
```

| Component | Location | Public URL |
|-----------|----------|------------|
| Storefront (Next.js/OpenNext) | Cloudflare Workers | `https://shopsin.delqhi.com` |
| Supabase (self-hosted Docker) | VM 92.5.60.87 | `https://supabase.delqhi.com` (via Cloudflare Tunnel) |
| Kong API Gateway | VM, port 8006 (internal only) | — |
| Postgres | VM, port 5432 (private) | — |
| Stripe | External SaaS | Dashboard: `https://dashboard.stripe.com` |
| CJ Dropshipping | External SaaS | `https://www.cjdropshipping.com` |

---

## Scenario 1: VM (92.5.60.87) Goes Down

**RTO target: 2 hours**

### Detection

- SSH connection timeout: `ssh ubuntu@92.5.60.87` hangs or refuses
- `curl -i https://supabase.delqhi.com/auth/v1/health` returns connection error or 502
- Storefront returns errors on any Supabase-dependent page (products, auth)
- Uptime monitoring alert (if configured)

### Step 1: Confirm the outage

```bash
# From your local machine:
ssh -o ConnectTimeout=5 ubuntu@92.5.60.87   # should fail
ping -c 3 92.5.60.87                          # may or may not respond (ICMP could be blocked)
curl -i https://supabase.delqhi.com/auth/v1/health   # expect failure
curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/   # may 500 on data fetches
```

### Step 2: OCI Console Recovery

1. Log in to **OCI Console**: `https://cloud.oracle.com`
2. Navigate: **Compute → Instances** → find the instance at 92.5.60.87
3. Check instance state:
   - **STOPPED** → click **Start**
   - **RUNNING but unresponsive** → click **Reboot** (soft reboot first)
   - Soft reboot fails → **Reboot** → **Force reboot** (hard reset)

4. Wait 2-3 minutes, then test:

```bash
ssh -o ConnectTimeout=10 ubuntu@92.5.60.87
```

### Step 3: If instance is lost / terminated

1. In OCI Console: **Compute → Boot Volume Backups**
2. Find the latest boot volume backup for the instance
3. Click **Restore Boot Volume** → create new boot volume
4. **Compute → Instances → Create Instance**:
   - Use the restored boot volume as the source
   - Same shape/AD as original
   - Same VCN/subnet (preserves private IP; public IP may change)
5. If public IP changed: update DNS/SSH config

### Step 4: Post-recovery verification

```bash
# SSH into VM
ssh ubuntu@92.5.60.87

# Docker containers running?
docker ps --format "table {{.Names}}\t{{.Status}}" | grep supabase

# All expected containers: supabase-db, supabase-kong, supabase-auth,
# supabase-rest, supabase-storage, supabase-realtime, supabase-meta,
# supabase-imgproxy, supabase-studio

# Kong routing (internal)
curl -sf http://localhost:8000/auth/v1/health

# Cloudflared tunnel running?
systemctl status cloudflared
# or
docker ps | grep cloudflared

# Tunnel reaches Kong via localhost:8006
curl -sf https://supabase.delqhi.com/auth/v1/health

# Full smoke tests (from AGENTS.md)
curl -s "https://supabase.delqhi.com/rest/v1/products_v?select=id,title,price&limit=3" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept-Profile: shop"

curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/
```

### Step 5: Fix any stuck containers

```bash
# If containers are exited/restarting:
cd /path/to/supabase/docker
docker compose up -d

# If individual container is unhealthy:
docker restart supabase-kong supabase-auth supabase-rest supabase-storage
```

---

## Scenario 2: Supabase DB Corruption

**RTO target: 4 hours**

### Symptoms

- PostgREST returns 500 errors consistently: `{"code":"PGRST...","message":"..."}`
- Kong logs show upstream errors: `docker logs supabase-kong --tail 50`
- Products page shows empty or errors
- Auth endpoints fail
- `docker exec supabase-db psql -U postgres -c "SELECT 1"` may fail or return corrupt data

### Step 1: Confirm corruption

```bash
ssh ubuntu@92.5.60.87

# Check Postgres health
docker exec supabase-db psql -U postgres -c "SELECT 1"

# Check for corruption indicators
docker exec supabase-db psql -U postgres -c "
  SELECT schemaname, tablename 
  FROM pg_tables 
  WHERE schemaname IN ('shop', 'public', 'auth', 'storage');
"

# Check Postgres logs
docker logs supabase-db --tail 100 | grep -iE "corrupt|panic|fatal|error"
```

### Step 2: Stop all dependent services

Keep `supabase-db` running for the restore, but stop everything that reads from it:

```bash
docker stop supabase-kong supabase-auth supabase-rest supabase-storage \
  supabase-realtime supabase-meta supabase-imgproxy
```

### Step 3: Restore from latest backup

**Using the restore script (recommended):**

```bash
# List available backups
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; \
  aws s3 ls s3://simone-backups/db/ --endpoint-url "$OCI_S3_ENDPOINT" | tail -5'

# Restore latest (replace date with actual latest backup)
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; \
  /usr/local/bin/restore-shop-db.sh shop-YYYYMMDD.sql.gz'

# Dry run first if unsure:
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; \
  /usr/local/bin/restore-shop-db.sh --dry-run shop-YYYYMMDD.sql.gz'
```

**If OCI is unavailable, restore from R2 offsite:**

```bash
sudo bash -c 'set -a; . /etc/backup-shop-db.env; set +a; \
  /usr/local/bin/restore-shop-db.sh --source r2 shop-YYYYMMDD.sql.gz'
```

**Manual restore (see `RUNBOOK-BACKUP-RESTORE.md` for full details):**

```bash
# Download + verify + restore
aws s3 cp s3://simone-backups/db/shop-YYYYMMDD.sql.gz ./restore.sql.gz \
  --endpoint-url "$OCI_S3_ENDPOINT"
sha256sum -c restore.sql.gz.sha256
gunzip -c restore.sql.gz | docker exec -i supabase-db psql -U postgres -d postgres
```

### Step 4: Restart services

```bash
docker start supabase-meta supabase-auth supabase-rest supabase-storage \
  supabase-realtime supabase-imgproxy supabase-kong

# Wait for Kong health
for i in $(seq 1 12); do
  curl -sf http://localhost:8000/auth/v1/health && break
  sleep 5
done
```

### Step 5: Verify data integrity

```bash
# Row counts (compare against known values)
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

# RLS negative test — must return [] or 401/403
curl -s "https://supabase.delqhi.com/rest/v1/orders?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"

# Storefront live
curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/
```

### Note: RPO < 24h

WAL archiving / PITR is not enabled. Maximum data loss is up to 24 hours (last daily backup).
If this RPO is unacceptable, enable WAL archiving to OCI Object Storage.

---

## Scenario 3: Cloudflare Workers Deployment Broken

**RTO target: 30 minutes**

### Symptoms

- `curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/` returns 500, 502, or error page
- Storefront shows runtime errors or blank page
- Recent deploy was made (correlation)

### Step 1: Confirm it's a Workers issue (not Supabase)

```bash
# Supabase still healthy?
curl -i https://supabase.delqhi.com/auth/v1/health

# If Supabase is fine but storefront is broken → Workers issue
# If both are broken → start with Scenario 1 or 5
```

### Step 2: Check Workers deploy history

```bash
# In the project directory:
pnpm exec wrangler deployments list

# Or check Cloudflare Dashboard → Workers → shopsin-storefront → Deployments
```

### Step 3: Rollback

**Option A: Wrangler rollback (fastest)**

```bash
pnpm exec wrangler rollback
# Rolls back to the previous deployment
```

**Option B: Re-deploy last known good commit**

```bash
# Find the last working commit
git log --oneline -10

# Checkout and redeploy
git checkout <last-good-commit>
pnpm install
pnpm build:cf
pnpm exec wrangler deploy

# Return to main branch
git checkout main
```

**Option C: Cloudflare Dashboard rollback**

1. Cloudflare Dashboard → Workers → `shopsin-storefront` → Deployments
2. Find the last successful deployment
3. Click **...** → **Rollback to this version**

### Step 4: Verify environment variables/secrets intact

```bash
# List secrets (values are redacted)
pnpm exec wrangler secret list

# If a secret is missing, re-set it:
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put STRIPE_SECRET_KEY
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
```

Remember: `NEXT_PUBLIC_*` variables are build-time baked. If they changed, a full rebuild + redeploy is required.

### Step 5: Verify recovery

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/   # expect 200
curl -s "https://shopsin.delqhi.com/" | head -50   # check HTML renders
```

---

## Scenario 4: Stripe Webhook Stops Working

**RTO target: 1 hour**

### Symptoms

- Orders stay in `pending` state, never transition to `paid`
- Stripe payment succeeds but ShopSIN doesn't reflect it
- Webhook delivery failures in Stripe dashboard

### Step 1: Diagnose

```bash
# Check Stripe webhook endpoint from Stripe Dashboard:
# Developers → Webhooks → click the endpoint

# Look for:
# - "Enabled" status (not disabled)
# - Recent delivery attempts (200 = success, 4xx/5xx = failure)
# - Error messages on failed deliveries
```

### Step 2: Common causes & fixes

**Webhook URL misconfigured:**

- Verify endpoint URL is `https://shopsin.delqhi.com/api/stripe/webhook` (or your actual path)
- No port in URL (see Iron Rule #1 in AGENTS.md)
- Fix in Stripe Dashboard → Developers → Webhooks → Edit endpoint

**Signing secret mismatch:**

```bash
# Compare: Stripe Dashboard → Webhooks → Signing secret
# vs: Cloudflare Worker secret
pnpm exec wrangler secret list   # should include STRIPE_WEBHOOK_SECRET

# Re-set if mismatched:
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste the signing secret from Stripe Dashboard

# Redeploy if needed (secrets are runtime, no rebuild required for non-NEXT_PUBLIC vars)
```

**Endpoint returning errors:**

- Check Worker logs: Cloudflare Dashboard → Workers → `shopsin-storefront` → Logs
- Common: malformed payload, missing event type handler, DB write failure

**Stripe API key rotated but not updated:**

- Verify `STRIPE_SECRET_KEY` matches current key in Stripe Dashboard
- Update: `pnpm exec wrangler secret put STRIPE_SECRET_KEY`

### Step 3: Process missed events manually

If webhooks were down for a period, some events were missed:

1. Stripe Dashboard → Developers → Webhooks → click endpoint
2. Filter by "Failed" deliveries
3. For each failed event:
   - Click **Resend** (if endpoint is fixed)
   - Or note the event ID and manually update the order status
4. Alternatively, use Stripe CLI to replay events:

```bash
stripe listen --forward-to https://shopsin.delqhi.com/api/stripe/webhook
```

### Step 4: Verify

```bash
# Create a test payment (use Stripe test mode if available)
# Check that order status updates to "paid" within 30 seconds

# Also verify from the Supabase side:
curl -s "https://supabase.delqhi.com/rest/v1/orders?select=id,status&limit=5" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept-Profile: shop"
```

---

## Scenario 5: DNS/Tunnel Failure (supabase.delqhi.com)

**RTO target: 1 hour**

### Symptoms

- Frontend can't reach Supabase API: `fetch` calls return network errors
- `curl https://supabase.delqhi.com/auth/v1/health` fails or times out
- Storefront products page empty, auth broken
- VM itself may still be reachable via SSH on its IP

### Step 1: Isolate the failure point

```bash
# 1. Is the VM itself up?
ssh -o ConnectTimeout=5 ubuntu@92.5.60.87

# 2. Is Supabase running locally on the VM?
ssh ubuntu@92.5.60.87 "curl -sf http://localhost:8000/auth/v1/health"

# 3. Is the Cloudflare DNS resolving?
dig supabase.delqhi.com
# Should return a Cloudflare proxy IP (104.x.x.x or similar)

# 4. Is the tunnel running on the VM?
ssh ubuntu@92.5.60.87 "systemctl status cloudflared"
# or if cloudflared runs in Docker:
ssh ubuntu@92.5.60.87 "docker ps | grep cloudflared"
```

### Step 2: Fix cloudflared on VM

**If cloudflared service is stopped:**

```bash
ssh ubuntu@92.5.60.87
sudo systemctl start cloudflared
# or: docker start cloudflared

# Check it's connected:
sudo journalctl -u cloudflared --since "5 minutes ago" | tail -20
# Look for "Connection ... registered" messages
```

**If cloudflared won't start:**

```bash
# Check config
cat /etc/cloudflared/config.yml
# or: cat /root/.cloudflared/config.yml

# Verify tunnel token (if using remotely managed tunnel):
cloudflared tunnel login
cloudflared tunnel list

# Re-run as service:
sudo cloudflared service install
sudo systemctl start cloudflared
```

### Step 3: Fix Cloudflare DNS

If the tunnel is running but DNS doesn't resolve:

1. Log in to **Cloudflare Dashboard** → `delqhi.com` → DNS
2. Verify CNAME record for `supabase`:
   - Type: `CNAME`
   - Name: `supabase`
   - Target: `<tunnel-id>.cfargotunnel.com`
   - Proxy: **Proxied** (orange cloud ON)
3. If missing, add it. If pointing to wrong target, update it.

### Step 4: Verify tunnel ingress config

The tunnel must route `supabase.delqhi.com` to `localhost:8006` (Kong):

```yaml
# In cloudflared config or Cloudflare Dashboard → Tunnels → Public Hostname:
# Hostname: supabase.delqhi.com
# Service: http://localhost:8006
```

**Critical:** Port 8006 is INTERNAL only. Never put it in the public URL. The tunnel handles the routing.

### Step 5: Temporary workaround (NOT for production)

If the tunnel can't be fixed quickly, services on the VM can be reached
directly via IP (only from machines with network access to 92.5.60.87):

```bash
# Temporary direct access (requires IP reachability)
curl http://92.5.60.87:8000/auth/v1/health
```

This is NOT viable for the Cloudflare Workers storefront — Workers can't reach
the VM IP directly. For a production workaround, consider a temporary Cloudflare
Worker that proxies to the IP (but this exposes the IP in code).

### Step 6: Verify

```bash
curl -i https://supabase.delqhi.com/auth/v1/health   # expect 200 or 401
curl -s -o /dev/null -w "%{http_code}\n" https://shopsin.delqhi.com/   # expect 200
```

---

## Scenario 6: CJ Dropshipping API Down

**RTO target: depends on CJ (external — out of our control)**

### Symptoms

- Fulfillment sync errors in application logs
- Orders stuck in `paid` state, never transition to `shipped`
- CJ API calls return timeouts, 5xx errors, or auth failures
- CJ webhook deliveries stop

### Step 1: Verify CJ status

```bash
# Check CJ's status page (if available):
# https://www.cjdropshipping.com/status  (or their Discord/community)

# Test CJ API directly:
curl -s -X POST "https://developers.cjdropshipping.com/api/v1/authenticate" \
  -H "Content-Type: application/json" \
  -d '{"email": "<cj-email>", "password": "<cj-password>"}'
# If this returns a token, API is up — issue may be token/config on our side

# Test a simple API call with current token:
curl -s "https://developers.cjdropshipping.com/api/v1/product/getProductList" \
  -H "Authorization: Bearer <cj-token>"
```

### Step 2: Check token validity

CJ tokens expire. If the stored token is stale:

1. Re-authenticate with CJ API credentials
2. Update the token in Supabase or environment config
3. Restart any workers/services that cache the token

### Step 3: Mitigate — queue orders

While CJ is down, prevent customer-facing failures:

1. **Queue pending fulfillments:** Orders in `paid` state stay queued
2. **Alert customers:** Display a notice on the storefront (optional):
   - "Fulfillment is temporarily delayed. Your order is safe and will be shipped as soon as our logistics partner recovers."
3. **Log all failed attempts:** So they can be retried when CJ recovers

### Step 4: Catch up when CJ recovers

```bash
# Re-process all orders stuck in 'paid' state
# Use your sync/fulfillment script to retry all pending orders

# Verify:
curl -s "https://supabase.delqhi.com/rest/v1/orders?select=id,status&status=eq.paid" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept-Profile: shop"
# Should show fewer/no stuck orders as they process
```

### Step 5: Post-incident

- Document how long CJ was down and how many orders were affected
- Consider adding CJ health-check to monitoring (poll every 5 min)
- Consider fallback fulfillment partner for extended CJ outages

---

## General Procedures

### Emergency Contacts

See `EMERGENCY-CONTACTS.md` in this directory for the full contact sheet.

| Provider | When to Contact | Response Time |
|----------|----------------|---------------|
| Oracle Cloud (OCI) | VM won't recover, boot volume issues | See OCI SLA |
| Cloudflare | Tunnel DNS issues, Worker platform errors | See plan tier |
| Stripe | Webhook issues, payment processing failures | See Stripe support SLA |
| CJ Dropshipping | API outages, fulfillment failures | See CJ SLA |

### Credential Rotation

If any secret may have been compromised during an incident:

1. Rotate immediately — do not wait for "confirmation"
2. Follow the rotation procedure per service:
   - **Supabase JWT_SECRET** → regenerate ANON_KEY + SERVICE_ROLE_KEY → update everywhere (see Iron Rule #7 in AGENTS.md)
   - **Stripe keys** → rotate via Stripe Dashboard → update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Workers secrets
   - **OCI credentials** → regenerate access keys in OCI Console → update `/etc/backup-shop-db.env` on VM
   - **Infisical** → rotate via Infisical dashboard, then `infisical export` to refresh all environments
3. After rotation: rebuild + redeploy storefront (for `NEXT_PUBLIC_*` changes)

### Communication Plan

| Event | Who to Notify | How | When |
|-------|---------------|-----|------|
| Any outage > 15 min | Business owner | SMS / phone call | Immediately |
| Data corruption/restore | All developers | Slack channel | Immediately |
| VM down > 30 min | OCI support (if needed) | Support ticket | After self-recovery fails |
| Stripe webhook down | Business owner (revenue impact) | SMS | Immediately |
| CJ API down | Fulfillment team | Email / Slack | Within 15 min |
| Recovery complete | All notified parties | Same channel as alert | Immediately |
| Post-incident review | All developers | Scheduled meeting | Within 48 hours |

### Status Page

If a public status page exists (e.g. `status.delqhi.com`), update it:
1. **Outage detected** → set to "Degraded Performance" or "Major Outage"
2. **Recovery in progress** → set to "Partial Service"
3. **Fully recovered** → set to "Operational"
4. Add incident timeline as a public note

### Incident Log Template

Record every incident for post-mortem:

```
Date:           YYYY-MM-DD
Start time:     HH:MM UTC
End time:       HH:MM UTC
Duration:       Xh Ym
Scenario:       [1-6 from this runbook]
Root cause:     [one sentence]
Detection:      [how was it first noticed?]
Recovery steps: [what was actually done]
RTO achieved:   [actual vs target]
Data loss:      [none / describe]
Follow-ups:     [what needs to be fixed to prevent recurrence]
```

### Pre-built Monitoring Commands

Run these from your local machine for a quick system health overview:

```bash
echo "=== Storefront ==="
curl -s -o /dev/null -w "shopsin.delqhi.com: %{http_code}\n" https://shopsin.delqhi.com/

echo "=== Supabase Health ==="
curl -s -o /dev/null -w "supabase.delqhi.com: %{http_code}\n" https://supabase.delqhi.com/auth/v1/health

echo "=== Products API ==="
curl -s "https://supabase.delqhi.com/rest/v1/products_v?select=id&limit=1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept-Profile: shop" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Products API: OK ({len(d)} items)') if d else print('Products API: EMPTY')"

echo "=== VM SSH ==="
ssh -o ConnectTimeout=5 ubuntu@92.5.60.87 "echo 'VM SSH: OK'" 2>/dev/null || echo "VM SSH: FAILED"

echo "=== DNS Resolution ==="
dig +short supabase.delqhi.com | head -1 | xargs -I{} echo "DNS: resolves to {}"
```

---

## Decision Tree (Quick Reference)

```
shopsin.delqhi.com broken
  ├── Supabase API also broken?
  │   ├── YES → Can you SSH to VM?
  │   │   ├── YES → Scenario 2 (DB corruption) or Scenario 5 (Tunnel)
  │   │   └── NO → Scenario 1 (VM down)
  │   └── NO → Scenario 3 (Workers deployment)
  ├── Orders not updating to "paid"?
  │   └── Scenario 4 (Stripe webhook)
  ├── Fulfillment failures?
  │   └── Scenario 6 (CJ API)
  └── supabase.delqhi.com unreachable?
      └── Scenario 5 (DNS/Tunnel)
```
