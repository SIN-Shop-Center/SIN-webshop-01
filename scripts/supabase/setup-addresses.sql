-- Purpose: Adressbuch + Profil für Customer Accounts (Issue #55)
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-addresses.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Zuhause',
  full_name   TEXT NOT NULL,
  street      TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city        TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'DE',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.customer_addresses (user_id);

-- Nur eine Default-Adresse pro User
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default
  ON public.customer_addresses (user_id) WHERE is_default;

-- RLS: User sieht/ändert nur eigene Adressen
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "addresses_select" ON public.customer_addresses;
CREATE POLICY "addresses_select" ON public.customer_addresses
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_insert" ON public.customer_addresses;
CREATE POLICY "addresses_insert" ON public.customer_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_update" ON public.customer_addresses;
CREATE POLICY "addresses_update" ON public.customer_addresses
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_delete" ON public.customer_addresses;
CREATE POLICY "addresses_delete" ON public.customer_addresses
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;
