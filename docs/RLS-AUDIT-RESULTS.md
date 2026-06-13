# RLS Audit Results — SIN-webshop-01

**Date:** _fill after running on VM_
**Auditor:** _name_
**VM:** 92.5.60.87 (supabase.delqhi.com)
**Run command:**
```bash
cat scripts/supabase/audit-rls.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -"
```

## Summary

| Check | Status | Issues |
|-------|--------|--------|
| 1. RLS enabled on all tables | ☐ PASS / ☐ FAIL | |
| 2. All tables have policies (or intentional default-deny) | ☐ PASS / ☐ FAIL | |
| 3. No USING(true) on sensitive tables | ☐ PASS / ☐ FAIL | |
| 4. Service-role policies where needed | ☐ PASS / ☐ FAIL | |
| 5. Anon policies are read-only | ☐ PASS / ☐ FAIL | |
| 6. Views have security_invoker | ☐ PASS / ☐ FAIL | |
| 7. SECURITY DEFINER functions audited | ☐ PASS / ☐ FAIL | |
| 10. stock_notifications email leak | ☐ PASS / ☐ FAIL | |
| 11. processed_events has RLS | ☐ PASS / ☐ FAIL | |

## Known Gaps (pre-audit analysis)

These gaps were identified from code review before running the audit:

| Gap | Severity | Table | Fix |
|-----|----------|-------|-----|
| `processed_events` missing RLS | CRITICAL | `public.processed_events` | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| `stock_notifications` SELECT USING(true) | HIGH | `public.stock_notifications` | Drop public SELECT policy |
| `orders_select_own` uses email match | MEDIUM | `public.orders` | Replace with user_id-only policy |
| Legacy `admin_users` table may not exist on VM | LOW | `public.admin_users` | Created by fix-rls-gaps.sql |

## Audit Output

### Section 1: Tables without RLS

_Paste output here_

### Section 2: RLS status overview

_Paste output here_

### Section 3: Permissive policies (USING true / WITH CHECK true)

_Paste output here_

### Section 4: Sensitive tables with permissive SELECT

_Paste output here_

### Section 5: Tables with RLS but no policies

_Paste output here_

### Section 6: Anon key policies

_Paste output here_

### Section 7: Views without security_invoker

_Paste output here_

### Section 8: SECURITY DEFINER functions

| Function | Schema | Risk | Notes |
|----------|--------|------|-------|
| `is_admin()` | public | LOW | search_path hardened, STABLE |
| `reserve_stock()` | shop, public | MEDIUM | SECURITY DEFINER, modifies stock |
| `release_stock()` | shop, public | MEDIUM | SECURITY DEFINER, modifies stock |
| `has_purchased()` | public | LOW | STABLE, read-only, search_path hardened |
| `refresh_product_ratings()` | public | MEDIUM | No GRANT to anon/auth — service-role only |
| `log_product_changes()` | public | LOW | Trigger-only, not callable directly |

### Section 9: Service role policies

_Paste output here_

### Section 10: stock_notifications email leak

_Paste output here_

### Section 11: processed_events RLS check

_Paste output here_

## Remediation

Run `fix-rls-gaps.sql` to address known issues:

```bash
cat scripts/supabase/fix-rls-gaps.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -"
```

Then re-run audit to verify fixes.

## Table Inventory

Complete list of tables across `public` and `shop` schemas, derived from setup scripts:

| Table | Schema | RLS | Expected Policies | Sensitivity |
|-------|--------|-----|-------------------|-------------|
| `products` | shop | enabled | anon SELECT (is_active) | public-read |
| `products_v` | shop | view (security_invoker) | inherits from products | public-read |
| `categories` | shop | enabled | anon SELECT (true) | public-read lookup |
| `fx_rates` | shop | enabled | anon SELECT (true) | public-read lookup |
| `orders` | shop | enabled | user SELECT (uid), admin SELECT | **sensitive** |
| `orders_v` | shop | view (security_invoker) | inherits from orders | **sensitive** |
| `cart_items` | shop | enabled | none (service-role only) | **sensitive** |
| `csp_violations` | shop | enabled | service_role INSERT+SELECT | internal |
| `wishlist_items` | public | enabled | own SELECT/INSERT/DELETE | **user-private** |
| `customer_addresses` | public | enabled | own SELECT/INSERT/UPDATE/DELETE | **sensitive** |
| `contact_messages` | public | enabled | admin SELECT only | **sensitive** |
| `newsletter_subscribers` | public | enabled | anon INSERT only | moderate |
| `reviews` | public | enabled | anon SELECT, verified INSERT, own UPDATE/DELETE | public-read + write-gated |
| `return_requests` | public | enabled | own SELECT/INSERT, admin SELECT/UPDATE | **sensitive** |
| `admin_users` | public | enabled | self SELECT only | **sensitive** |
| `admin_audit_log` | public | enabled | admin SELECT only | **sensitive** |
| `cj_auth` | public | enabled | none (service-role only) | **secret** |
| `processed_events` | public | **MISSING** | none | **internal** — needs RLS |
| `stock_alerts` | public | enabled | none (service-role only) | **sensitive** |
| `stock_notifications` | public | enabled | anon INSERT, **anon SELECT (true)** ⚠️ | email leak risk |
