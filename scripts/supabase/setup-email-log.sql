-- Purpose: Email log table for tracking all outgoing transactional emails
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-email-log.sql

-- ── Email Log ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES shop.orders(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,       -- order_confirmation | order_shipped | order_delivered | welcome
  recipient TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent',  -- sent | failed
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_log_order ON shop.email_log (order_id);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON shop.email_log (recipient);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON shop.email_log (email_type);

-- RLS: service role can insert; users can read their own order emails
ALTER TABLE shop.email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_log_service_insert" ON shop.email_log;
CREATE POLICY "email_log_service_insert" ON shop.email_log
  FOR INSERT
  WITH CHECK (true);  -- service role bypasses RLS; this allows server actions too

DROP POLICY IF EXISTS "email_log_user_read_own" ON shop.email_log;
CREATE POLICY "email_log_user_read_own" ON shop.email_log
  FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM shop.orders o WHERE o.user_id = auth.uid()
    )
  );
