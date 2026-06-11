-- Schema-Mapping Views: liefern die vom App-Code erwarteten Spaltennamen
-- ('title', 'image_url', 'amount_total', 'fulfillment_status') obwohl die
-- echten shop.products / shop.orders Tabellen 'name', 'images' (jsonb),
-- 'subtotal_amount' (integer), 'payment_status' haben.
--
-- Strategie: SQL-Views (PostgREST-native) statt Code-Mapping.
-- Vorteile:
--   1. Code unverändert (queries.ts, Components, etc.)
--   2. RLS-Policies werden via security_invoker=on vererbt
--   3. JSON-Pfad-Extraktion (images->0) passiert serverseitig in der View
--   4. Casting (subtotal_amount vs subtotal*100) automatisch

SET search_path TO shop, public;

-- ===================================================================
-- PRODUCTS-VIEW
-- ===================================================================
DROP VIEW IF EXISTS shop.products_v;
CREATE VIEW shop.products_v AS
SELECT
  p.id,
  p.name AS title,                                    -- name → title
  p.slug,
  p.description,
  p.price,
  p.original_price,
  COALESCE(p.images->>0, '') AS image_url,            -- images[0] → image_url
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(p.images)),
    ARRAY[]::text[]
  ) AS image_gallery,                                  -- images[] → text[]
  p.stock,
  p.is_active,
  p.variants,
  p.metadata,
  p.created_at,
  p.updated_at,
  p.cj_product_id,
  p.cj_variant_id,
  p.cj_sku,
  p.cj_cost_price,
  p.cj_last_synced_at,
  COALESCE((p.metadata->>'rating')::numeric, 0) AS rating,
  COALESCE((p.metadata->>'ratingCount')::integer, 0) AS rating_count,
  COALESCE((p.metadata->>'is_featured')::boolean, false) AS is_featured
FROM shop.products p;

ALTER VIEW shop.products_v SET (security_invoker = true);
GRANT SELECT ON shop.products_v TO anon, authenticated, service_role;

-- ===================================================================
-- ORDERS-VIEW
-- ===================================================================
DROP VIEW IF EXISTS shop.orders_v;
CREATE VIEW shop.orders_v AS
SELECT
  o.id,
  o.user_id,
  o.customer_id,
  o.email,
  o.customer_name,
  COALESCE(
    o.subtotal_amount,
    (o.subtotal * 100)::integer,
    (o.total * 100)::integer
  ) AS amount_total,
  o.subtotal_amount,
  o.subtotal,
  o.shipping_amount,
  o.shipping_cost,
  o.tax_amount,
  o.tax,
  o.total_amount,
  o.total,
  o.currency,
  CASE o.payment_status
    WHEN 'pending' THEN 'pending'
    WHEN 'paid' THEN 'pending'
    WHEN 'processing' THEN 'processing'
    WHEN 'shipped' THEN 'shipped'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'refunded' THEN 'refunded'
    WHEN 'failed' THEN 'failed'
    ELSE 'pending'
  END AS fulfillment_status,
  o.status,
  o.payment_status,
  o.payment_provider,
  o.payment_reference,
  o.payment_method,
  o.shipping_method,
  o.shipping_address_id,
  o.shipping_address,
  o.billing_address,
  o.tracking_number,
  o.tracking_url,
  o.notes,
  o.customer_notes,
  o.internal_notes,
  o.created_at,
  o.updated_at,
  o.stripe_session_id,
  o.stripe_payment_intent,
  o.items,
  o.tracking_notified_at
FROM shop.orders o;

ALTER VIEW shop.orders_v SET (security_invoker = true);
GRANT SELECT ON shop.orders_v TO anon, authenticated, service_role;

-- PostgREST Schema-Cache neu laden — Views werden erst nach Reload sichtbar
NOTIFY pgrst, 'reload schema';

SELECT 'products_v und orders_v erstellt + PostgST cache reloaded' AS status;
