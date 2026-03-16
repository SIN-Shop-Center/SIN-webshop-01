create table if not exists public.ugc_generation_stage_cache (
  id uuid primary key default uuid_generate_v4(),
  stage text not null,
  provider text not null default 'system',
  cache_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ugc_generation_stage_cache_stage
  on public.ugc_generation_stage_cache(stage, provider, updated_at desc);

create index if not exists idx_ugc_generation_stage_cache_expires
  on public.ugc_generation_stage_cache(expires_at asc)
  where expires_at is not null;

drop trigger if exists trg_ugc_generation_stage_cache_updated on public.ugc_generation_stage_cache;
create trigger trg_ugc_generation_stage_cache_updated before update on public.ugc_generation_stage_cache
for each row execute procedure public.touch_updated_at();
