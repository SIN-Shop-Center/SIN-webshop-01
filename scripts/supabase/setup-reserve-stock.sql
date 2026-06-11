-- Issue #37 — Inventory-Race-Condition Fix
-- Atomare Stock-Reservierung via DB-Funktion, kein Race möglich.
-- Wird aus cart.ts (addToCart, updateCart, removeFromCart) aufgerufen.
--
-- WICHTIG: Original-Bug — bei stock=0 nach Update war new_stock=0,
--   new_stock IS NULL Check schlug fehl, kein "stock exhausted".
-- Fix: GET DIAGNOSTICS affected_rows = ROW_COUNT, expliziter 0-Check.

SET search_path TO shop, public;

-- Reservieren: senkt Stock atomar oder schlägt fehl
CREATE OR REPLACE FUNCTION shop.reserve_stock(
  p_product_id UUID,
  p_qty INT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_stock INT;
  affected_rows INT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 OR p_qty > 99 THEN
    RAISE EXCEPTION 'invalid quantity' USING ERRCODE = 'P0002';
  END IF;

  UPDATE products
     SET stock = stock - p_qty
   WHERE id = p_product_id
     AND stock >= p_qty;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  IF affected_rows = 0 THEN
    RAISE EXCEPTION 'stock exhausted' USING ERRCODE = 'P0001';
  END IF;

  SELECT stock INTO new_stock FROM products WHERE id = p_product_id;
  RETURN new_stock;
END;
$$;

-- Public-Schema-Spiegel (PostgREST rpc() fällt auf public zurück)
CREATE OR REPLACE FUNCTION public.reserve_stock(
  p_product_id UUID,
  p_qty INT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_stock INT;
  affected_rows INT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 OR p_qty > 99 THEN
    RAISE EXCEPTION 'invalid quantity' USING ERRCODE = 'P0002';
  END IF;

  UPDATE products
     SET stock = stock - p_qty
   WHERE id = p_product_id
     AND stock >= p_qty;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  IF affected_rows = 0 THEN
    RAISE EXCEPTION 'stock exhausted' USING ERRCODE = 'P0001';
  END IF;

  SELECT stock INTO new_stock FROM products WHERE id = p_product_id;
  RETURN new_stock;
END;
$$;

-- Freigeben: hebt Stock wieder an (Item entfernt, Cart abgelaufen)
CREATE OR REPLACE FUNCTION shop.release_stock(
  p_product_id UUID,
  p_qty INT
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE products SET stock = stock + p_qty
  WHERE id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION public.release_stock(
  p_product_id UUID,
  p_qty INT
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE products SET stock = stock + p_qty
  WHERE id = p_product_id;
$$;
