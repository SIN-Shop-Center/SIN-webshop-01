-- Purpose: German names for raw English CJ categories
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-category-translations.sql

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_de text;

-- Known CJ-to-German mappings (extend as needed)
UPDATE public.categories SET name_de = t.de FROM (VALUES
  ('Pet Clothings', 'Haustierbekleidung'),
  ('Vulcanize Shoe', 'Sneaker & Freizeitschuhe'),
  ('Necklace & Pendants', 'Halsketten & Anhänger'),
  ('Earrings', 'Ohrringe'),
  ('Bracelets & Bangles', 'Armbänder & Armreifen'),
  ('Bedding', 'Bettwaren'),
  ('Backpacks', 'Rucksäcke'),
  ('Dresses', 'Kleider'),
  ('Pumps', 'Pumps & Absatzschuhe'),
  ('Speakers', 'Lautsprecher'),
  ('Facial Care', 'Gesichtspflege'),
  ('Storage', 'Aufbewahrung'),
  ('Pet Supplies', 'Haustierbedarf'),
  ('Home & Garden', 'Haus & Garten'),
  ('Beauty & Personal Care', 'Beauty & Körperpflege'),
  ('Electronics', 'Elektronik'),
  ('Clothing', 'Bekleidung'),
  ('Shoes', 'Schuhe'),
  ('Accessories', 'Accessoires'),
  ('Toys & Hobbies', 'Spielzeug & Hobby'),
  ('Sports & Outdoors', 'Sport & Outdoor')
) AS t(en, de)
WHERE categories.name = t.en;

-- Fallback: use English name where no translation exists
UPDATE public.categories SET name_de = name WHERE name_de IS NULL;
