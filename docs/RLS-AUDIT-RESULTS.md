# RLS Audit Results — SIN-webshop-01

**Date:** 2026-06-13
**Auditor:** OpenCode agent
**VM:** 92.5.60.87 (supabase.delqhi.com)
**Run command:**
```bash
# Copy SQL to VM
scp scripts/supabase/audit-rls.sql scripts/supabase/fix-rls-gaps.sql \
  ubuntu@92.5.60.87:/home/ubuntu/sin-webshop-01/scripts/supabase/

# Initial audit
cat scripts/supabase/audit-rls.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -" \
  > /home/ubuntu/sin-webshop-01/audit-rls-before.txt

# Idempotent fix (schema references corrected — see Remediation Log)
cat scripts/supabase/fix-rls-gaps.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -" \
  > /home/ubuntu/sin-webshop-01/fix-rls-gaps-output-v2.txt

# Verification audit
cat scripts/supabase/audit-rls.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -" \
  > /home/ubuntu/sin-webshop-01/audit-rls-final-v2.txt

# Final openai_tokens fix + audit v3
cat scripts/supabase/fix-rls-gaps.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -" \
  > /home/ubuntu/sin-webshop-01/fix-rls-openai-tokens.txt

cat scripts/supabase/audit-rls.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -" \
  > /home/ubuntu/sin-webshop-01/audit-rls-final-v3.txt
```

**VM files:**
- `/home/ubuntu/sin-webshop-01/audit-rls-before.txt` — initial findings
- `/home/ubuntu/sin-webshop-01/fix-rls-gaps-output-v2.txt` — remediation output
- `/home/ubuntu/sin-webshop-01/audit-rls-final-v2.txt` — verification output
- `/home/ubuntu/sin-webshop-01/fix-rls-openai-tokens.txt` — openai_tokens fix output
- `/home/ubuntu/sin-webshop-01/audit-rls-final-v3.txt` — final verification output

## Summary

| Check | Status | Issues |
|-------|--------|--------|
| 1. RLS enabled on all tables | ✅ PASS | 0 tables without RLS |
| 2. All tables have policies (or intentional default-deny) | ⚠️ REVIEW | 78 tables default-deny (many new `shop.*` tables need policies reviewed) |
| 3. No USING(true) on sensitive tables | ✅ PASS | 0 sensitive tables with permissive SELECT |
| 4. Service-role policies where needed | ✅ PASS | `service_role_all` on `llm_usage_log` and `openai_tokens_service_role` OK |
| 5. Anon policies are read-only | ✅ PASS | 18 default-deny policies are safe (qual=false / with_check=false) |
| 6. Views have security_invoker | ✅ PASS | 0 views missing `security_invoker` |
| 7. SECURITY DEFINER functions audited | ✅ PASS | Reviewed; no immediate changes needed |
| 10. stock_notifications email leak | ✅ PASS | Public SELECT policy dropped |
| 11. processed_events has RLS | ✅ PASS | RLS enabled on `shop.processed_events` |
| 12. openai_tokens public access | ✅ PASS | Public `service_full_access` policy removed |

## Findings

### Pre-audit known gaps — ALL FIXED

| Gap | Severity | Table | Fix | Status |
|-----|----------|-------|-----|--------|
| `processed_events` missing RLS | CRITICAL | `shop.processed_events` | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | ✅ Fixed |
| `stock_notifications` SELECT USING(true) | HIGH | `public.stock_notifications` | Dropped `stock_notifications_public_select` | ✅ Fixed |
| `orders_select_own` uses email match | MEDIUM | `shop.orders` | Replaced with `auth.uid() = user_id` | ✅ Fixed |
| `openai_tokens` full public access | **CRITICAL** | `public.openai_tokens` | Dropped `service_full_access`; added `openai_tokens_service_role` | ✅ Fixed |
| Legacy `admin_users` table | LOW | `public.admin_users` | Already exists | ✅ OK |

### New / remaining issues

| Gap | Severity | Table | Note |
|-----|----------|-------|------|
| Over-permissive authenticated policies | REVIEW | `public.agent_*`, `public.decision_traces`, `public.execution_*`, `public.token_usage` | `ALL` to `authenticated` with `true`/`true` — multi-tenant risk if users share a project |
| Default-deny tables need policies | REVIEW | `shop.*` (admin, affiliate, analytics, suppliers, etc.) | 78 tables have RLS but no policies; review intended access per table |
| Public SELECT on internal pools | REVIEW | `public.opencode_session_archive`, `public.opencode_session_pool`, `public.sin_issues_pool` | `SELECT` to `public` — verify these are intentionally world-readable |

## Remediation Log

1. **Initial fix-rls-gaps.sql failed** due to schema references that assumed the older `public` schema for `orders`, `contact_messages`, and `processed_events`. The actual VM has these tables in the `shop` schema.
2. **Corrected `scripts/supabase/fix-rls-gaps.sql`:**
   - `public.processed_events` → `shop.processed_events`
   - `public.orders` → `shop.orders`
   - `public.contact_messages` → `shop.contact_messages`
   - `orders` (unqualified) → `shop.orders`
3. **Corrected `scripts/supabase/audit-rls.sql`:**
   - View `security_invoker` check now accepts `security_invoker=true` (the actual PostgreSQL setting) in addition to `=on`.
   - Section 6 now includes `qual` / `with_check` and distinguishes real mutations from default-deny policies.
   - Section 3 assessment now recognizes `service_role` exclusive policies as safe (`OK: service-role bypasses RLS anyway`).
4. **Re-ran fix script successfully** — it committed.
5. **Final openai_tokens fix:**
   - Added section 10 to `fix-rls-gaps.sql` to drop every policy on `public.openai_tokens` that grants access to `public`.
   - Added `openai_tokens_service_role` policy to document intent (service-role bypasses RLS anyway).
   - Re-ran the fix on VM and verified via final audit v3.

### Policies added / changed

| Policy | Table | Action |
|--------|-------|--------|
| `RLS enabled` | 76 `shop.*` tables (including `processed_events`) | Enabled RLS |
| `products_public_read` | `shop.products` | Added SELECT `is_active = true` for public |
| `categories_public_read` | `shop.categories` | Added SELECT `true` for public |
| `fx_rates public read` | `shop.fx_rates` | Added SELECT `true` for public |
| `reviews_public_select` | `public.reviews` | Added SELECT `true` for public |
| `security_invoker=true` | `shop.orders_v`, `shop.products_v` | Set view option |
| `orders_admin_select` | `shop.orders` | Added SELECT `public.is_admin()` |
| `Only admins read` | `shop.contact_messages` | Added SELECT `public.is_admin()` for authenticated |
| `orders_select_own` | `shop.orders` | Replaced email-match with `auth.uid() = user_id` |
| `stock_notifications_public_select` | `public.stock_notifications` | Dropped (email leak) |
| `service_full_access` | `public.openai_tokens` | Dropped (public API-key leak risk) |
| `openai_tokens_service_role` | `public.openai_tokens` | Added ALL to `service_role` only |

## Audit Output

### Section 1: Tables without RLS
```
 schemaname | tablename | rls_enabled 
------------+-----------+-------------
(0 rows)
```

### Section 2: RLS status overview (highlights)
- **130 tables** across `public` and `shop` schemas audited.
- **0 tables with RLS disabled.**
- **78 tables** have RLS enabled but zero policies (default-deny). Highlights of intentionally-default-deny tables:
  - `shop.cart_items` — service-role only
  - `shop.cj_auth` — service-role only
  - `shop.stock_alerts` — service-role only
  - `shop.processed_events` — service-role only
- Remaining `shop.*` default-deny tables need business-specific policies.

### Section 3: Permissive policies (USING true / WITH CHECK true)
- **25 permissive policies** remain.
- **OK / intentional:** `reviews`, `categories`, `fx_rates`, `newsletter_subscribers`, `stock_notifications` INSERT, `llm_usage_log` service-role, `openai_tokens` service-role.
- **REVIEW:** `public.agent_*`, `public.execution_*`, `public.decision_traces`, `public.token_usage` grant `ALL` to `authenticated` with `true`/`true`.
- **REVIEW:** `public.opencode_session_archive`, `public.opencode_session_pool`, `public.sin_issues_pool` grant `SELECT` to `public` with `true`.

### Section 4: Sensitive tables with permissive SELECT
```
 schemaname | tablename | policyname | qual 
------------+-----------+------------+------
(0 rows)
```

### Section 5: Tables with RLS but no policies (default-deny)
- **78 rows** (see full output on VM).
- Intentional service-role-only tables: `cart_items`, `cj_auth`, `stock_alerts`, `processed_events`, `cart_reservations`.
- The rest of the `shop.*` tables (analytics, suppliers, marketing, admin, etc.) need policies reviewed and added.

### Section 6: Anon key policies
- **18 policies** are `ALL` to `anon` + `authenticated` but with `qual=false` and `with_check=false` — **OK: default deny**.
- No anon policy allows real mutation.

### Section 7: Views without security_invoker
```
 schemaname | viewname 
------------+----------
(0 rows)
```

### Section 8: SECURITY DEFINER functions
- Reviewed 19 functions across `public` and `shop`.
- Notable functions:
  - `public.is_admin()` — search_path hardened, OK.
  - `public.has_purchased()` — search_path hardened, OK.
  - `public.refresh_product_ratings()` — service-role-only, no public GRANT, OK.
  - `shop.reserve_stock()` / `shop.release_stock()` / `shop.adjust_reservation()` — SECURITY DEFINER; ensure they are called only from trusted service-role contexts.
  - `shop.resolve_supplier_secret_ref()` / `shop.set_supplier_secret_ref()` — handle supplier secrets; review GRANTs carefully.

### Section 9: Service role policies
```
 schemaname |   tablename   |         policyname         | cmd |     roles      
------------+---------------+----------------------------+-----+----------------
 public     | llm_usage_log | service_role_all           | ALL | {service_role}
 public     | openai_tokens | openai_tokens_service_role | ALL | {service_role}
```
- Both OK: service-role bypasses RLS by default; these policies are explicitness only.

### Section 10: stock_notifications email leak check
```
 policyname | cmd | qual | roles 
------------+-----+------+-------
(0 rows)
```
- Public SELECT policy was removed.

### Section 11: processed_events RLS check
```
 schemaname |    tablename     | rls_enabled 
------------+------------------+-------------
 shop       | processed_events | t
(1 row)
```

## Remediation

Run the corrected fix script:

```bash
cat scripts/supabase/fix-rls-gaps.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -"
```

Then re-run the audit to verify:

```bash
cat scripts/supabase/audit-rls.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -"
```

## Table Inventory

Updated inventory of tables that appear in the audit. Schemas differ from the pre-audit expectation: several tables (orders, contact_messages, processed_events) are in `shop` on the VM, not `public`.

| Table | Schema | RLS | Policies | Sensitivity | Status |
|-------|--------|-----|----------|-------------|--------|
| `products` | shop | enabled | public SELECT (is_active) | public-read | ✅ |
| `products_v` | shop | view | security_invoker=true | public-read | ✅ |
| `categories` | shop | enabled | public SELECT | public-read lookup | ✅ |
| `fx_rates` | shop | enabled | public SELECT | public-read lookup | ✅ |
| `orders` | shop | enabled | own SELECT (uid), admin SELECT | **sensitive** | ✅ |
| `orders_v` | shop | view | security_invoker=true | **sensitive** | ✅ |
| `cart_items` | shop | enabled | none (service-role only) | **sensitive** | ✅ default-deny |
| `cart_reservations` | shop | enabled | none (service-role only) | **sensitive** | ✅ default-deny |
| `contact_messages` | shop | enabled | admin SELECT only | **sensitive** | ✅ |
| `newsletter_subscribers` | public/shop | enabled | anon INSERT only | moderate | ✅ |
| `reviews` | public | enabled | public SELECT | public-read | ✅ |
| `return_requests` | shop | enabled | existing policies | **sensitive** | ✅ |
| `admin_users` | public/shop | enabled | self SELECT | **sensitive** | ✅ |
| `cj_auth` | shop | enabled | none (service-role only) | **secret** | ✅ default-deny |
| `processed_events` | shop | enabled | none (service-role only) | internal | ✅ fixed |
| `stock_alerts` | shop | enabled | none (service-role only) | **sensitive** | ✅ default-deny |
| `stock_notifications` | public | enabled | anon INSERT only | moderate | ✅ leak fixed |
| `openai_tokens` | public | enabled | `openai_tokens_service_role` ALL service_role | **secret** | ✅ **CRITICAL fixed** |
| `agent_metrics`, `agent_permissions`, `agent_registry`, `decision_traces`, `execution_context`, `execution_trace`, `token_usage` | public | enabled | ALL authenticated with `true` | internal | ⚠️ REVIEW |
| `opencode_session_archive`, `opencode_session_pool`, `sin_issues_pool` | public | enabled | SELECT public with `true` | internal | ⚠️ REVIEW |

## Next Steps

1. **Review authenticated `ALL` policies** on agent/execution tables (`agent_metrics`, `decision_traces`, `execution_trace`, `token_usage`, …) for multi-tenant safety. If each user should only see their own rows, add `user_id = auth.uid()` clauses.
2. **Review public SELECT policies** on `opencode_session_archive`, `opencode_session_pool`, `sin_issues_pool` — verify intentional world-readability or restrict.
3. **Add business-specific policies** for the 78 default-deny `shop.*` tables currently marked `REVIEW` (start with `customers`, `addresses`, `wishlist`, `wishlist_items`, `shipments`, `order_items`).
4. **Re-run the audit** after each policy change and update this document.

## Notes

- The script `fix-rls-gaps.sql` was corrected to use the actual VM schema (`shop` for `orders`, `contact_messages`, and `processed_events`).
- The audit script was corrected to recognize PostgreSQL's actual `security_invoker=true` option and to distinguish default-deny policies from real anon mutation risks.
- `openai_tokens` public policy was removed and replaced with a service-role-only policy; this eliminates the API-key leak risk while keeping service-role access explicit.
- No secrets were exposed in this audit run; all output is structural metadata only.
