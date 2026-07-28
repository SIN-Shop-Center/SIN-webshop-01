-- Supplier autopilot domain for autonomous dropshipping

alter table public.suppliers
  add column if not exists fulfillment_mode text not null default 'email',
  add column if not exists auto_fulfill_enabled boolean not null default false,
  add column if not exists sla_hours integer not null default 48,
  add column if not exists contact_email text,
  add column if not exists api_secret_ref text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'suppliers_fulfillment_mode_check'
  ) then
    alter table public.suppliers
      add constraint suppliers_fulfillment_mode_check
      check (fulfillment_mode in ('api', 'email'));
  end if;
end $$;

create table if not exists public.product_suppliers (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  priority integer not null default 100,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, supplier_id)
);

create index if not exists idx_product_suppliers_product_priority
  on public.product_suppliers(product_id, is_active, is_primary desc, priority asc, created_at asc);

drop trigger if exists trg_product_suppliers_updated on public.product_suppliers;
create trigger trg_product_suppliers_updated before update on public.product_suppliers
for each row execute procedure public.touch_updated_at();

create table if not exists public.supplier_orders (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  status text not null default 'pending',
  channel text not null default 'email',
  external_order_id text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  last_error text,
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, supplier_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_orders_status_check'
  ) then
    alter table public.supplier_orders
      add constraint supplier_orders_status_check
      check (status in ('pending', 'dispatching', 'placed', 'failed', 'cancelled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_orders_channel_check'
  ) then
    alter table public.supplier_orders
      add constraint supplier_orders_channel_check
      check (channel in ('api', 'email'));
  end if;
end $$;

create index if not exists idx_supplier_orders_status
  on public.supplier_orders(status, updated_at desc);

create index if not exists idx_supplier_orders_supplier
  on public.supplier_orders(supplier_id, status, updated_at desc);

drop trigger if exists trg_supplier_orders_updated on public.supplier_orders;
create trigger trg_supplier_orders_updated before update on public.supplier_orders
for each row execute procedure public.touch_updated_at();
