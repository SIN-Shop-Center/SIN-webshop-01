-- Issue #35 — FX-Rate Storage
-- Tabelle für Wechselkurs-Paare, von frankfurter.app täglich aktualisiert.
-- Public Read, Admin Write via Service-Role.

CREATE TABLE IF NOT EXISTS fx_rates (
  currency_pair TEXT PRIMARY KEY,           -- 'USD_EUR'
  rate NUMERIC(10, 6) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

-- Public read (Anwendung kann ohne Auth die aktuelle Rate lesen)
CREATE POLICY "fx_rates public read" ON fx_rates
  FOR SELECT
  USING (true);

-- Initialer Fallback-Wert, falls frankfurter-Cron noch nicht gelaufen ist
INSERT INTO fx_rates (currency_pair, rate)
VALUES ('USD_EUR', 0.92)
ON CONFLICT (currency_pair) DO NOTHING;
