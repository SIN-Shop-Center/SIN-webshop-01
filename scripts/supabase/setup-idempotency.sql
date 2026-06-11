-- Idempotenz auf DB-Ebene: doppelte Stripe-Sessions sind unmöglich,
-- egal wie viele Webhook-Zustellungen parallel eintreffen.
--
-- Wenn bereits Duplikate existieren (z.B. durch Bug vor dem Fix), werden
-- die älteren zuerst gelöscht. Die jüngste Bestellung pro stripe_session_id
-- bleibt erhalten.

-- Schritt 1: Vorhandene Duplikate deduplizieren (älteste raus)
DELETE FROM orders a USING orders b
WHERE a.stripe_session_id = b.stripe_session_id
  AND a.created_at > b.created_at;

-- Schritt 2: UNIQUE-Constraint anlegen
ALTER TABLE orders
  ADD CONSTRAINT orders_stripe_session_id_key UNIQUE (stripe_session_id);

-- Verifikation:
-- SELECT conname, contype FROM pg_constraint
-- WHERE conrelid = 'orders'::regclass AND contype = 'u';
-- Erwartet: orders_stripe_session_id_key in der Liste.
