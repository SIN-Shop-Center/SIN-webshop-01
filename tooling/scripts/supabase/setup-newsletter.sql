-- Deprecated on purpose.
-- Newsletter double-opt-in is versioned in:
-- platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql
--
-- Apply with:
--   pnpm db:migrate

DO $$
BEGIN
  RAISE EXCEPTION 'Deprecated setup script. Run pnpm db:migrate.';
END
$$;
