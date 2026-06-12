-- Purpose: Add compare_at_price, image_gallery, variants, badge, sold_count, rating, rating_count to products
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-product-media.sql
-- Idempotent — uses IF NOT EXISTS for every column

-- Sale pricing (was already added in setup-reviews.sql, kept here for completeness)
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS compare_at_price numeric;

-- PDP image gallery
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS image_gallery text[] NOT NULL DEFAULT '{}'::text[];

-- Variant selector (colors/sizes/etc.) — stored as JSONB
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Marketing badges (bestseller / neu / sale)
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS badge text CHECK (badge IN ('bestseller', 'neu', 'sale'));

-- Social proof
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS sold_count int NOT NULL DEFAULT 0;
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 0;
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS rating_count int NOT NULL DEFAULT 0;

-- Reload PostgREST schema cache so new columns are immediately visible via REST
NOTIFY pgrst, 'reload schema';

SELECT 'products table media columns ensured' AS status;
