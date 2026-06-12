-- Purpose: Admin user table + RPC for fulfillment oversight
-- Docs: AGENTS.md
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-admin.sql
-- Then: INSERT INTO public.admin_users (user_id)
--       SELECT id FROM auth.users WHERE email = 'opensin@gmx.com';

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_self_select" ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "orders_admin_select" ON public.orders
  FOR SELECT USING (public.is_admin());
