-- Purpose: Add German title/description columns for storefront display
-- Run: Supabase SQL editor

alter table public.products
  add column if not exists title_de text,
  add column if not exists description_de text;

comment on column public.products.title_de is 'German display title (translated from CJ source title)';
comment on column public.products.description_de is 'German display description';
