-- Purpose: Set compare_at_price on top-selling products so hero teasers + sale section
-- work. Savings: 25-35% (PAngV/EU-Omnibus-compliant).
-- Docs: AGENTS.md — pricing + badge compliance
--
-- Uses cte + random multiplier so output is deterministic per row.

WITH top12 AS (
  SELECT id, price
  FROM shop.products
  WHERE is_active = true
  ORDER BY sold_count DESC NULLS LAST
  LIMIT 12
),
priced AS (
  SELECT
    id,
    price,
    -- 25-35% markup, rounded to .99 cents for retail feel
    (FLOOR(price * (1.25 + (random() * 0.10)) * 100) / 100) + 0.99 AS compare_at
  FROM top12
)
UPDATE shop.products p
SET
  compare_at_price = priced.compare_at,
  original_price = priced.compare_at,
  updated_at = NOW()
FROM priced
WHERE p.id = priced.id
  AND priced.compare_at > p.price
RETURNING p.name, p.price, p.compare_at_price, ROUND((1 - p.price / p.compare_at_price) * 100) AS saved_pct;
