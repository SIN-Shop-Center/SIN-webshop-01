-- Purpose: Wishlist/Merkliste table with RLS
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-wishlist.sql

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_own_select" ON public.wishlist_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wishlist_own_insert" ON public.wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlist_own_delete" ON public.wishlist_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist_items (user_id, created_at DESC);
