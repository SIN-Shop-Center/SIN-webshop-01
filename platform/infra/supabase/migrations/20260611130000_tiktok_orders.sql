-- Purpose: TikTok-Order-Tracking — verhindert Doppel-Forwarding an CJ
-- Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md (Stufe 5)

create table if not exists public.tiktok_orders (
  tiktok_order_id text primary key,
  status text not null default 'received'
    check (status in ('received', 'forwarded_to_cj', 'cj_failed', 'shipped', 'cancelled')),
  cj_order_id text,
  tracking_number text,
  last_error text,
  raw_order jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tiktok_orders enable row level security;

create index if not exists idx_tiktok_orders_status on public.tiktok_orders (status);
