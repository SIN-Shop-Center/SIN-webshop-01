-- Newsletter subscribers table
-- Docs: app/actions/newsletter.ts

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anonyme Benutzer dürfen Eintragen (INSERT), aber nicht Lesen (SELECT)
CREATE POLICY "newsletter_anon_insert" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);
