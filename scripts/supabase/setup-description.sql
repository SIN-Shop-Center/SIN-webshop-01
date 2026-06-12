-- Purpose: HTML description column for rich CJ product descriptions
-- Docs: AGENTS.md
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-description.sql

ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS description_html text;
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS default_cj_variant_id text;
