-- DEPRECATED: Webhook audit/idempotency support is versioned in
-- platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql.
-- processed_events is audit-only; orders.stripe_session_id is the durable
-- concurrency gate.

do $$
begin
  raise exception 'setup-processed-events.sql is deprecated; run pnpm db:migrate';
end
$$;
