-- Purpose: TikTok Shop integration — auth token cache + product publish state
-- Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
-- Pattern: analog zu cj_auth (single-row token cache)

create table if not exists public.tiktok_auth (
  id integer primary key default 1 check (id = 1),
  access_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token text not null,
  refresh_token_expires_at timestamptz not null,
  shop_cipher text,
  shop_id text,
  warehouse_id text,
  updated_at timestamptz not null default now()
);

alter table public.tiktok_auth enable row level security;

-- Publish-State auf products
alter table public.products
  add column if not exists tiktok_product_id text,
  add column if not exists tiktok_status text
    check (tiktok_status in ('pending', 'publishing', 'published', 'failed', 'skipped')),
  add column if not exists tiktok_last_error text,
  add column if not exists tiktok_published_at timestamptz,
  add column if not exists tiktok_last_synced_at timestamptz;

create index if not exists idx_products_tiktok_status
  on public.products (tiktok_status)
  where tiktok_status is not null;

comment on column public.products.tiktok_status is
  'pending = zum Publishen vorgemerkt; publishing = in Arbeit; published = live auf TikTok; failed = Fehler (siehe tiktok_last_error); skipped = manuell ausgeschlossen';
