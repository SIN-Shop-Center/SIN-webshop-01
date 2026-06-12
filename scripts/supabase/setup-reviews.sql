-- Purpose: Reviews v2 — only verified buyers + supports imported CJ reviews
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-reviews.sql
-- Idempotent: uses IF NOT EXISTS / DROP IF EXISTS

-- Make user_id nullable (CJ reviews have no auth user)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Schema enhancements
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'shop';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS cj_comment_id text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS image_urls text[];

-- compare_at_price for sale pricing
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge text CHECK (badge IN ('bestseller', 'neu', 'sale'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sold_count int NOT NULL DEFAULT 0;

-- Replace unique constraint with partial unique indexes
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_product_id_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_product_user_unique
  ON public.reviews (product_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_cj_comment_unique
  ON public.reviews (cj_comment_id) WHERE cj_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews (product_id, created_at DESC);

-- Purchase verification function
CREATE OR REPLACE FUNCTION public.has_purchased(p_product uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = auth.uid()
      AND o.status IN ('paid', 'shipped', 'fulfilled', 'completed')
      AND o.items @> jsonb_build_array(jsonb_build_object('product_id', p_product::text))
  );
$$;

REVOKE ALL ON FUNCTION public.has_purchased(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_purchased(uuid) TO authenticated;

-- Refresh aggregated ratings function
CREATE OR REPLACE FUNCTION public.refresh_product_ratings()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE products p SET
    rating = COALESCE(r.avg_rating, 0),
    rating_count = COALESCE(r.cnt, 0)
  FROM (
    SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS cnt
    FROM reviews
    GROUP BY product_id
  ) r
  WHERE p.id = r.product_id;
$$;

REVOKE ALL ON FUNCTION public.refresh_product_ratings() FROM anon, authenticated;

-- Tighten RLS: only verified buyers may insert (auth user)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_own_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_own_update" ON public.reviews;
DROP POLICY IF EXISTS "reviews_own_delete" ON public.reviews;

CREATE POLICY "reviews_public_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_verified_buyer_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND source = 'shop'
    AND public.has_purchased(product_id)
  );
CREATE POLICY "reviews_own_update" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id AND source = 'shop');
CREATE POLICY "reviews_own_delete" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id AND source = 'shop');
