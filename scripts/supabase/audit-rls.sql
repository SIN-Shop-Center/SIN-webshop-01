-- RLS-Audit (Issue #44)
-- 1. Tabellen ohne RLS finden
-- 2. Permissive Policies (qual = 'true' oder with_check = 'true') listen
-- 3. Cross-User-Lookup via email-Match eliminieren
-- 4. Admin-Whitelist via Tabelle statt JWT-Claim (manipulationssicher)
--
-- VORHER:  Snapshot der Policies machen, damit du Diff siehst
-- \copy (SELECT * FROM pg_policies WHERE schemaname IN ('public', 'shop')) TO '/tmp/policies_before.csv' CSV HEADER

-- 1. RLS-Status pro Tabelle
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname IN ('public', 'shop')
ORDER BY tablename;

-- 2. Permissive Policies (sollte 0 sein, außer Service-Role-Bypass)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname IN ('public', 'shop')
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;

-- 3. FIX: Orders NUR via user_id (Email-Match entfernt — JWT-Claim-Attacke)
DROP POLICY IF EXISTS "Users read own orders" ON orders;
CREATE POLICY "Users read own orders" ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Admin-Whitelist-Tabelle
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read admin list" ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Helper-Funktion: STABLE für Query-Plan-Caching, SECURITY DEFINER
-- damit RLS auf admin_users nicht doppelt greift.
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

-- 5. contact_messages: Admin-Read nur via is_admin()
DROP POLICY IF EXISTS "Only admins read" ON contact_messages;
CREATE POLICY "Only admins read" ON contact_messages
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Verifikation:
-- SELECT * FROM admin_users;  -- Jeremy (sich selbst) hinzufügen!
