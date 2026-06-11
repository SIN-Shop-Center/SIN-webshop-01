-- Issue #49 — PostgreSQL Full-Text Search
-- GIN-Index auf tsvector mit Gewichtung (Title > Description > Category).
-- Suchanfragen via websearch_to_tsquery mit deutscher Konfiguration.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(category, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search
  ON products
  USING GIN (search_vector);
