# RUNBOOK-MONITORING — ShopSIN Monitoring & Alerting

## Endpoints

| Endpoint | Auth | Purpose | Use by |
|---|---|---|---|
| `GET /api/health` | None | Liveness probe — 200 instantly | Load balancers, UptimeRobot basic |
| `GET /api/healthz` | None | Liveness + DB read check | Uptime Kuma (existing, Issue #39) |
| `GET /api/cron/health-check` | `Bearer $CRON_SECRET` | Deep check: Supabase API + DB + Stripe | Cron jobs, external monitors |

### Health Check Response Format

```json
{
  "status": "ok" | "degraded",
  "timestamp": "2026-06-13T12:00:00.000Z",
  "checks": {
    "supabase_api": { "status": "ok", "latency_ms": 120 },
    "database":     { "status": "ok", "latency_ms": 45 },
    "stripe":       { "status": "ok", "latency_ms": 200 }
  }
}
```

- HTTP 200 = all checks ok
- HTTP 503 = one or more checks down (status = "degraded")

## External Monitors (UptimeRobot — Free Tier)

### What to Monitor

| Name | URL | Interval | Check Type |
|---|---|---|---|
| ShopSIN Storefront | `https://shopsin.delqhi.com/` | 5 min | HTTP |
| ShopSIN Health | `https://shopsin.delqhi.com/api/health` | 5 min | HTTP |
| Supabase API | `https://supabase.delqhi.com/auth/v1/health` | 5 min | HTTP |
| Health Check (deep) | `https://shopsin.delqhi.com/api/cron/health-check` | 5 min | HTTP (custom header) |

### UptimeRobot Setup for Deep Health Check

The `/api/cron/health-check` endpoint requires `Authorization: Bearer $CRON_SECRET`.

In UptimeRobot, create an HTTP(s) monitor with **Custom Headers**:

```
Authorization: Bearer <your-CRON_SECRET-value>
```

Alert to: ops email (configure in UptimeRobot alert contacts).

## Cron-Based VM Monitoring

### Every 5 Minutes (from local machine or CI)

```bash
# Add to crontab (crontab -e)
*/5 * * * * /path/to/SIN-webshop-01/scripts/ops/monitor-vm.sh | /path/to/SIN-webshop-01/scripts/ops/monitor-cron-handler.sh
```

### monitor-cron-handler.sh (create alongside)

```bash
#!/usr/bin/env bash
# Reads JSON from stdin, alerts on critical/warning
set -euo pipefail
read -r JSON
STATUS=$(echo "$JSON" | jq -r '.status')
if [ "$STATUS" = "critical" ]; then
  ALERT_SCRIPT/scripts/ops/alert.sh "vm-critical" "$JSON"
elif [ "$STATUS" = "degraded" ]; then
  ALERT_SCRIPT/scripts/ops/alert.sh "vm-degraded" "$JSON"
fi
```

### VM Monitor Output

```json
{
  "status": "ok|degraded|critical",
  "host": "root@92.5.60.87",
  "timestamp": "2026-06-13T12:00:00Z",
  "containers": {
    "supabase-db": "running",
    "supabase-kong": "running",
    "supabase-auth": "running",
    "supabase-rest": "running",
    "supabase-storage": "running",
    "supabase-realtime": "running",
    "supabase-studio": "running"
  },
  "disk": { "percent": 65, "status": "ok" },
  "memory": { "percent": 72, "status": "ok" },
  "cpu": { "load1": 0.8, "cpus": 4, "status": "ok" },
  "supabase_api": { "status": "ok" }
}
```

Thresholds:
- Disk: warning ≥80%, critical ≥90%
- Memory: warning ≥80%, critical ≥90%
- CPU: warning ≥80% of nproc, critical ≥100% of nproc

## Alert System

### alert.sh Usage

```bash
# Basic
./scripts/ops/alert.sh "disk" "Disk usage at 92% on VM"

# With custom rate limit (default: 15 min = 900s)
ALERT_RATE_LIMIT_SECS=3600 ./scripts/ops/alert.sh "disk" "Disk still full"

# With custom state dir (for persistence across reboots)
ALERT_STATE_DIR=/var/lib/alerts ./scripts/ops/alert.sh "disk" "Disk full"
```

### Rate Limiting

- One alert per topic per 15 minutes (configurable via `ALERT_RATE_LIMIT_SECS`)
- State stored in `$ALERT_STATE_DIR/alert-<topic>.lock` (default `/tmp`)
- For persistence across reboots, set `ALERT_STATE_DIR=/var/lib/alerts`

### Alert Escalation

```
Level 1 (0-15 min):  Email via Resend → ops@delqhi.com
Level 2 (15-30 min): Email + SMS (Resend doesn't do SMS — use Twilio or ntfy.sh)
Level 3 (30+ min):   Phone call (PagerDuty / Opsgenie free tier)
```

**Quick SMS option:** [ntfy.sh](https://ntfy.sh) — free, no signup. Add to `alert.sh`:

```bash
curl -s -H "Priority: high" -H "Tags: warning" -d "$MESSAGE" ntfy.sh/shopsin-ops
```

## Dashboard Recommendations

### Option A: Grafana on VM (self-hosted, free)

```bash
# On VM (92.5.60.87)
docker run -d --name=grafana --restart=always \
  -p 3000:3000 \
  -v grafana-storage:/var/lib/grafana \
  grafana/grafana-oss

# Expose via Cloudflare Tunnel (add ingress)
# grafana.delqhi.com → localhost:3000
```

Data sources:
- Prometheus (install node-exporter + postgres-exporter on VM)
- Health check JSON (use json-datasource plugin or cron → push to Grafana Loki)

### Option B: External (no VM resources)

| Service | Free Tier | Notes |
|---|---|---|
| UptimeRobot | 50 monitors, 5-min intervals | Best for uptime |
| Better Stack | 10 monitors | Good status pages |
| Hyperping | 10 monitors | EU-based |
| ntfy.sh | Unlimited | Push notifications, no signup |

### Option C: Uptime Kuma (self-hosted, deployed on VM)

Uptime Kuma is deployed on the VM per Issue #39.

| Item | Value |
|---|---|
| Container | `uptime-kuma` |
| Local URL | `http://localhost:3001` |
| Intended public URL | `https://status.delqhi.com` |
| Status | Running, first-setup wizard reachable at `http://localhost:3001` |

**Required DNS record:** Add a CNAME in Cloudflare for `status.delqhi.com` → `simone-api.cfargotunnel.com` (or use the Cloudflare Tunnel dashboard to route `status.delqhi.com`). No port in the URL. Once DNS resolves, the tunnel will expose the dashboard.

Add HTTP monitors after first login:
- `https://shopsin.delqhi.com/api/health` (no auth)
- `https://supabase.delqhi.com/auth/v1/health` (no auth)
- `https://shopsin.delqhi.com/api/cron/health-check` (add Authorization header)

**Note:** Grafana (Option A) also defaults to port 3000. Uptime Kuma uses port 3001 on the VM to avoid conflict. If you later deploy Grafana, use port 3000 or another free port.

## Smoke Test Checklist

After setup, verify everything works:

```bash
# 1. Public health endpoint (no auth, instant 200)
curl -s https://shopsin.delqhi.com/api/health | jq .

# 2. Deep health check (needs CRON_SECRET)
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://shopsin.delqhi.com/api/cron/health-check | jq .

# 3. VM monitor (from local machine)
./scripts/ops/monitor-vm.sh | jq .

# 4. Alert (test, will send real email)
./scripts/ops/alert.sh "test" "Monitoring setup verification"

# 5. Rate limit (second alert should be suppressed)
./scripts/ops/alert.sh "test" "This should be rate-limited"
```
