CREATE OR REPLACE FUNCTION shop.log_product_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  INSERT INTO shop.admin_audit_log (admin_user_id, action, resource_type, resource_id, before_state, after_state)
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
$fn$;
