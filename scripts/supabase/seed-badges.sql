-- Purpose: Set realistic badges based on real product data.
-- Docs: app/lib/product-badges.ts
--
-- Logic:
--   - 'neu'         : created in last 30 days
--   - 'bestseller'  : sold_count >= 300 (from non-sale products)
--   - 'top-rated'   : rating >= 4.5 AND rating_count >= 50
--   - 'low-stock'   : stock BETWEEN 1 AND 10

UPDATE shop.products p SET badge = 'neu'
FROM (
  SELECT id FROM shop.products
  WHERE created_at >= NOW() - INTERVAL '30 days' AND is_active = true
  LIMIT 4
) n WHERE p.id = n.id;

UPDATE shop.products p SET badge = 'bestseller'
FROM (
  SELECT id FROM shop.products
  WHERE sold_count >= 300 AND is_active = true AND compare_at_price IS NULL
  ORDER BY sold_count DESC LIMIT 4
) b WHERE p.id = b.id;

UPDATE shop.products p SET badge = 'top-rated'
FROM (
  SELECT id FROM shop.products
  WHERE rating >= 4.5 AND rating_count >= 50 AND is_active = true AND compare_at_price IS NULL
  LIMIT 3
) t WHERE p.id = t.id;

UPDATE shop.products p SET badge = 'low-stock'
FROM (
  SELECT id FROM shop.products
  WHERE stock BETWEEN 1 AND 10 AND is_active = true AND compare_at_price IS NULL
  LIMIT 3
) l WHERE p.id = l.id;

SELECT badge, count(*) FROM shop.products WHERE badge IS NOT NULL GROUP BY badge ORDER BY badge;
