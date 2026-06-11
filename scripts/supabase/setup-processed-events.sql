-- Issue #54 — Webhook Replay-Schutz
-- Event-Level-Idempotenz zusätzlich zur Order-Level (UNIQUE auf stripe_session_id).
-- Stripe event.id (evt_...) wird hier als PK abgelegt.

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,         -- Stripe event.id
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_events_at
  ON processed_events(processed_at);

-- Cleanup-Cron (im cart-cleanup mit drin) löscht Einträge > 30 Tage
