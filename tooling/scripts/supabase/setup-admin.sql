-- Deprecated on purpose.
-- Admin membership and its security contract are versioned in:
-- platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql
--
-- Apply migrations with:
--   pnpm db:migrate
--
-- Add an administrator only through a reviewed operator session, for example:
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = '<verified-admin-email>';
--
-- Never use auth.user_metadata.is_admin for authorization.

DO $$
BEGIN
  RAISE EXCEPTION 'Deprecated setup script. Run pnpm db:migrate and manage public.admin_users explicitly.';
END
$$;
