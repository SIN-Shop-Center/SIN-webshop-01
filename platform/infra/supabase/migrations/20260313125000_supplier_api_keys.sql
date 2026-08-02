create table if not exists public.supplier_api_keys (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_supplier_api_keys_supplier_created
  on public.supplier_api_keys(supplier_id, created_at desc);

create index if not exists idx_supplier_api_keys_supplier_active
  on public.supplier_api_keys(supplier_id, created_at desc)
  where revoked_at is null;

create unique index if not exists uq_supplier_api_keys_prefix_active
  on public.supplier_api_keys(key_prefix)
  where revoked_at is null;
