# Fix #59 — Disaster-Recovery: Multi-Region Failover, DDoS-Mitigation, Incident-Response-Runbook

> **Status:** OPEN · **Priority:** low (P3) · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/59

## Context

This is an **architectural epic** with 3 deliverables, each is a full project of its own. The right first step is the **cheapest, highest-ROI**: a written incident-response runbook. The other two (multi-region, DDoS) can wait for real revenue.

## Deliverables (use as the epic checklist)

| # | Sub-task | Status |
|---|----------|--------|
| 59.1 | `docs/RUNBOOK-INCIDENT-RESPONSE.md` (this PR) | TODO |
| 59.2 | Multi-Region Failover (Cloudflare Load Balancer + 2 VMs) | Deferred — €30/mo minimum |
| 59.3 | DDoS-Mitigation (Cloudflare WAF + Rate-limit Rules) | TODO — free, 30 min setup |
| 59.4 | Quarterly DR drill | TODO — recurring |

## 59.1 — Incident-Response Runbook (the main deliverable)

```markdown
# RUNBOOK: Incident Response (ShopSIN)

## Severity levels

| Sev | Description | First response | Page after |
|-----|-------------|----------------|-------------|
| P1 | Shop completely down, data loss risk | Within 5 min | 15 min |
| P2 | Major feature broken (checkout / auth) | Within 30 min | 60 min |
| P3 | Minor issue (one page, one product) | Within 4 h | Next day |

## On-call contacts

- **Owner**: Jeremy (opensin@gmx.com, +49 162 84 88 526)
- **Cloudflare support**: https://dash.cloudflare.com → Help
- **Supabase support**: support@supabase.io
- **Stripe support**: https://support.stripe.com

## Decision tree

### Shop is unreachable (shopsin.delqhi.com)

1. `curl -sI https://shopsin.delqhi.com/`
2. If timeout: check Cloudflare status (https://www.cloudflarestatus.com)
3. If Cloudflare down: wait, communicate, page Cloudflare support
4. If Cloudflare up: check `wrangler tail` for last 100 log lines
5. If worker crash-loop: `wrangler rollback` to last version
6. If DNS issue: check `dig shopsin.delqhi.com CNAME`

### Database unreachable (supabase.delqhi.com)

1. `curl -sI https://supabase.delqhi.com/auth/v1/health`
2. If timeout: SSH into `sin-supabase` (92.5.60.87), `docker ps`
3. If Kong down: `docker compose restart supabase-kong`
4. If postgres down: `docker compose restart supabase-db`
5. If disk full: `docker exec supabase-db df -h`, clean up
6. If corruption: restore from latest OCI backup (see RUNBOOK-BACKUP-RESTORE)

### Stripe checkout broken

1. `curl -sI https://shopsin.delqhi.com/kasse`
2. Check Stripe status (https://status.stripe.com)
3. If Stripe key expired/rotated: `gh secret set STRIPE_SECRET_KEY` + `wrangler secret put STRIPE_SECRET_KEY`
4. If 3DS-step not loading: check CSP for `frame-src https://js.stripe.com`

### CJ fulfillment stuck (orders not fulfilled)

1. Check `app/api/cron/cj-fulfillment/route.ts` last run
2. If 0 successes in 24h: CJ-Auth-Token expired → `scripts/cj/get-token.mjs --refresh`
3. If CJ-Wallet empty: see issue #31
4. If CJ 5xx errors: throttle down to 1 req/2s

### DDoS attack

1. Check Cloudflare Analytics → Traffic → Top countries
2. If one country or ASN: `wrangler routes add shopsin.delqhi.com/* challenge` (managed challenge)
3. If volumetric: enable Cloudflare Under Attack Mode (5 min recovery)
4. If credential stuffing: see #41 rate-limiting

### Data breach / customer data leak

1. SEV P1 — page immediately
2. Rotate Supabase service-role key + Stripe key
3. Review audit logs (`auth.audit_log_entries` table)
4. File DSGVO Art. 33 notification within 72 h (Datenschutzbehörde)
5. Customer notification if PII leaked
6. Document incident in `docs/INCIDENTS/YYYY-MM-DD-<short>.md`

## Post-incident

- Write post-mortem (even for P3) within 7 days
- "What went well", "What went badly", "What we change"
- File follow-up issues

## Quarterly DR drill

Every 3 months:
1. Provision a fresh VM in eu-frankfurt-2
2. Restore latest backup
3. Update Cloudflare DNS to point to new IP
4. Run smoke test
5. Document downtime
```

## 59.3 — DDoS-Mitigation (Cloudflare WAF) — 30 min setup

In Cloudflare Dashboard → Security → WAF → Custom Rules:

```text
Rule 1: Rate-limit auth endpoints
  If (URI Path contains "/auth/v1/" AND request method is POST)
  Then: rate-limit (10 requests / 10 seconds / IP) → challenge

Rule 2: Block non-German user agents in checkout
  If (URI Path contains "/kasse" AND request method is POST
      AND http.user_agent does not contain "Mozilla")
  Then: managed challenge

Rule 3: Block known-bad ASNs
  If (IP.ASN in {ASN_LIST})
  Then: block

Rule 4: Country allow-list (optional — for a DE shop)
  If (IP.country not in {"DE","AT","CH","NL"})
  Then: managed challenge
```

## Acceptance

- `docs/RUNBOOK-INCIDENT-RESPONSE.md` exists, 4 severity levels, decision trees
- 4 Cloudflare WAF rules active
- Quarterly DR drill scheduled (recurring calendar event)

## Closing

```sh
gh issue close 59 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "RUNBOOK-INCIDENT-RESPONSE.md erstellt, 4 WAF rules aktiv, quarterly DR drill scheduled."
```
