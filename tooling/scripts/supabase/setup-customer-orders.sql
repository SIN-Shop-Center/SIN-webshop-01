-- Deprecated on purpose.
-- Customer order columns and owner-only RLS are versioned in:
-- platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql
--
-- The former email-based RLS fallback is intentionally removed. Guest orders
-- must be claimed through an explicit verified flow, never by ambient email
-- equality alone.

DO $$
BEGIN
  RAISE EXCEPTION 'Deprecated setup script. Run pnpm db:migrate.';
END
$$;
