# Infrastructure Operations Skill

Manage the OCI VM, Docker containers, Cloudflare tunnel, and Supabase for the Delqhi webshop.

## OCI VM

- **IP**: `92.5.60.87`
- **Arch**: ARM64 (aarch64)
- **OS**: Ubuntu
- **Hostname**: `sinsupabase`
- **SSH**: `ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87`

## Docker Containers

| Container | Image | Port | Restart Policy | Purpose |
|-----------|-------|------|----------------|---------|
| `simone-api` | `ubuntu:22.04` | 8080 | unless-stopped | Go API server |
| `simone-worker` | `ubuntu:22.04` | — | unless-stopped | Go worker (polls orders) |
| `supabase-db` | Supabase PostgreSQL | 5433→5432 | — | Database |
| `supabase-auth` | Supabase Auth | 9999 | — | Authentication |
| `supabase-kong` | Supabase API gateway | 8000 | — | REST API |
| `supabase-studio` | Supabase Studio | 3004 | — | Admin UI |

## Cloudflare

- **Tunnel ID**: `fb25fb11-8840-41fd-8a85-518674c86725`
- **Tunnel Name**: `simone-api`
- **Public URL**: `api.delqhi.com` → `localhost:8080`
- **Worker**: `simone-worldbest-shop` on `delqhi.com/*`
- **Account ID**: `1f7ab05e43657db15341b691070ea4c8`
- **Zone ID**: `3e7ca14550be834b017846ec7f960d16`
- **Global API Key**: `4d3a15a8dbaaca24904f3e0f4c503b80a1811`

## Supabase

- **PostgreSQL**: Port 5433 (host) → 5432 (container)
- **DB User**: `simone:simone123` (BYPASSRLS)
- **Schema**: `shop` (82 tables, 49 products, 24 categories)
- **Studio**: http://92.5.60.87:3004 (supabase / secure_supabase_2026)
- **ANON KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5Mjc5NTAyLCJleHAiOjE5MjY5NTk1MDJ9.HCam8-Pv3vAN8lthCwOpQuels9LkGKK8hVRJQCPEYWE`
- **JWT Secret**: `aDKJ+tPZvBYR5JrYRpYbsFD/6hsc8BXCRmefE41D`

## Common Operations

### Check container status
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

### View API logs
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 "docker logs simone-api --tail 50"
```

### Restart API
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 "docker restart simone-api"
```

### Restart worker
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 "docker restart simone-worker"
```

### Rebuild and deploy API
```bash
# 1. Cross-compile Go binary (local, ARM64)
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o /tmp/simone-api ./apps/api/cmd/api

# 2. Upload to VM
scp -i ~/.ssh/id_ed25519 /tmp/simone-api ubuntu@92.5.60.87:/tmp/simone-api

# 3. Deploy (on VM)
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 << 'EOF'
docker stop simone-api
docker rm simone-api
cp /tmp/simone-api /home/ubuntu/simone-api
chmod +x /home/ubuntu/simone-api
docker run -d --name simone-api --network supabase-network \
  --env-file /home/ubuntu/simone-api.env \
  -p 8080:8080 \
  --restart unless-stopped \
  ubuntu:22.04 \
  bash -c 'apt-get update && apt-get install -y ca-certificates && /app/simone-api'
EOF
```

### Check Cloudflare tunnel
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 "systemctl status cloudflared-simone-api"
```

### Query database
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 \
  "docker exec supabase-db psql -U simone -d postgres -c 'SELECT count(*) FROM shop.products WHERE is_active=true'"
```

### n8n (Workflow Automation)
- **URL**: http://92.5.60.87:5678
- **Login**: zukunftsorientierte.energie@gmail.com / simone2026
- **Encryption Key**: `l0NetY+GIrFOauHsXyBj8kyRIYiJ6GTE`

## Environment File (on VM: /home/ubuntu/simone-api.env)

Key variables:
- `DATABASE_URL=postgresql://simone:simone123@supabase-db:5433/postgres?sslmode=disable&search_path=shop`
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `CJ_API_KEY=CJ5240573@api@d5d074918b1f434995c26af2fc932bb8`
- `CJ_OPEN_ID=37995`
- `RESEND_API_KEY=re_YAnqVXrV...` (primary email, send-only scope)
- `JWT_REQUIRED=false`
- `APP_ENV=development`

## CJ Payment Flow (3-Step Auto-Pay)

1. Go Worker creates CJ order via `createOrderV3` with `payType=2`
2. Worker calls `confirmOrder(orderId)` → status UNPAID
3. Worker calls `payBalance(orderId)` → **requires CJ Balance > $0**
   - Balance currently $0 — orders created+confirmed but UNPAID
4. Fund CJ Balance manually via PayPal/credit card in CJ Dashboard
5. Stripe Instant Payouts auto-triggered after payment (needs Dashboard activation)

## Email System

- **Primary**: Resend (`onboarding@resend.dev`, upgrades to `shop@delqhi.com` after domain verification)
- **Fallback**: Gmail API (Google Service Account)
- From: `Delqhi Shop <onboarding@resend.dev>`
