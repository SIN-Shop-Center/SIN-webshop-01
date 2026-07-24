-- Badge column for products (bestseller, neu, sale)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge text CHECK (badge IN ('bestseller', 'neu', 'sale'));
