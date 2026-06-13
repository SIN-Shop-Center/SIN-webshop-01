# Multi-Region Failover Runbook — ShopSIN

> **Status:** DRAFT — Ready for implementation  
> **Primary Region:** OCI EU-Frankfurt (92.5.60.87)  
> **Secondary Region:** OCI EU-Amsterdam (recommended) / AWS eu-central-1  
> **DNS Failover:** Cloudflare Load Balancer  
> **RTO Target:** < 5 min DNS + < 30 min DB + < 15 min Services = **~50 min total**  
> **RPO Target:** < 1 min (async replication) / 0 (sync for critical)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE EDGE                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐   │
│  │ Load Balancer       │    │ Workers (Global)            │   │
│  │ Health Checks       │    │ shopsin.delqhi.com          │   │
│  │ Failover Policy     │    │ (stateless, auto-failover)  │   │
│  └──────────┬──────────┘    └─────────────────────────────┘   │
└─────────────┼───────────────────────────────────────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌─────────┐         ┌─────────┐
│ PRIMARY │         │SECONDARY│
│ Frankfurt│        │Amsterdam│
│         │         │(Standby)│
├─────────┤         ├─────────┤
│Supabase │  ◄───►  │ Read    │
│Primary  │  Async  │ Replica │
│         │  Repl   │         │
├─────────┤         ├─────────┤
│OCI Obj  │  Cross- │ OCI Obj │
│Storage  │  Region │ Storage │
│Backups  │  Repl   │ Backups │
├─────────┤         ├─────────┤
│Infisical│  ◄───►  │Infisical│
│(Global) │  Sync   │(Global) │
└─────────┘         └─────────┘
```

---

## 2. Component Replication Strategy

| Component | Primary | Secondary | Replication | RPO | RTO |
|-----------|---------|-----------|-------------|-----|-----|
| **PostgreSQL (Supabase DB)** | OCI DB (Frankfurt) | OCI DB (Amsterdam) | Data Guard (async) / Logical Replication | < 1 min | 30 min |
| **Kong / PostgREST / Auth / Storage / Realtime** | Docker on VM 92.5.60.87 | Docker on VM in Amsterdam | Fresh deploy from same images | 0 | 15 min |
| **Cloudflare Workers** | Global Edge | Global Edge | N/A (stateless) | 0 | 0 |
| **OCI Object Storage (Backups)** | Frankfurt bucket | Amsterdam bucket | Cross-Region Replication (CRR) | 0 | 0 |
| **R2 (Offsite Copies)** | Global | Global | N/A (multi-region) | 0 | 0 |
| **Infisical (Secrets)** | EU Cloud | EU Cloud | N/A (global sync) | 0 | 0 |
| **DNS / CDN** | Cloudflare | Cloudflare | N/A (global) | 0 | 0 |

---

## 3. Failover Procedures

### 3.1 DNS Failover (Automated — < 5 min)

**Setup (one-time):**
```bash
# 1. Create Cloudflare Load Balancer
# Pool A (Primary): supabase-frankfurt.delqhi.com (CNAME to tunnel)
# Pool B (Secondary): supabase-amsterdam.delqhi.com (CNAME to tunnel)
# Health Check: GET https://supabase.delqhi.com/auth/v1/health
#   Expected: 2xx/401 (401 = healthy, Kong responding)
#   Interval: 60s, Retries: 2, Timeout: 10s
# Failover: Pool A → Pool B on 3 consecutive failures
```

**Verification:**
```bash
# Test primary
curl -I https://supabase-frankfurt.delqhi.com/auth/v1/health  # 401

# Simulate primary down → verify LB routes to secondary
# Cloudflare Dashboard → Load Balancing → Monitor
```

### 3.2 Database Failover (Manual — ~30 min)

**Option A: OCI Data Guard (Recommended for OCI)**
```bash
# 1. Enable Data Guard on primary DB
#    OCI Console → Database → Data Guard → Enable
#    Target: Standby DB in Amsterdam

# 2. On failover:
#    OCI Console → Database → Data Guard → Failover
#    (Automatic switchover, ~2-5 min)

# 3. Update connection strings in Infisical:
#    SUPABASE_DB_HOST=<new-primary-host>
```

**Option B: Logical Replication (PostgreSQL native)**
```bash
# 1. On primary:
CREATE PUBLICATION supabase_pub FOR ALL TABLES;
SELECT pg_create_logical_replication_slot('supabase_slot', 'pgoutput');

# 2. On secondary:
CREATE SUBSCRIPTION supabase_sub
  CONNECTION 'host=<primary> port=5432 dbname=postgres user=simone password=...'
  PUBLICATION supabase_pub
  WITH (slot_name = 'supabase_slot', copy_data = true);

# 3. On failover:
#    - Promote secondary: ALTER SUBSCRIPTION supabase_sub DISABLE;
#    - Update connection strings
#    - Re-create slot on new primary
```

### 3.3 Supabase Services Failover (Manual — ~15 min)

**Prerequisites (prepare secondary VM now):**
```bash
# 1. Provision secondary VM in Amsterdam (same shape: ARM A1 4 OCPU/24GB)
# 2. Install Docker, OrbStack not needed on Linux
# 3. Clone supabase-docker repo
# 4. Copy .env from primary (Infisical sync handles this)
# 5. Run: docker compose up -d
# 6. Verify: curl localhost:8000/auth/v1/health
```

**Failover execution:**
```bash
# 1. SSH to secondary VM
# 2. docker compose pull && docker compose up -d
# 3. Wait for health: curl -I http://localhost:8006/auth/v1/health
# 4. Update Cloudflare Tunnel config to point to secondary VM IP
# 5. Or: Let Cloudflare Load Balancer handle DNS failover (preferred)
```

---

## 4. Testing Schedule

| Test | Frequency | Procedure | Success Criteria |
|------|-----------|-----------|------------------|
| **DNS Health Check** | Continuous | Cloudflare LB monitors `/auth/v1/health` | 99.9% uptime |
| **DNS Failover Drill** | Monthly | Disable primary tunnel → verify LB routes to secondary | < 5 min failover, zero data loss |
| **DB Replication Lag Check** | Daily (cron) | `SELECT pg_last_wal_replay_lag();` | < 60 seconds |
| **Full DR Drill** | Quarterly | 1. Snapshot primary DB<br>2. Promote secondary<br>3. Verify data integrity<br>4. Run smoke tests<br>5. Failback | RTO < 50 min, RPO < 1 min |
| **Backup Restore Test** | Monthly | Restore latest backup to test DB | Row counts match, RLS intact |

---

## 5. Cost Estimate (Monthly)

| Resource | Primary (Frankfurt) | Secondary (Amsterdam) | Total |
|----------|---------------------|----------------------|-------|
| **OCI VM (A1.Flex 4 OCPU/24GB)** | ~€0 (Always Free) | ~€0 (Always Free) | €0 |
| **OCI Database (1 OCPU, 15GB)** | ~€120 | ~€120 (Data Guard) | €240 |
| **OCI Object Storage (100GB)** | ~€2.50 | ~€2.50 (CRR) | €5 |
| **Cross-Region Replication (100GB/mo)** | — | ~€8.50 | €8.50 |
| **Cloudflare Load Balancer** | $5/mo (1 pool) | Included | ~$5 |
| **Cloudflare Health Checks** | Included | Included | $0 |
| **Infisical** | Free tier | Free tier | $0 |
| **R2 / Workers** | Included | Included | $0 |
| **TOTAL** | **~€122.50** | **~€131** | **~€253.50 / mo** |

> **Note:** OCI Always Free tier includes 2 AMD VMs (1/8 OCPU) or 1 ARM VM (4 OCPU). For production, consider paid shapes. The ARM A1 4 OCPU is Always Free but limited to 1 per tenancy — secondary may need paid shape.

---

## 6. Implementation Checklist

### Pre-failover Setup (Do Now)
- [ ] Provision secondary VM in Amsterdam
- [ ] Set up OCI Data Guard or logical replication
- [ ] Configure OCI Object Storage Cross-Region Replication
- [ ] Create Cloudflare Load Balancer with 2 pools
- [ ] Deploy Supabase Docker stack to secondary VM (standby)
- [ ] Test DNS failover manually
- [ ] Document connection strings in Infisical with region tags

### Ongoing
- [ ] Daily: Monitor replication lag (cron alert if > 60s)
- [ ] Monthly: DNS failover drill
- [ ] Quarterly: Full DR drill with data verification
- [ ] Monthly: Backup restore test (from OCI → test DB)

---

## 7. Decision Tree (Incident Response)

```
INCIDENT: Primary region unhealthy
    │
    ├─► Cloudflare LB detects 3 failed health checks
    │       │
    │       ├─► Auto-failover DNS to secondary pool (< 5 min)
    │       │       │
    │       │       ├─► Supabase services on secondary VM healthy?
    │       │       │       ├─ YES → Monitor, alert team, investigate primary
    │       │       │       └─ NO  → Manual: SSH to secondary VM, docker compose up
    │       │       │
    │       │       ├─► DB replication lag < 1 min?
    │       │       │       ├─ YES → Read from secondary (async), promote if needed
    │       │       │       └─ NO  → Wait for catch-up OR promote anyway (data loss < 1 min)
    │       │       │
    │       │       └─► Update Infisical: SUPABASE_DB_HOST=secondary (auto if using DNS)
    │       │
    │       └─► Alert: PagerDuty/Slack → On-call investigates primary
    │
    └─► Primary recovers
            │
            ├─► Verify DB sync (Data Guard / replication caught up)
            ├─► Failback DNS to primary (Cloudflare LB)
            ├─► Verify health checks pass for 10 min
            └─► Stand down
```

---

## 8. Contacts

| Role | Primary | Secondary |
|------|---------|-----------|
| **Infrastructure** | Jeremy Schulze | — |
| **Database** | Jeremy Schulze | — |
| **Cloudflare** | Cloudflare Support (Enterprise) | — |
| **OCI** | OCI Support | — |
| **Infisical** | Infisical Support | — |

---

## 9. Related Documents

- `docs/RUNBOOK-DISASTER-RECOVERY.md` — Single-region scenarios (6)
- `docs/RUNBOOK-BACKUP-RESTORE.md` — Backup/restore procedures
- `docs/RUNBOOK-MONITORING.md` — Monitoring setup
- `AGENTS.md` — Architecture rules & constraints
- `STRIPE-KEY-ROTATION.md` — Credential rotation procedure

---

*Last updated: 2026-06-13*  
*Next review: 2026-07-13*