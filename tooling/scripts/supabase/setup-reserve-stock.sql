-- DEPRECATED: Atomic stock reservation and stale-cart cleanup are versioned in
-- platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql.

do $$
begin
  raise exception 'setup-reserve-stock.sql is deprecated; run pnpm db:migrate';
end
$$;
