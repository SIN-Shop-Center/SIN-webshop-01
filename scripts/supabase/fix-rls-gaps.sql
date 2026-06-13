-- Purpose: Fix common RLS gaps found by audit-rls.sql
-- Docs: docs/RLS-AUDIT-RESULTS.md
-- Run:  cat scripts/supabase/fix-rls-gaps.sql | ssh ubuntu@92.5.60.87 \
--        "docker exec -i supabase-db psql -U postgres -d postgres -f -"
--
-- This script is IDEMPOTENT — safe to re-run. It:
--   1. Enables RLS on any table missing it
--   2. Adds default-deny (no policies) where none exist
--   3. Adds anon SELECT policy for public-read tables
--   4. Fixes over-permissive policies on sensitive data
--   5. Ensures views have security_invoker = on
--
-- ⚠️  Review each section before running. Comment out sections you don't want.
-- ⚠️  Service-role client bypasses RLS — no policy needed for it.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Enable RLS on tables that are missing it
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('public', 'shop')
      AND rowsecurity = false
      AND tablename NOT IN ('_sqlx_migrations')  -- internal tables excluded
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    RAISE NOTICE 'RLS enabled on %.%', r.schemaname, r.tablename;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. processed_events — was missing RLS entirely
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ensure table exists (may be in public or shop depending on search_path)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'processed_events'
      AND schemaname = 'shop'
      AND rowsecurity = false
  ) THEN
    ALTER TABLE shop.processed_events ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on processed_events';
  END IF;
END $$;

-- No policies needed — service-role only writes/reads webhook dedup table.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. stock_notifications — fix over-permissive SELECT (email leak)
-- ═══════════════════════════════════════════════════════════════════════════════

-- BEFORE: anyone could SELECT all subscriber emails via USING(true)
-- AFTER:  only the subscriber's own row visible (by email matching auth email),
--         or no SELECT at all since inserts are server-side anyway.

DROP POLICY IF EXISTS "stock_notifications_public_select" ON public.stock_notifications;

-- If you want users to see their own subscription status (optional):
-- CREATE POLICY "stock_notifications_own_select" ON public.stock_notifications
--   FOR SELECT TO authenticated
--   USING (email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()));

-- If inserts are always server-side (service_role), the public INSERT policy
-- can also be removed. But if the storefront form submits directly, keep it.
-- Current state: keeping the INSERT policy for storefront form.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Public-read anon SELECT policies for shop storefront data
-- ═══════════════════════════════════════════════════════════════════════════════

-- products (shop schema) — only active products visible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'shop' AND tablename = 'products'
      AND policyname = 'products_public_read'
  ) THEN
    CREATE POLICY "products_public_read" ON shop.products
      FOR SELECT USING (is_active = true);
    RAISE NOTICE 'Added products_public_read on shop.products';
  END IF;
END $$;

-- categories (shop schema) — public lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'shop' AND tablename = 'categories'
      AND policyname = 'categories_public_read'
  ) THEN
    CREATE POLICY "categories_public_read" ON shop.categories
      FOR SELECT USING (true);
    RAISE NOTICE 'Added categories_public_read on shop.categories';
  END IF;
END $$;

-- fx_rates (shop schema) — public lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'shop' AND tablename = 'fx_rates'
      AND policyname = 'fx_rates public read'
  ) THEN
    CREATE POLICY "fx_rates public read" ON shop.fx_rates
      FOR SELECT USING (true);
    RAISE NOTICE 'Added fx_rates public read on shop.fx_rates';
  END IF;
END $$;

-- reviews (public schema) — public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews'
      AND policyname = 'reviews_public_select'
  ) THEN
    CREATE POLICY "reviews_public_select" ON public.reviews
      FOR SELECT USING (true);
    RAISE NOTICE 'Added reviews_public_select on public.reviews';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Views — ensure security_invoker = on
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname = 'shop'
      AND viewname IN ('products_v', 'orders_v')
  LOOP
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', v.schemaname, v.viewname);
    RAISE NOTICE 'security_invoker=on set on %.%', v.schemaname, v.viewname;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Newsletter — ensure anon can only INSERT (not SELECT)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Remove any accidental SELECT policy for anon on newsletter_subscribers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'newsletter_subscribers'
      AND cmd = 'SELECT'
      AND roles @> '{anon}'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.newsletter_subscribers', r.policyname);
    RAISE NOTICE 'Dropped anon SELECT policy on newsletter_subscribers: %', r.policyname;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. Admin infrastructure — ensure is_admin() function exists
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users'
      AND policyname = 'admin_users_self_select'
  ) THEN
    CREATE POLICY "admin_users_self_select" ON public.admin_users
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. Ensure admin SELECT policy on orders exists
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'shop' AND tablename = 'orders' AND policyname = 'orders_admin_select'
  ) THEN
    CREATE POLICY "orders_admin_select" ON shop.orders
      FOR SELECT USING (public.is_admin());
    RAISE NOTICE 'Added orders_admin_select';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. Ensure contact_messages admin-read policy exists
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'shop' AND tablename = 'contact_messages' AND policyname = 'Only admins read'
  ) THEN
    CREATE POLICY "Only admins read" ON shop.contact_messages
      FOR SELECT TO authenticated USING (public.is_admin());
    RAISE NOTICE 'Added admin-read policy on contact_messages';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. Remove public ALL access on openai_tokens (API key leak risk)
-- ═══════════════════════════════════════════════════════════════════════════════

-- The `service_full_access` policy on public.openai_tokens grants ALL to the
-- public role with USING(true) / WITH CHECK(true). Service-role clients bypass
-- RLS anyway, so this policy only exposes API keys to any authenticated or anon
-- user. Drop it and rely on default-deny + service-role for writes.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'openai_tokens'
      AND roles @> '{public}'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.openai_tokens', r.policyname);
    RAISE NOTICE 'Dropped public policy on openai_tokens: %', r.policyname;
  END LOOP;
END $$;

-- Optional explicit service-role policy (no-op for RLS bypass but documents intent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'openai_tokens'
      AND policyname = 'openai_tokens_service_role'
  ) THEN
    CREATE POLICY "openai_tokens_service_role" ON public.openai_tokens
      FOR ALL TO service_role USING (true) WITH CHECK (true);
    RAISE NOTICE 'Added openai_tokens_service_role policy';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. Remove legacy email-match policy on orders (JWT-claim attack vector)
-- ═══════════════════════════════════════════════════════════════════════════════

-- The setup-customer-orders.sql added OR email = (SELECT ...) which is a known
-- attack vector. Replace with user_id-only check.
-- ⚠️ This means guest orders (user_id IS NULL) won't be visible via RLS.
--     Use service-role for guest order lookup, or add a separate guest-token flow.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'shop' AND tablename = 'orders'
      AND policyname = 'orders_select_own'
      AND qual LIKE '%email%'
  LOOP
    EXECUTE format('DROP POLICY %I ON shop.orders', r.policyname);
    RAISE NOTICE 'Dropped email-matching orders policy: % — replacing with user_id-only', r.policyname;

    CREATE POLICY "orders_select_own" ON shop.orders
      FOR SELECT USING (auth.uid() = user_id);
  END LOOP;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION: re-run audit-rls.sql after this script
-- ═══════════════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
SELECT 'fix-rls-gaps.sql complete — run audit-rls.sql to verify' AS status;
