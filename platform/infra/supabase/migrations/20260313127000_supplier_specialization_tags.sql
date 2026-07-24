alter table public.suppliers
  add column if not exists specialization_tags text[] not null default '{}'::text[];

create index if not exists idx_suppliers_specialization_tags
  on public.suppliers using gin(specialization_tags);
