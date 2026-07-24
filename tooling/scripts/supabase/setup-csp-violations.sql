-- CSP violation reports table (issue-40)
-- Receives reports from the Reporting API (report-to) and legacy report-uri.
-- 90-day retention — prune via scheduled job.

CREATE TABLE IF NOT EXISTS shop.csp_violations (
  id BIGSERIAL PRIMARY KEY,
  document_uri TEXT,
  violated_directive TEXT,
  blocked_uri TEXT,
  original_policy TEXT,
  user_agent TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csp_violations_directive
  ON shop.csp_violations(violated_directive, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_csp_violations_received
  ON shop.csp_violations(received_at DESC);

ALTER TABLE shop.csp_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert CSP violations"
  ON shop.csp_violations FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read CSP violations"
  ON shop.csp_violations FOR SELECT
  TO service_role
  USING (true);
