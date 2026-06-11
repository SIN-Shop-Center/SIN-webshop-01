-- Purpose: Orders table for the Next.js storefront (Step 4 of migration)
-- Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
--
-- Run against the Supabase project:
--   psql "$DATABASE_URL" -f scripts/supabase/setup-orders.sql

-- ── Orders ────────────────────────────────────────────────────────────────────
-- Populated by the Stripe webhook (service-role client) after successful payment.
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  amount_total INTEGER NOT NULL, -- in Cents
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'paid',
  items JSONB NOT NULL, -- [{product_id, title, quantity, unit_amount}]
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);

-- RLS: Users see only their own orders; writes only via service role (webhook).
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (auth.uid() = user_id);
