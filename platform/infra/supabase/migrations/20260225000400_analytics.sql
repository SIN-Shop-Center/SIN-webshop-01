-- Analytics event storage for funnel metrics and alerting

create table if not exists public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  occurred_at timestamptz not null,
  segment text,
  route text,
  payload jsonb not null default '{}'::jsonb,
  request_id text,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_occurred_at
  on public.analytics_events(occurred_at desc);

create index if not exists idx_analytics_events_type_time
  on public.analytics_events(event_type, occurred_at desc);

create index if not exists idx_analytics_events_segment_time
  on public.analytics_events(segment, occurred_at desc);
