-- Reviews table with RLS
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_select" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_own_insert" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_own_update" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_own_delete" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- compare_at_price for sale pricing
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_price numeric;
