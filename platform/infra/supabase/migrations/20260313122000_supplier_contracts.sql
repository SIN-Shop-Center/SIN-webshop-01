create table if not exists public.supplier_contracts (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  contract_type text not null,
  version text,
  status text not null default 'active',
  effective_at timestamptz,
  expires_at timestamptz,
  file_object_key text not null,
  file_name text,
  content_type text,
  size_bytes bigint,
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
    where conname = 'supplier_contracts_status_check'
  ) then
    alter table public.supplier_contracts
      add constraint supplier_contracts_status_check
      check (status in ('active', 'expired', 'superseded', 'draft'));
  end if;
end $$;

create index if not exists idx_supplier_contracts_supplier
  on public.supplier_contracts(supplier_id, status, expires_at desc, created_at desc);

drop trigger if exists trg_supplier_contracts_updated on public.supplier_contracts;
create trigger trg_supplier_contracts_updated before update on public.supplier_contracts
for each row execute procedure public.touch_updated_at();
