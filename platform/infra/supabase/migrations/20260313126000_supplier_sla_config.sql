alter table public.suppliers
  add column if not exists sla_ack_hours integer not null default 24,
  add column if not exists sla_fulfillment_hours integer not null default 72;

create table if not exists public.supplier_sla_breaches (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  breach_type text not null,
  threshold_hours integer not null,
  actual_hours numeric(10,2),
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_supplier_sla_breaches_supplier
  on public.supplier_sla_breaches(supplier_id, status, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'supplier_sla_breaches_status_check'
  ) then
    alter table public.supplier_sla_breaches
      add constraint supplier_sla_breaches_status_check
      check (status in ('open', 'acknowledged', 'resolved', 'ignored'));
  end if;
end $$;
