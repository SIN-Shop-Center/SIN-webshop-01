create table if not exists public.supplier_incidents (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  incident_type text not null,
  severity text not null default 'medium',
  title text not null,
  description text,
  status text not null default 'open',
  root_cause text,
  corrective_action text,
  preventive_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'supplier_incidents_status_check'
  ) then
    alter table public.supplier_incidents
      add constraint supplier_incidents_status_check
      check (status in ('open', 'investigating', 'resolved', 'ignored'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'supplier_incidents_severity_check'
  ) then
    alter table public.supplier_incidents
      add constraint supplier_incidents_severity_check
      check (severity in ('low', 'medium', 'high', 'critical'));
  end if;
end $$;

create index if not exists idx_supplier_incidents_supplier
  on public.supplier_incidents(supplier_id, status, created_at desc);

create index if not exists idx_supplier_incidents_order
  on public.supplier_incidents(order_id)
  where order_id is not null;

drop trigger if exists trg_supplier_incidents_updated on public.supplier_incidents;
create trigger trg_supplier_incidents_updated before update on public.supplier_incidents
for each row execute procedure public.touch_updated_at();
