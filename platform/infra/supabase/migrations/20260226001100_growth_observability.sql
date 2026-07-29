-- Growth observability + forecast/payout persistence

create table if not exists public.channel_events_raw (
  id uuid primary key default uuid_generate_v4(),
  channel text not null,
  event_id text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'ingested',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_channel_events_raw_channel_received
  on public.channel_events_raw(channel, received_at desc);

create table if not exists public.revenue_forecast_runs (
  id uuid primary key default uuid_generate_v4(),
  scenario text not null,
  currency text not null default 'EUR',
  inputs jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_revenue_forecast_runs_created
  on public.revenue_forecast_runs(created_at desc, scenario);

create table if not exists public.creative_publish_runs (
  id uuid primary key default uuid_generate_v4(),
  creative_asset_id uuid references public.creative_assets(id) on delete cascade,
  channel text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  error_message text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creative_publish_runs_status
  on public.creative_publish_runs(channel, status, updated_at desc);

drop trigger if exists trg_creative_publish_runs_updated on public.creative_publish_runs;
create trigger trg_creative_publish_runs_updated before update on public.creative_publish_runs
for each row execute procedure public.touch_updated_at();

create table if not exists public.creator_payouts (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.creators(id) on delete set null,
  period_start date not null,
  period_end date not null,
  gross_commission numeric(12,2) not null default 0,
  net_payout numeric(12,2) not null default 0,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, period_start, period_end)
);

create index if not exists idx_creator_payouts_status
  on public.creator_payouts(status, created_at desc);

drop trigger if exists trg_creator_payouts_updated on public.creator_payouts;
create trigger trg_creator_payouts_updated before update on public.creator_payouts
for each row execute procedure public.touch_updated_at();
