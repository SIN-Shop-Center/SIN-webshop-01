create table if not exists public.ugc_person_assets (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  source_kind text not null default 'upload',
  image_url text,
  preview_url text,
  source_data_url text,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ugc_person_assets_updated
  on public.ugc_person_assets(updated_at desc);

create unique index if not exists idx_ugc_person_assets_single_default
  on public.ugc_person_assets(is_default)
  where is_default = true;

drop trigger if exists trg_ugc_person_assets_updated on public.ugc_person_assets;
create trigger trg_ugc_person_assets_updated before update on public.ugc_person_assets
for each row execute procedure public.touch_updated_at();

create table if not exists public.ugc_generation_runs (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  person_asset_id uuid not null references public.ugc_person_assets(id) on delete restrict,
  title text not null,
  status text not null default 'queued',
  status_message text,
  last_error text,
  trigger_mode text not null default 'manual',
  aspect_ratio text not null default '9:16',
  output_pack text not null default 'hero_plus_3',
  audio_mode text not null default 'voice_and_captions',
  input_payload jsonb not null default '{}'::jsonb,
  settings_snapshot jsonb not null default '{}'::jsonb,
  pipeline_snapshot jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ugc_generation_runs_status
  on public.ugc_generation_runs(status, updated_at desc);

create index if not exists idx_ugc_generation_runs_product
  on public.ugc_generation_runs(product_id, created_at desc);

create index if not exists idx_ugc_generation_runs_person
  on public.ugc_generation_runs(person_asset_id, created_at desc);

create unique index if not exists idx_ugc_generation_runs_active_unique
  on public.ugc_generation_runs(product_id, person_asset_id)
  where status in ('queued', 'planning', 'generating', 'voicing', 'qa_review');

drop trigger if exists trg_ugc_generation_runs_updated on public.ugc_generation_runs;
create trigger trg_ugc_generation_runs_updated before update on public.ugc_generation_runs
for each row execute procedure public.touch_updated_at();

create table if not exists public.ugc_generation_variants (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references public.ugc_generation_runs(id) on delete cascade,
  creative_asset_id uuid references public.creative_assets(id) on delete set null,
  variant_role text not null default 'variant',
  variant_label text not null,
  status text not null default 'ready',
  preview_url text,
  video_url text,
  thumbnail_url text,
  script_text text,
  voice_text text,
  subtitle_text text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ugc_generation_variants_run
  on public.ugc_generation_variants(run_id, created_at asc);

drop trigger if exists trg_ugc_generation_variants_updated on public.ugc_generation_variants;
create trigger trg_ugc_generation_variants_updated before update on public.ugc_generation_variants
for each row execute procedure public.touch_updated_at();
