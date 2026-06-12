-- scripts/supabase/setup-stock-reservation.sql
-- FIX #37: Inventory-Race-Condition
BEGIN;

ALTER TABLE shop.products
  ADD COLUMN IF NOT EXISTS reserved_qty INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS shop.cart_reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     TEXT NOT NULL,
  product_id  UUID NOT NULL REFERENCES shop.products(id) ON DELETE CASCADE,
  qty         INT  NOT NULL CHECK (qty > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_reservations_created
  ON shop.cart_reservations (created_at);

-- Atomare Reservierung
CREATE OR REPLACE FUNCTION shop.reserve_stock(
  p_product_id UUID, p_qty INT, p_cart_id TEXT
) RETURNS INT AS $$
DECLARE v_remaining INT;
BEGIN
  UPDATE shop.products
     SET stock = stock - p_qty,
         reserved_qty = reserved_qty + p_qty
   WHERE id = p_product_id AND stock >= p_qty
  RETURNING stock INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stock_exhausted' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO shop.cart_reservations (cart_id, product_id, qty)
  VALUES (p_cart_id, p_product_id, p_qty)
  ON CONFLICT (cart_id, product_id)
  DO UPDATE SET qty = shop.cart_reservations.qty + p_qty,
                created_at = NOW();

  RETURN v_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reservierung anpassen
CREATE OR REPLACE FUNCTION shop.adjust_reservation(
  p_product_id UUID, p_new_qty INT, p_cart_id TEXT
) RETURNS VOID AS $$
DECLARE v_old_qty INT; v_delta INT;
BEGIN
  SELECT qty INTO v_old_qty FROM shop.cart_reservations
   WHERE cart_id = p_cart_id AND product_id = p_product_id
   FOR UPDATE;
  IF NOT FOUND THEN v_old_qty := 0; END IF;

  v_delta := p_new_qty - v_old_qty;
  IF v_delta = 0 THEN RETURN; END IF;

  IF v_delta > 0 THEN
    UPDATE shop.products
       SET stock = stock - v_delta, reserved_qty = reserved_qty + v_delta
     WHERE id = p_product_id AND stock >= v_delta;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock_exhausted' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    UPDATE shop.products
       SET stock = stock - v_delta,
           reserved_qty = GREATEST(reserved_qty + v_delta, 0)
     WHERE id = p_product_id;
  END IF;

  IF p_new_qty = 0 THEN
    DELETE FROM shop.cart_reservations
     WHERE cart_id = p_cart_id AND product_id = p_product_id;
  ELSE
    INSERT INTO shop.cart_reservations (cart_id, product_id, qty)
    VALUES (p_cart_id, p_product_id, p_new_qty)
    ON CONFLICT (cart_id, product_id)
    DO UPDATE SET qty = p_new_qty, created_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reservierung freigeben
CREATE OR REPLACE FUNCTION shop.release_reservation(
  p_product_id UUID, p_cart_id TEXT
) RETURNS VOID AS $$
DECLARE v_qty INT;
BEGIN
  DELETE FROM shop.cart_reservations
   WHERE cart_id = p_cart_id AND product_id = p_product_id
  RETURNING qty INTO v_qty;
  IF FOUND THEN
    UPDATE shop.products
       SET stock = stock + v_qty,
           reserved_qty = GREATEST(reserved_qty - v_qty, 0)
     WHERE id = p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Checkout abgeschlossen
CREATE OR REPLACE FUNCTION shop.finalize_reservations(p_cart_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE shop.products p
     SET reserved_qty = GREATEST(p.reserved_qty - cr.qty, 0)
    FROM shop.cart_reservations cr
   WHERE cr.cart_id = p_cart_id AND cr.product_id = p.id;
  DELETE FROM shop.cart_reservations WHERE cart_id = p_cart_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup stale
CREATE OR REPLACE FUNCTION shop.cleanup_stale_reservations()
RETURNS INT AS $$
DECLARE v_count INT;
BEGIN
  UPDATE shop.products p
     SET stock = p.stock + cr.qty,
         reserved_qty = GREATEST(p.reserved_qty - cr.qty, 0)
    FROM shop.cart_reservations cr
   WHERE cr.product_id = p.id
     AND cr.created_at < NOW() - INTERVAL '24 hours';

  DELETE FROM shop.cart_reservations
   WHERE created_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
