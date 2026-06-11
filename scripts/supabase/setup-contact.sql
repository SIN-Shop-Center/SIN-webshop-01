-- Purpose: Contact form messages table (Step 8 of migration)
-- Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)
--
-- Run against the Supabase project:
--   psql "$DATABASE_URL" -f scripts/supabase/setup-contact.sql

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new', -- new | read | replied | archived
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages (created_at DESC);

-- RLS: nobody reads via anon/authenticated — admin uses service role.
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
-- (no policies = nobody has access)
