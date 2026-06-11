-- Purpose: Row Level Security policies for the Next.js storefront (Step 2)
-- Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
--
-- Run this against the Supabase project (self-hosted or supabase.com) to
-- enable RLS on the products and wishlist_items tables.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/supabase/setup-rls.sql
-- or via Supabase Studio → SQL Editor

-- ── Products: public read, writes only via service role ───────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = true);

-- ── Wishlist: only the owning user can read/insert/delete their own items ────
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_select_own" ON wishlist_items;
DROP POLICY IF EXISTS "wishlist_insert_own" ON wishlist_items;
DROP POLICY IF EXISTS "wishlist_delete_own" ON wishlist_items;

CREATE POLICY "wishlist_select_own" ON wishlist_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wishlist_insert_own" ON wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlist_delete_own" ON wishlist_items
  FOR DELETE USING (auth.uid() = user_id);
