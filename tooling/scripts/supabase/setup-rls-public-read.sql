-- Docs: setup-rls-public-read.doc.md
-- Purpose: RLS policies for anonymous public read access on shop tables
-- After the default-deny rollout, storefront needs explicit SELECT policies.
-- Run via: cat setup-rls-public-read.sql | ssh ubuntu@92.5.60.87 \
--            "docker exec -i supabase-db psql -U postgres -d postgres -f -"
-- Prerequisite: shop schema must be in PostgREST exposed schemas:
--   PGRST_DB_SCHEMAS=public,storage,graphql_public,shop
--   ALTER ROLE authenticator SET search_path TO 'shop', 'public', 'extensions';
--   ALTER ROLE anon SET search_path TO 'shop', 'public', 'extensions';
-- Note: product_images, product_categories, reviews tables do NOT exist in this schema.
--   Images are in products.images JSONB; categories use products.category_id FK.

-- Products: only active products visible to public
DROP POLICY IF EXISTS "products_public_read" ON shop.products;
CREATE POLICY "products_public_read" ON shop.products
  FOR SELECT USING (is_active = true);

-- Categories: any user can read
DROP POLICY IF EXISTS "categories_public_read" ON shop.categories;
CREATE POLICY "categories_public_read" ON shop.categories
  FOR SELECT USING (true);

-- FX rates: any user can read
DROP POLICY IF EXISTS "fx_rates public read" ON shop.fx_rates;
CREATE POLICY "fx_rates public read" ON shop.fx_rates
  FOR SELECT USING (true);

-- Verify
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'shop'
ORDER BY tablename, policyname;
