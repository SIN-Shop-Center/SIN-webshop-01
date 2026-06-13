-- Purpose: Comprehensive RLS audit for schemas 'public' and 'shop'
-- Docs: docs/RLS-AUDIT-RESULTS.md
-- Run:  psql "$DATABASE_URL" -f scripts/supabase/audit-rls.sql
-- Or:   cat scripts/supabase/audit-rls.sql | ssh ubuntu@92.5.60.87 \
--         "docker exec -i supabase-db psql -U postgres -d postgres -f -"
--
-- Checks performed:
--   1. RLS enabled on every table
--   2. Every table has at least one policy (or is intentionally policy-free)
--   3. No USING(true) / WITH CHECK(true) on sensitive tables
--   4. Service-role bypass policies exist where needed
--   5. Anon key policies are read-only on public data
--   6. Views have security_invoker = on
--   7. SECURITY DEFINER functions are audited

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1: Tables without RLS enabled (CRITICAL)
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '1. TABLES WITHOUT RLS' AS check;

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname IN ('public', 'shop')
  AND rowsecurity = false
ORDER BY schemaname, tablename;

-- Expected: 0 rows. Any row = CRITICAL gap.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2: Full RLS status overview
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '2. RLS STATUS OVERVIEW' AS check;

SELECT
  t.schemaname,
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COALESCE(p.policy_count, 0) AS policy_count,
  CASE
    WHEN t.rowsecurity = false THEN 'CRITICAL: RLS disabled'
    WHEN COALESCE(p.policy_count, 0) = 0 THEN 'WARN: RLS enabled but no policies (default deny)'
    ELSE 'OK'
  END AS status
FROM pg_tables t
LEFT JOIN (
  SELECT schemaname, tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname IN ('public', 'shop')
  GROUP BY schemaname, tablename
) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
WHERE t.schemaname IN ('public', 'shop')
ORDER BY
  CASE WHEN t.rowsecurity = false THEN 0 ELSE 1 END,
  COALESCE(p.policy_count, 0),
  t.tablename;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3: Permissive policies — USING(true) / WITH CHECK(true) on tables
--           that are NOT public-read lookup data
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '3. PERMISSIVE POLICIES (USING true / WITH CHECK true)' AS check;

SELECT
  p.schemaname,
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual,
  p.with_check,
  CASE
    WHEN p.tablename IN ('categories', 'fx_rates', 'reviews')
         AND p.cmd = 'SELECT' AND p.qual = 'true' THEN 'OK: public-read lookup data'
    WHEN p.tablename IN ('csp_violations')
         AND p.roles @> '{service_role}' THEN 'OK: service-role only'
    WHEN p.tablename IN ('newsletter_subscribers', 'stock_notifications')
         AND p.cmd = 'INSERT' AND p.with_check = 'true' THEN 'OK: anon self-subscribe'
    ELSE 'REVIEW: potentially over-permissive'
  END AS assessment
FROM pg_policies p
WHERE p.schemaname IN ('public', 'shop')
  AND (p.qual = 'true' OR p.with_check = 'true')
ORDER BY p.schemaname, p.tablename, p.policyname;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4: Sensitive tables — must NOT have USING(true) on SELECT
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '4. SENSITIVE TABLES WITH PERMISSIVE SELECT (CRITICAL)' AS check;

SELECT
  p.schemaname,
  p.tablename,
  p.policyname,
  p.qual
FROM pg_policies p
WHERE p.schemaname IN ('public', 'shop')
  AND p.tablename IN (
    'orders', 'orders_v', 'customer_addresses', 'return_requests',
    'contact_messages', 'admin_users', 'admin_audit_log',
    'cj_auth', 'processed_events', 'stock_alerts', 'cart_items',
    'wishlist_items'
  )
  AND p.cmd = 'SELECT'
  AND p.qual = 'true'
ORDER BY p.schemaname, p.tablename;

-- Expected: 0 rows. Any row = CRITICAL data leak.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5: Tables with RLS but zero policies (default deny — verify intent)
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '5. TABLES WITH RLS BUT NO POLICIES (default deny)' AS check;

SELECT
  t.schemaname,
  t.tablename,
  CASE
    WHEN t.tablename IN ('cart_items', 'cj_auth', 'contact_messages', 'processed_events', 'stock_alerts')
    THEN 'OK: service-role only access'
    ELSE 'REVIEW: may need policies'
  END AS intent
FROM pg_tables t
WHERE t.schemaname IN ('public', 'shop')
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
  )
ORDER BY t.schemaname, t.tablename;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6: Anon key policies — must be read-only on public data
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '6. ANON KEY POLICIES (must be read-only or self-subscribe only)' AS check;

SELECT
  p.schemaname,
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles,
  CASE
    WHEN p.cmd = 'SELECT' THEN 'OK: read'
    WHEN p.cmd = 'INSERT' AND p.tablename IN ('newsletter_subscribers', 'stock_notifications')
    THEN 'OK: self-subscribe'
    WHEN p.cmd IN ('UPDATE', 'DELETE', 'ALL')
    THEN 'CRITICAL: anon can mutate data!'
    ELSE 'REVIEW'
  END AS assessment
FROM pg_policies p
WHERE p.schemaname IN ('public', 'shop')
  AND p.roles @> '{anon}'
ORDER BY p.schemaname, p.tablename, p.cmd;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7: Views — must have security_invoker = on
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '7. VIEWS WITHOUT security_invoker (CRITICAL)' AS check;

SELECT
  schemaname,
  viewname
FROM pg_views v
WHERE v.schemaname IN ('public', 'shop')
  AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = v.viewname
      AND n.nspname = v.schemaname
      AND c.reloptions @> ARRAY['security_invoker=on']
  )
ORDER BY schemaname, viewname;

-- Expected: 0 rows for shop views. System views may appear — ignore those.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 8: SECURITY DEFINER functions audit
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '8. SECURITY DEFINER FUNCTIONS' AS check;

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'shop')
  AND p.prosecdef = true
ORDER BY n.nspname, p.proname;

-- Review each for: search_path hardening, GRANT restrictions, RLS bypass risk.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 9: Service-role policy check
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '9. SERVICE ROLE POLICIES' AS check;

SELECT
  p.schemaname,
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles
FROM pg_policies p
WHERE p.schemaname IN ('public', 'shop')
  AND p.roles @> '{service_role}'
ORDER BY p.schemaname, p.tablename, p.policyname;

-- service_role bypasses RLS by default — these policies are for explicitness.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 10: stock_notifications SELECT leak check
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '10. stock_notifications EMAIL LEAK CHECK' AS check;

SELECT
  policyname, cmd, qual, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stock_notifications'
  AND cmd = 'SELECT';

-- ⚠️ If USING(true) exists on SELECT for stock_notifications, anyone can read
-- all subscriber emails. This should be restricted. See fix-rls-gaps.sql.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 11: processed_events RLS check
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT '11. processed_events RLS CHECK (MUST HAVE RLS ENABLED)' AS check;

SELECT
  schemaname, tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'processed_events'
  AND schemaname IN ('public', 'shop');

-- Expected: rls_enabled = true. If missing row or false = CRITICAL.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUMMARY: Copy all output into docs/RLS-AUDIT-RESULTS.md
-- ═══════════════════════════════════════════════════════════════════════════════
