-- DEPRECATED: Stripe order idempotency is versioned in
-- platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql.
--
-- The historical script deleted duplicate business records automatically and
-- could remove the newer order. The migration now aborts on duplicates so they
-- can be reconciled with Stripe before a unique index is created.

do $$
begin
  raise exception 'setup-idempotency.sql is deprecated; run pnpm db:migrate';
end
$$;
