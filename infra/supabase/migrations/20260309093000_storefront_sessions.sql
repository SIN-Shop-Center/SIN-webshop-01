create table if not exists public.store_sessions (
  id uuid primary key default uuid_generate_v4(),
  session_token_hash text not null unique,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_cart_items (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.store_sessions(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  sku text not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, sku)
);

create table if not exists public.store_access_requests (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  requested_role text not null,
  note text,
  status text not null default 'pending',
  customer_id uuid references public.customers(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_cart_items
  drop constraint if exists store_cart_items_quantity_positive;

alter table public.store_cart_items
  add constraint store_cart_items_quantity_positive
  check (quantity > 0);

alter table public.store_access_requests
  drop constraint if exists store_access_requests_role_check;

alter table public.store_access_requests
  add constraint store_access_requests_role_check
  check (requested_role in ('customer', 'admin'));

alter table public.orders
  add column if not exists storefront_session_id uuid references public.store_sessions(id) on delete set null;

create index if not exists idx_store_sessions_last_seen
  on public.store_sessions(last_seen_at desc);

create index if not exists idx_store_cart_items_session
  on public.store_cart_items(session_id, updated_at desc);

create index if not exists idx_store_access_requests_email
  on public.store_access_requests(email, created_at desc);

create index if not exists idx_orders_storefront_session
  on public.orders(storefront_session_id, created_at desc);

drop trigger if exists trg_store_sessions_updated on public.store_sessions;
create trigger trg_store_sessions_updated before update on public.store_sessions
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_store_cart_items_updated on public.store_cart_items;
create trigger trg_store_cart_items_updated before update on public.store_cart_items
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_store_access_requests_updated on public.store_access_requests;
create trigger trg_store_access_requests_updated before update on public.store_access_requests
for each row execute procedure public.touch_updated_at();
