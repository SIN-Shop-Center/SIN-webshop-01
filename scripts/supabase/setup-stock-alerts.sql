-- Issue #53 — Stock-Alert Subscriptions
-- Customer trägt Email ein → cj-sync-Cron triggert beim Restock Email.

CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, email)
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_pending
  ON stock_alerts(product_id)
  WHERE notified_at IS NULL;

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- Inserts nur via Server Action (Service Role umgeht RLS),
-- kein Public-Access nötig.
-- Customer-Lookup ginge via eigener user_id-Spalte — aktuell:
-- Inserts über Service-Role-Client (createAdminClient) aus
-- app/lib/actions/stock-alerts.ts.
