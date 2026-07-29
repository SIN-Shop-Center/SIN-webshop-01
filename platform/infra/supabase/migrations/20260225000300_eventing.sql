-- Eventing + queue backbone for micro-workers

create table if not exists public.event_outbox (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_inbox (
  id uuid primary key default uuid_generate_v4(),
  external_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'processing',
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.queue_jobs (
  id uuid primary key default uuid_generate_v4(),
  queue_name text not null,
  job_type text not null,
  dedupe_key text,
  payload jsonb not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 10,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(queue_name, dedupe_key)
);

create table if not exists public.queue_dead_letter (
  id uuid primary key default uuid_generate_v4(),
  queue_job_id uuid references public.queue_jobs(id) on delete set null,
  queue_name text not null,
  job_type text not null,
  payload jsonb not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_outbox_status on public.event_outbox(status, available_at, created_at);
create index if not exists idx_event_outbox_aggregate on public.event_outbox(aggregate_type, aggregate_id);
create index if not exists idx_event_inbox_status on public.event_inbox(status, created_at);
create index if not exists idx_queue_jobs_status on public.queue_jobs(status, available_at, created_at);
create index if not exists idx_queue_jobs_lock on public.queue_jobs(locked_at);
create index if not exists idx_dead_letter_queue on public.queue_dead_letter(queue_name, created_at);

create trigger trg_event_outbox_updated before update on public.event_outbox
for each row execute procedure public.touch_updated_at();
create trigger trg_event_inbox_updated before update on public.event_inbox
for each row execute procedure public.touch_updated_at();
create trigger trg_queue_jobs_updated before update on public.queue_jobs
for each row execute procedure public.touch_updated_at();

create or replace function public.dequeue_jobs(p_queue_name text, p_limit integer, p_worker text)
returns setof public.queue_jobs
language plpgsql
as $$
begin
  return query
  with picked as (
    select id
    from public.queue_jobs
    where queue_name = p_queue_name
      and status = 'pending'
      and available_at <= now()
    order by created_at asc
    limit p_limit
    for update skip locked
  )
  update public.queue_jobs j
  set status = 'processing',
      locked_at = now(),
      locked_by = p_worker,
      attempt_count = attempt_count + 1,
      updated_at = now()
  where j.id in (select id from picked)
  returning j.*;
end;
$$;
