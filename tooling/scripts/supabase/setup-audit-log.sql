-- Issue #50 — Admin Audit-Log
-- Trigger-basierte Protokollierung aller Produkt-Mutationen.
-- 90 Tage Retention (in Cron-Aufräumer aufzuräumen).

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin
  ON admin_audit_log(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_resource
  ON admin_audit_log(resource_type, resource_id, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Nur Admins lesen Audit-Log
CREATE POLICY "admins read audit" ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Auto-Trigger: alle UPDATE/DELETE auf products loggen
CREATE OR REPLACE FUNCTION log_product_changes() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_audit_log (admin_user_id, action, resource_type, resource_id, before_state, after_state)
  VALUES (
    auth.uid(),
    TG_OP,
    'product',
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_products ON products;
CREATE TRIGGER trg_audit_products
  AFTER UPDATE OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_product_changes();
