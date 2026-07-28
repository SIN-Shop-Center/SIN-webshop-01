-- DEPRECATED: The ShopSIN order contract is versioned in
-- platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql.

do $$
begin
  raise exception 'setup-orders.sql is deprecated; run pnpm db:migrate';
end
$$;
