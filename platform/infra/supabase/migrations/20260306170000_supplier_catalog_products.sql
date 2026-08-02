-- Separate supplier catalog intake before products are listed in the shop

create table if not exists public.supplier_catalog_products (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  external_product_id text,
  supplier_sku text,
  title text not null,
  description text,
  source_url text,
  image_url text,
  currency text not null default 'EUR',
  price numeric(10,2),
  compare_at_price numeric(10,2),
  minimum_order_quantity numeric(10,2),
  stock_hint integer,
  lead_time_days integer,
  status text not null default 'new',
  review_note text,
  ai_score numeric(6,2),
  metadata jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  imported_product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_catalog_products_status_check'
  ) then
    alter table public.supplier_catalog_products
      add constraint supplier_catalog_products_status_check
      check (status in ('new', 'reviewing', 'approved', 'imported', 'rejected', 'archived'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_catalog_products_supplier_external_unique'
  ) then
    alter table public.supplier_catalog_products
      add constraint supplier_catalog_products_supplier_external_unique unique (supplier_id, external_product_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_catalog_products_supplier_sku_unique'
  ) then
    alter table public.supplier_catalog_products
      add constraint supplier_catalog_products_supplier_sku_unique unique (supplier_id, supplier_sku);
  end if;
end $$;

create index if not exists idx_supplier_catalog_products_supplier_status
  on public.supplier_catalog_products(supplier_id, status, updated_at desc);

create index if not exists idx_supplier_catalog_products_supplier_search
  on public.supplier_catalog_products(supplier_id, last_seen_at desc, created_at desc);

create index if not exists idx_supplier_catalog_products_imported_product
  on public.supplier_catalog_products(imported_product_id)
  where imported_product_id is not null;

drop trigger if exists trg_supplier_catalog_products_updated on public.supplier_catalog_products;
create trigger trg_supplier_catalog_products_updated before update on public.supplier_catalog_products
for each row execute procedure public.touch_updated_at();
