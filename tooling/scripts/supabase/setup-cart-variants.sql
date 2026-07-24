-- DEPRECATED: Cart variant support is versioned in
-- platform/infra/supabase/migrations/20260723010000_storefront_runtime_contract.sql.
-- The canonical application column is variant_id; OAuth/CJ runtime IDs remain
-- explicit in product and order metadata.

do $$
begin
  raise exception 'setup-cart-variants.sql is deprecated; run pnpm db:migrate';
end
$$;
