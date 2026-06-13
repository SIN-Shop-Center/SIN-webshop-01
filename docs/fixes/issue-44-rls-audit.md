# Fix #44 — Supabase RLS-Lücken audit + Strict-Mode für alle User-Tabellen

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/44

## Context

AGENTS.md rule #4 says:

> RLS ist default-deny auf allen Tabellen. Neue Tabellen: SOFORT `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`

But the schema evolved over months and some tables may have slipped through. This script audits and forces RLS on all user-data tables.

## Step 1 — run the audit (5 Min, no code changes)

```sh
# Auf der VM:
ssh ubuntu@92.5.60.87 "
docker exec supabase-db psql -U postgres -d postgres < scripts/supabase/audit-rls.sql
" 2>&1
```

## Step 2 — the audit script (`scripts/supabase/audit-rls.sql`)

```sql
-- scripts/supabase/audit-rls.sql
-- Findet alle Tabellen OHNE RLS die User-Daten enthalten könnten.
-- Severity: HIGH wenn name in user/email/order/address etc.; MEDIUM sonst.

WITH all_tables AS (
  SELECT
    n.nspname AS schema,
    c.relname AS table,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS size
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relkind = 'r'                                      -- only tables
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
),
column_check AS (
  SELECT
    c.table_schema, c.table_name,
    bool_or(c.column_name IN (
      'user_id', 'email', 'owner_id', 'customer_id', 'auth_user_id'
    )) AS has_user_column
  FROM information_schema.columns c
  WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
  GROUP BY c.table_schema, c.table_name
)

SELECT
  t.schema || '.' || t.table AS "table_name",
  t.rls_enabled,
  t.rls_forced,
  t.size,
  CASE
    WHEN t.rls_enabled = false AND col.has_user_column = true
      THEN '🔴 HIGH: user-data table without RLS'
    WHEN t.rls_enabled = false
      THEN '🟡 MEDIUM: table without RLS'
    WHEN t.rls_enabled = true AND t.rls_forced = false
      THEN '🟢 OK (RLS enabled, not forced)'
    ELSE '✅ STRICT'
  END AS "audit"
FROM all_tables t
LEFT JOIN column_check col
  ON col.table_schema = t.schema AND col.table_name = t.table
WHERE t.schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'auth', 'storage', 'realtime')
   OR t.table LIKE '%user%' OR t.table LIKE '%email%' OR t.table LIKE '%order%'
   OR t.table LIKE '%address%' OR t.table LIKE '%customer%'
ORDER BY
  CASE WHEN t.rls_enabled = false AND col.has_user_column = true THEN 0
       WHEN t.rls_enabled = false THEN 1
       ELSE 2 END,
  t.schema, t.table;
```

## Step 3 — enable RLS + add strict mode for all flags

For each table in HIGH or MEDIUM:

```sql
-- Enable RLS
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.<table> FORCE ROW LEVEL SECURITY;   -- auch Owner muss RLS checken

-- Example policies (anpassen!)
-- SELECT: auth.uid() = user_id
-- INSERT: WITH CHECK auth.uid() = user_id
-- UPDATE: USING auth.uid() = user_id
-- DELETE: USING auth.uid() = user_id

CREATE POLICY "<table>_select_own" ON public.<table>
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "<table>_insert_self" ON public.<table>
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "<table>_update_own" ON public.<table>
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "<table>_delete_own" ON public.<table>
  FOR DELETE USING (auth.uid() = user_id);
```

## Step 4 — the generic strict-mode SQL

```sql
-- scripts/supabase/setup-rls-strict.sql
-- Enable RLS + FORCE on every user-data table that's not already strict

DO $$
DECLARE
  rec RECORD;
  t TEXT;
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema, c.relname AS table
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'realtime')
      AND c.relrowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', rec.schema, rec.table);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', rec.schema, rec.table);
    RAISE NOTICE 'RLS enabled + forced on: %.%', rec.schema, rec.table;
  END LOOP;
END $$;
```

## Step 5 — verify

```sh
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT
  count(*) FILTER (WHERE NOT relrowsecurity) AS rls_off,
  count(*) FILTER (WHERE relrowsecurity AND NOT relforcerowsecurity) AS rls_not_forced,
  count(*) FILTER (WHERE relrowsecurity AND relforcerowsecurity) AS rls_strict,
  count(*) AS total
FROM pg_class
WHERE relkind = 'r' AND relnamespace::regnamespace::text NOT IN ('pg_catalog', 'information_schema', 'pg_toast');
"
# Erwartet: rls_off=0, rls_not_forced=0, rls_strict=high number
```

## Acceptance

- `audit-rls.sql` returns 0 HIGH or MEDIUM findings
- `rls_strict` count = 100% of user tables
- Manual test: anon key kann KEINE user-data lesen
  ```sh
  curl -H "apikey: $ANON_KEY" \
    "https://supabase.delqhi.com/rest/v1/orders?select=*" \
    -H "Accept-Profile: shop"
  # Erwartet: [] (oder 401)
  ```

## Closing

```sh
gh issue close 44 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "RLS-Audit durchgeführt: 0 HIGH, 0 MEDIUM. FORCE ROW LEVEL SECURITY auf alle User-Tabellen."
```
