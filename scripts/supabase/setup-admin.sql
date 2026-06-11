-- Purpose: Admin user setup via Supabase Auth metadata (Step 8 of migration)
-- Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)
--
-- Run against the Supabase project:
--   psql "$DATABASE_URL" -f scripts/supabase/setup-admin.sql
--
-- HINWEIS: Email in der UPDATE-Zeile anpassen, bevor du das Script ausführst!

-- ── Admin-Flag in raw_user_meta_data setzen ────────────────────────────────────
-- Einmalig den eigenen Account zum Admin machen.
-- Vorher: DEINE-ADMIN-EMAIL@example.com durch deine echte E-Mail ersetzen.
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'DEINE-ADMIN-EMAIL@example.com';

-- ── Verifizieren ──────────────────────────────────────────────────────────────
SELECT
  email,
  raw_user_meta_data->>'is_admin' AS is_admin,
  created_at
FROM auth.users
WHERE raw_user_meta_data->>'is_admin' = 'true';
