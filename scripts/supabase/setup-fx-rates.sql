-- FX-Rate Storage (shop schema) — centralized USD→EUR cache
-- Written by cron (fx-update), read by app/lib/fx-rate.ts and pricing-fx.ts.
-- Run: cat setup-fx-rates.sql | ssh ubuntu@92.5.60.87 \
--        "docker exec -i supabase-db psql -U postgres -d postgres -f -"

CREATE SCHEMA IF NOT EXISTS shop;

CREATE TABLE IF NOT EXISTS shop.fx_rates (
  from_currency TEXT NOT NULL,
  to_currency   TEXT NOT NULL,
  rate          NUMERIC(10, 6) NOT NULL,
  source        TEXT NOT NULL DEFAULT 'frankfurter',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fx_rates_pk PRIMARY KEY (from_currency, to_currency),
  CONSTRAINT fx_rates_rate_positive CHECK (rate > 0 AND rate < 1000)
);

ALTER TABLE shop.fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fx_rates public read" ON shop.fx_rates;
CREATE POLICY "fx_rates public read" ON shop.fx_rates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "fx_rates service write" ON shop.fx_rates;
CREATE POLICY "fx_rates service write" ON shop.fx_rates
  FOR ALL USING (auth.role() = 'service_role');

INSERT INTO shop.fx_rates (from_currency, to_currency, rate, source)
VALUES ('USD', 'EUR', 0.92, 'hardcoded')
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- Migration helper: copy data from old public.fx_rates if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fx_rates'
  ) THEN
    INSERT INTO shop.fx_rates (from_currency, to_currency, rate, source, updated_at)
    SELECT
      split_part(currency_pair, '_', 1),
      split_part(currency_pair, '_', 2),
      rate,
      'frankfurter',
      updated_at
    FROM public.fx_rates
    ON CONFLICT (from_currency, to_currency) DO NOTHING;
  END IF;
END
$$;
