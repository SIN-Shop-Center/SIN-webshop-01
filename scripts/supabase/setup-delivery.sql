-- Purpose: Delivery estimate columns for products (CJ logisticInfo)
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-delivery.sql

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_days_min int NOT NULL DEFAULT 7;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_days_max int NOT NULL DEFAULT 15;
