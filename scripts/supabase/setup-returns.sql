-- Issue #45 — Refund / RMA (Widerrufsrecht 14 Tage)
-- Customer-initiierte Returns, Admin-Approval triggert Stripe-Refund.

CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  photos TEXT[],
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  refund_amount_cents INT,
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_returns_user ON return_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_status ON return_requests(status, created_at DESC);

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

-- Kunde sieht eigene Returns
CREATE POLICY "Users see own returns" ON return_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Kunde erstellt eigene Returns
CREATE POLICY "Users create own returns" ON return_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin (via is_admin()) liest und aktualisiert alle
CREATE POLICY "admins read returns" ON return_requests
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "admins update returns" ON return_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
