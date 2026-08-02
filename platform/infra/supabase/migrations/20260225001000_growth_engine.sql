-- Cross-category trend commerce + omnichannel growth engine

create table if not exists public.trend_signals (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete set null,
  source text not null,
  country text not null default 'DE',
  signal_date date not null default now()::date,
  search_velocity numeric(10,4) not null default 0,
  social_velocity numeric(10,4) not null default 0,
  sales_velocity numeric(10,4) not null default 0,
  competition_score numeric(10,4) not null default 0,
  margin_fit_score numeric(10,4) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trend_signals_product_date
  on public.trend_signals(product_id, signal_date desc);
create index if not exists idx_trend_signals_source_country
  on public.trend_signals(source, country, signal_date desc);

drop trigger if exists trg_trend_signals_updated on public.trend_signals;
create trigger trg_trend_signals_updated before update on public.trend_signals
for each row execute procedure public.touch_updated_at();

create table if not exists public.trend_candidates (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  cluster text not null default 'general',
  country_scope text[] not null default '{DE,US}'::text[],
  score numeric(10,4) not null default 0,
  lifecycle_state text not null default 'new',
  decision_state text not null default 'review_required',
  decision_reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trend_candidates_lifecycle_check'
  ) then
    alter table public.trend_candidates
      add constraint trend_candidates_lifecycle_check
      check (lifecycle_state in ('new', 'validated', 'launched', 'paused', 'archived'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trend_candidates_decision_check'
  ) then
    alter table public.trend_candidates
      add constraint trend_candidates_decision_check
      check (decision_state in ('allow', 'review_required', 'deny'));
  end if;
end $$;

create index if not exists idx_trend_candidates_score
  on public.trend_candidates(score desc, created_at desc);
create index if not exists idx_trend_candidates_decision
  on public.trend_candidates(decision_state, lifecycle_state, updated_at desc);

drop trigger if exists trg_trend_candidates_updated on public.trend_candidates;
create trigger trg_trend_candidates_updated before update on public.trend_candidates
for each row execute procedure public.touch_updated_at();

create table if not exists public.trend_launches (
  id uuid primary key default uuid_generate_v4(),
  trend_candidate_id uuid not null references public.trend_candidates(id) on delete cascade,
  channel text not null,
  status text not null default 'queued',
  spend_cap_daily numeric(12,2) not null default 0,
  started_at timestamptz,
  stopped_at timestamptz,
  outcome jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trend_candidate_id, channel)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trend_launches_status_check'
  ) then
    alter table public.trend_launches
      add constraint trend_launches_status_check
      check (status in ('queued', 'launching', 'active', 'paused', 'stopped', 'failed'));
  end if;
end $$;

create index if not exists idx_trend_launches_channel_status
  on public.trend_launches(channel, status, updated_at desc);

drop trigger if exists trg_trend_launches_updated on public.trend_launches;
create trigger trg_trend_launches_updated before update on public.trend_launches
for each row execute procedure public.touch_updated_at();

create table if not exists public.category_policies (
  id uuid primary key default uuid_generate_v4(),
  category_key text not null,
  country text not null default 'DE',
  channel text not null default 'all',
  policy_state text not null default 'review_required',
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_key, country, channel)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'category_policies_state_check'
  ) then
    alter table public.category_policies
      add constraint category_policies_state_check
      check (policy_state in ('allow', 'review_required', 'deny'));
  end if;
end $$;

drop trigger if exists trg_category_policies_updated on public.category_policies;
create trigger trg_category_policies_updated before update on public.category_policies
for each row execute procedure public.touch_updated_at();

create table if not exists public.compliance_rules (
  id uuid primary key default uuid_generate_v4(),
  country text not null default 'DE',
  channel text not null default 'all',
  rule_key text not null,
  severity text not null default 'warning',
  state text not null default 'active',
  rule_definition jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country, channel, rule_key)
);

create index if not exists idx_compliance_rules_state
  on public.compliance_rules(state, severity, updated_at desc);

drop trigger if exists trg_compliance_rules_updated on public.compliance_rules;
create trigger trg_compliance_rules_updated before update on public.compliance_rules
for each row execute procedure public.touch_updated_at();

create table if not exists public.channel_accounts (
  id uuid primary key default uuid_generate_v4(),
  channel text not null,
  account_name text not null,
  account_external_id text,
  status text not null default 'disconnected',
  connection_mode text not null default 'oauth',
  country_scope text[] not null default '{DE,US}'::text[],
  auth_snapshot jsonb not null default '{}'::jsonb,
  health_snapshot jsonb not null default '{}'::jsonb,
  last_connected_at timestamptz,
  last_health_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, account_name)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'channel_accounts_status_check'
  ) then
    alter table public.channel_accounts
      add constraint channel_accounts_status_check
      check (status in ('connected', 'degraded', 'disconnected', 'error'));
  end if;
end $$;

create index if not exists idx_channel_accounts_channel_status
  on public.channel_accounts(channel, status, updated_at desc);

drop trigger if exists trg_channel_accounts_updated on public.channel_accounts;
create trigger trg_channel_accounts_updated before update on public.channel_accounts
for each row execute procedure public.touch_updated_at();

create table if not exists public.channel_connection_sessions (
  id uuid primary key default uuid_generate_v4(),
  channel text not null,
  account_id uuid references public.channel_accounts(id) on delete set null,
  state_token text not null unique,
  status text not null default 'pending',
  redirect_url text,
  callback_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_channel_connection_sessions_status
  on public.channel_connection_sessions(channel, status, created_at desc);

drop trigger if exists trg_channel_connection_sessions_updated on public.channel_connection_sessions;
create trigger trg_channel_connection_sessions_updated before update on public.channel_connection_sessions
for each row execute procedure public.touch_updated_at();

create table if not exists public.channel_sync_runs (
  id uuid primary key default uuid_generate_v4(),
  channel text not null,
  account_id uuid references public.channel_accounts(id) on delete set null,
  sync_type text not null,
  status text not null default 'queued',
  requested_by uuid references auth.users(id) on delete set null,
  requested_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_channel_sync_runs_channel_status
  on public.channel_sync_runs(channel, sync_type, status, created_at desc);

drop trigger if exists trg_channel_sync_runs_updated on public.channel_sync_runs;
create trigger trg_channel_sync_runs_updated before update on public.channel_sync_runs
for each row execute procedure public.touch_updated_at();

create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  channel text not null,
  trend_candidate_id uuid references public.trend_candidates(id) on delete set null,
  name text not null,
  objective text not null default 'sales',
  status text not null default 'draft',
  budget_daily numeric(12,2) not null default 0,
  target_roas numeric(8,2),
  external_campaign_id text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_channel_status
  on public.campaigns(channel, status, updated_at desc);

drop trigger if exists trg_campaigns_updated on public.campaigns;
create trigger trg_campaigns_updated before update on public.campaigns
for each row execute procedure public.touch_updated_at();

create table if not exists public.campaign_spend_daily (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  spend_date date not null,
  spend_amount numeric(12,2) not null default 0,
  clicks integer not null default 0,
  impressions integer not null default 0,
  attributed_revenue numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (campaign_id, spend_date)
);

create table if not exists public.creative_assets (
  id uuid primary key default uuid_generate_v4(),
  channel text not null default 'all',
  asset_type text not null default 'video',
  title text not null,
  hook text,
  status text not null default 'draft',
  storage_url text,
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_creative_assets_updated on public.creative_assets;
create trigger trg_creative_assets_updated before update on public.creative_assets
for each row execute procedure public.touch_updated_at();

create table if not exists public.creative_metrics_daily (
  id uuid primary key default uuid_generate_v4(),
  creative_asset_id uuid not null references public.creative_assets(id) on delete cascade,
  metric_date date not null,
  channel text not null,
  views integer not null default 0,
  clicks integer not null default 0,
  spend_amount numeric(12,2) not null default 0,
  attributed_revenue numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (creative_asset_id, channel, metric_date)
);

create table if not exists public.creators (
  id uuid primary key default uuid_generate_v4(),
  handle text not null unique,
  platform text not null,
  status text not null default 'prospect',
  region text not null default 'DACH',
  score numeric(8,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_creators_updated on public.creators;
create trigger trg_creators_updated before update on public.creators
for each row execute procedure public.touch_updated_at();

create table if not exists public.affiliate_offers (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.creators(id) on delete set null,
  code text not null unique,
  commission_pct numeric(8,2) not null default 10,
  status text not null default 'active',
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_affiliate_offers_updated on public.affiliate_offers;
create trigger trg_affiliate_offers_updated before update on public.affiliate_offers
for each row execute procedure public.touch_updated_at();

drop table if exists public.affiliate_conversions cascade;
create table if not exists public.affiliate_conversions (
  id uuid primary key default uuid_generate_v4(),
  affiliate_offer_id uuid not null references public.affiliate_offers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  conversion_date date not null default now()::date,
  amount numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_conversions_offer_date
  on public.affiliate_conversions(affiliate_offer_id, conversion_date desc);

create table if not exists public.attribution_touchpoints (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade,
  session_id text,
  channel text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  touch_type text not null default 'click',
  touched_at timestamptz not null default now(),
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (dedupe_key)
);

create index if not exists idx_attribution_touchpoints_order
  on public.attribution_touchpoints(order_id, touched_at desc);

create table if not exists public.attributed_orders (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  channel text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  model text not null default 'last_click',
  revenue_amount numeric(12,2) not null default 0,
  cost_amount numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (order_id, channel, model)
);

create index if not exists idx_attributed_orders_channel
  on public.attributed_orders(channel, created_at desc);

create table if not exists public.budget_policies (
  id uuid primary key default uuid_generate_v4(),
  scope text not null default 'global',
  channel text not null default 'all',
  daily_cap numeric(12,2) not null default 0,
  weekly_cap numeric(12,2) not null default 0,
  monthly_cap numeric(12,2) not null default 0,
  target_mer numeric(8,2) not null default 2.5,
  target_roas numeric(8,2) not null default 3.0,
  hard_stop boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, channel)
);

drop trigger if exists trg_budget_policies_updated on public.budget_policies;
create trigger trg_budget_policies_updated before update on public.budget_policies
for each row execute procedure public.touch_updated_at();

create table if not exists public.budget_incidents (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references public.budget_policies(id) on delete set null,
  channel text not null default 'all',
  incident_type text not null,
  severity text not null default 'warning',
  status text not null default 'open',
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_budget_incidents_open
  on public.budget_incidents(status, severity, created_at desc);

insert into public.channel_accounts (channel, account_name, status, connection_mode)
values
  ('tiktok', 'default', 'disconnected', 'oauth'),
  ('meta', 'default', 'disconnected', 'oauth'),
  ('youtube_google', 'default', 'disconnected', 'oauth'),
  ('pinterest', 'default', 'disconnected', 'oauth'),
  ('snapchat', 'default', 'disconnected', 'oauth')
on conflict (channel, account_name) do nothing;

insert into public.budget_policies (scope, channel, daily_cap, weekly_cap, monthly_cap, target_mer, target_roas, hard_stop)
values ('global', 'all', 2500, 17500, 75000, 2.5, 3.0, true)
on conflict (scope, channel) do nothing;
