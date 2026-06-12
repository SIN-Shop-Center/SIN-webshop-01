-- Purpose: Stellt sicher, dass shop.products die Spalten hat, die
-- products_v (View) und der VariantSelector erwarten.
-- Ausführen via Supabase SQL Editor oder psql.
-- Docs: scripts/supabase/setup-variants-columns.doc.md

SET search_path TO shop, public;

ALTER TABLE shop.products
  ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS image_gallery text[] DEFAULT ARRAY[]::text[];

-- PostgREST-Cache neu laden, damit die neuen Spalten sichtbar sind
NOTIFY pgrst, 'reload schema';

SELECT 'variants + image_gallery Spalten bereit' AS status;
