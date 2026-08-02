create table if not exists public.supplier_communications (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  channel text not null,
  direction text not null,
  subject text,
  body text not null,
  sender text,
  recipient text,
  thread_id text,
  external_id text,
  status text not null default 'sent',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_communications_channel_check'
  ) then
    alter table public.supplier_communications
      add constraint supplier_communications_channel_check
      check (channel in ('email', 'sms', 'system', 'manual'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_communications_direction_check'
  ) then
    alter table public.supplier_communications
      add constraint supplier_communications_direction_check
      check (direction in ('inbound', 'outbound', 'internal'));
  end if;
end $$;

create index if not exists idx_supplier_communications_supplier
  on public.supplier_communications(supplier_id, created_at desc);

create index if not exists idx_supplier_communications_thread
  on public.supplier_communications(supplier_id, thread_id)
  where thread_id is not null;

drop trigger if exists trg_supplier_communications_updated on public.supplier_communications;
create trigger trg_supplier_communications_updated before update on public.supplier_communications
for each row execute procedure public.touch_updated_at();
