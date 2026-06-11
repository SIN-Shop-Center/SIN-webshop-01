-- Purpose: Customer order history RLS (Step 9 of migration)
-- Docs: PLAN-VERKAUFSFAEHIG.md (Step 9 — Customer orders + shipping)
--
-- Run against the Supabase project:
--   psql "$DATABASE_URL" -f scripts/supabase/setup-customer-orders.sql

-- Bestellungen auch per E-Mail zuordenbar machen (Gast-Käufe):
-- User sehen eigene Orders via user_id ODER via verifizierter E-Mail.

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      auth.uid() IS NOT NULL
      AND email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
    )
  );
