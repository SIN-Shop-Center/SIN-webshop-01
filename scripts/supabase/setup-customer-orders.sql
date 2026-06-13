-- Purpose: Customer order history — RLS + shipping_address + timeline columns
-- Docs: AGENTS.md
--
-- Run against the Supabase project:
--   psql "$DATABASE_URL" -f scripts/supabase/setup-customer-orders.sql

-- ── Shipping address (stored from Stripe checkout session) ──────────────────
ALTER TABLE shop.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE shop.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE shop.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- ── RLS: Users see own orders via user_id OR verified email ────────────────
-- (Gast-Käufe: user_id IS NULL, aber email match erlaubt Zugriff nach Login)
ALTER TABLE shop.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON shop.orders;
CREATE POLICY "orders_select_own" ON shop.orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      auth.uid() IS NOT NULL
      AND email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
    )
  );

-- ── RLS: Order items — separate table (if migrated from JSONB) ─────────────
-- Currently items live in orders.items JSONB. If a future migration creates
-- order_items, apply the same RLS pattern:
--   ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "order_items_select_own" ON order_items
--     FOR SELECT USING (
--       order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
--     );

-- ── Indexes for customer-facing queries ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON shop.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_email_created
  ON shop.orders (email, created_at DESC)
  WHERE user_id IS NULL;
