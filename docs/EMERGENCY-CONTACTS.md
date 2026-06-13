# EMERGENCY-CONTACTS.md — ShopSIN

> **Purpose:** Quick-access contact sheet for incident response.
> **Classification:** SENSITIVE — do not commit actual credentials/tokens. Use placeholders.
> **Owner:** ops team · **Review cadence:** quarterly

## Internal Team

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|-------------|
| On-call engineer | _[fill]_ | _[fill]_ | _[fill]_ | 24/7 |
| Business owner | _[fill]_ | _[fill]_ | _[fill]_ | Business hours |
| Lead developer | _[fill]_ | _[fill]_ | _[fill]_ | Business hours |
| Fulfillment team | _[fill]_ | _[fill]_ | _[fill]_ | Business hours |

## Oracle Cloud Infrastructure (OCI)

| Item | Value |
|------|-------|
| Tenancy OCID | `ocid1.tenancy.oc1.._[fill]_` |
| Compartment OCID | `ocid1.compartment.oc1.._[fill]_` |
| Instance OCID | `ocid1.instance.oc1.._[fill]_` |
| Boot volume OCID | `ocid1.bootvolume.oc1.._[fill]_` |
| Support portal | `https://cloud.oracle.com/support` |
| Support phone | _[fill — varies by region]_ |
| Support SLA | _[fill — e.g. "4h response for Sev1"]_ |
| OCI region | `eu-frankfurt-1` |

### OCI Console Access

| Item | Value |
|------|-------|
| Console URL | `https://cloud.oracle.com` |
| Username | _[fill]_ |
| MFA method | _[fill — e.g. Oracle Authenticator]_ |

## Cloudflare

| Item | Value |
|------|-------|
| Account ID | _[fill]_ |
| Zone ID (delqhi.com) | _[fill]_ |
| Dashboard | `https://dash.cloudflare.com` |
| Support portal | `https://dash.cloudflare.com/support` |
| Support phone | _[Enterprise plan only]_ |
| Support SLA | _[fill — depends on plan tier]_ |
| Tunnel ID | _[fill]_ |
| Worker name | `shopsin-storefront` |

### Cloudflare Access (Zero Trust)

| Item | Value |
|------|-------|
| Zero Trust dashboard | `https://one.dash.cloudflare.com` |
| Admin email | _[fill]_ |

## Stripe

| Item | Value |
|------|-------|
| Dashboard | `https://dashboard.stripe.com` |
| Account ID | `acct._[fill]_` |
| Support | `https://support.stripe.com` |
| Support phone | _[fill — varies by country]_ |
| Webhook endpoint ID | `we._[fill]_` |
| Current signing secret | _In Infisical / Workers secrets — never write here_ |

## CJ Dropshipping

| Item | Value |
|------|-------|
| API base | `https://developers.cjdropshipping.com` |
| Dashboard | `https://www.cjdropshipping.com` |
| Support email | _[fill]_ |
| Support chat | _[fill — link to CJ chat/Discord]_ |
| Account email | _[fill]_ |
| API token storage | _[fill — e.g. "Supabase vault / env var"]_ |

## Infisical (Secrets Manager)

| Item | Value |
|------|-------|
| Dashboard | `https://eu.infisical.com` |
| Project ID | `fa7758b4-f84c-4297-966e-710056d531ef` |
| Project path | `/SIN-Webshop-01` |
| Environment | `dev` |
| CLI export command | `infisical export --domain https://eu.infisical.com --project-id fa7758b4-f84c-4297-966e-710056d531ef --path /SIN-Webshop-01 --env dev -f .env` |

## Resend (Alert Notifications)

| Item | Value |
|------|-------|
| Alert sender | `alerts@delqhi.com` |
| Alert recipient | `opensin@gmx.com` |
| API key location | `/etc/backup/resend.key` on VM |

## DNS Registrar

| Item | Value |
|------|-------|
| Registrar | _[fill]_ |
| Domain | `delqhi.com` |
| Expiry date | _[fill]_ |
| Auto-renew | _[Yes/No]_ |
| Registrar support | _[fill]_ |

## Escalation Matrix

| Severity | Definition | Response Time | Who |
|----------|-----------|---------------|-----|
| **SEV1** | Full outage: storefront + API down | 15 min | On-call + business owner |
| **SEV2** | Partial outage: one critical function down (payments, auth) | 30 min | On-call |
| **SEV3** | Degraded: slow, intermittent, non-critical path broken | 2 hours | On-call during business hours |
| **SEV4** | Minor: cosmetic, non-urgent | Next business day | Any developer |

## Credential Rotation Quick Reference

| Credential | Where to Rotate | Where to Update After Rotation |
|------------|----------------|-------------------------------|
| JWT_SECRET (Supabase) | Generate new on VM | VM `.env`, Infisical, Worker secrets, rebuild storefront |
| ANON_KEY / SERVICE_ROLE_KEY | Derived from JWT_SECRET | Same as JWT_SECRET |
| STRIPE_SECRET_KEY | Stripe Dashboard → API Keys | Infisical, `wrangler secret put STRIPE_SECRET_KEY` |
| STRIPE_WEBHOOK_SECRET | Stripe Dashboard → Webhooks | `wrangler secret put STRIPE_WEBHOOK_SECRET` |
| OCI access keys | OCI Console → Profile → API Keys | `/etc/backup-shop-db.env` on VM |
| Infisical tokens | Infisical Dashboard | Local CLI config |
| Cloudflare API token | Cloudflare Dashboard → Profile | Local wrangler auth |
| CJ API token | CJ Dashboard / re-authenticate | App config / Supabase vault |

---

_Keep this file as a template. Fill in actual values and store securely. Do NOT commit real secrets to git._
