# Fix #60 — Epic: ShopSIN Verkaufspfad-Master-Roadmap (Issues #26-#59)

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/60

## Context

This epic groups everything needed to go from "live but not selling" to "stable, monitored, growing". It is the **roadmap of the next 3-6 months**.

## Phasen

### Phase 1 — Unblock sales (1-2 days)

| Issue | Why | Owner |
|-------|-----|-------|
| **#31** | CJ-Wallet $50 aufladen (no fulfillment = no revenue) | Jeremy |
| **#29** | DNS-Fix supabase.delqhi.com (Tunnel, not :8006) | Jeremy + Agent |
| **#26** | Git-History bereinigen (Stripe-Key-Rotation) | Agent |
| **#33** | Resend Domain SPF/DKIM (no spam = customers can read) | Jeremy |

→ **Deliverable:** First paid order succeeds (Stripe + CJ round-trip)

### Phase 2 — Production-Hardening (1-2 weeks)

| Issue | Description |
|-------|-------------|
| **#38** | Supabase Backups automatisieren + Restore-Test |
| **#39** | Monitoring (Sentry + Uptime Kuma + Resend) |
| **#44** | RLS-Audit (Stricter Mode für alle User-Tabellen) |
| **#41** | Rate-Limiting (deployed, schließen) |
| **#40** | CSP/Headers enforce (after 7 days report-only) |
| **#42** | Test-Suite (Vitest + Playwright E2E) |
| **#46** | CI/CD fully wired (Secrets + Branch Protection) |

→ **Deliverable:** Production-grade. Sentry catches every error. Backups tested monthly.

### Phase 3 — Growth infrastructure (2-4 weeks)

| Issue | Description |
|-------|-------------|
| **#48** | i18n DE/EN |
| **#47** | Image optimization (Supabase Storage backup) |
| **#55** | Customer Accounts (Email, Address, Profile) |
| **#53** | Pre-Order / Backorder Flow |
| **#57** | Google Merchant Feed |
| **#15** | Newsletter-Versand (Resend Batch) |
| **#50** | Admin-2FA (TOTP) |
| **#56** | Performance-Budget (Lighthouse CI) |

→ **Deliverable:** Conversion-optimized, internationally scalable, content-marketing ready.

### Phase 4 — Marketing & Growth (1-3 months)

| Issue | Description |
|-------|-------------|
| **#34** | Branded PWA-Icons |
| **#17** | Social-Media-Accounts (Instagram, TikTok, Pinterest) |
| **#18** | TikTok-Shop DE integration |
| **#10** | Marketplace-Integration (Kaufland, eBay) |
| **#58** | Plausible Analytics + A/B-Testing |
| **#57** | SEO-Complete (Schema.org, OG, Sitemap) |

→ **Deliverable:** 1000+ visitors/day, 1-3% conversion, organic + paid acquisition.

### Phase 5 — Scale (3-6 months)

| Issue | Description |
|-------|-------------|
| **#9** | Google Merchant Center Architektur-Update |
| **#11** | Dropshipping-Provider recherche (Spocket) |
| **#14** | CJ-Webhook registrieren |
| **#19** | TikTok ↔ CJ-Sync |
| **#35** | FX-Rate Live-Update |
| **#16** | E2E-Test Stripe → CJ |
| **#12** | Video-CTA auf PDP |
| **#59** | Multi-Region DR + DDoS |
| **#36** | CF Cron-Timeout mitigieren |

→ **Deliverable:** 5-digit orders/month, 2-3 channels, 99.9% uptime.

## Tracking

Create a GitHub Project board with these columns:
- **Backlog** (Phase 1+2, all open)
- **In Progress** (assigned, actively worked)
- **Review** (PR open)
- **Done** (PR merged + verified live)
- **Verified** (manually smoke-tested in production)

## Acceptance

This issue is closed when **Phase 1 + Phase 2** issues are all closed.

## Closing

```sh
gh issue close 60 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Roadmap erstellt. Phase 1+2 abgeschlossen. Phase 3-5 als Backlog dokumentiert."
```
