-- DEPRECATED: The storefront cart schema is versioned in
-- platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql.
--
-- Run from the repository root:
--   pnpm db:migrate:status
--   pnpm db:migrate
--
-- This file intentionally aborts so an operator cannot recreate the obsolete
-- (cart_id, product_id)-only uniqueness contract and break product variants.

do $$
begin
  raise exception 'setup-cart.sql is deprecated; run pnpm db:migrate';
end
$$;
