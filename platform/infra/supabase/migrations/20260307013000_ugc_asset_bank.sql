create table if not exists public.ugc_asset_bank (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references public.ugc_generation_runs(id) on delete cascade,
  variant_id uuid references public.ugc_generation_variants(id) on delete set null,
  creative_asset_id uuid references public.creative_assets(id) on delete set null,
  channel text not null default 'tiktok',
  status text not null default 'ready',
  storage_provider text not null default 'r2',
  bucket text not null,
  video_object_key text not null,
  video_etag text,
  video_size_bytes bigint not null default 0,
  video_mime_type text not null default 'video/mp4',
  thumbnail_object_key text,
  thumbnail_etag text,
  thumbnail_size_bytes bigint not null default 0,
  thumbnail_mime_type text,
  source_video_url text,
  source_thumbnail_url text,
  visibility text not null default 'private',
  metadata jsonb not null default '{}'::jsonb,
  posted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, video_object_key)
);

create index if not exists idx_ugc_asset_bank_status
  on public.ugc_asset_bank(status, channel, created_at desc);

create index if not exists idx_ugc_asset_bank_run
  on public.ugc_asset_bank(run_id, created_at desc);

create index if not exists idx_ugc_asset_bank_variant
  on public.ugc_asset_bank(variant_id);

drop trigger if exists trg_ugc_asset_bank_updated on public.ugc_asset_bank;
create trigger trg_ugc_asset_bank_updated before update on public.ugc_asset_bank
for each row execute procedure public.touch_updated_at();

create table if not exists public.ugc_posting_queue (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.ugc_asset_bank(id) on delete cascade,
  channel text not null default 'tiktok',
  status text not null default 'ready',
  scheduled_for timestamptz not null default now(),
  claim_token text,
  claimed_by text,
  claimed_at timestamptz,
  posted_at timestamptz,
  delete_after_posted boolean not null default true,
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, channel)
);

create index if not exists idx_ugc_posting_queue_ready
  on public.ugc_posting_queue(channel, status, scheduled_for asc, created_at asc);

create index if not exists idx_ugc_posting_queue_claimed
  on public.ugc_posting_queue(status, claimed_by, claimed_at desc);

drop trigger if exists trg_ugc_posting_queue_updated on public.ugc_posting_queue;
create trigger trg_ugc_posting_queue_updated before update on public.ugc_posting_queue
for each row execute procedure public.touch_updated_at();
