-- Core commerce schema (hybrid compatibility baseline)
-- Source merge: single-product-shop + simone-webshop admin route contracts

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  role text not null default 'customer',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  name text,
  phone text,
  address jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (new.id, new.email, null, null)
  on conflict (id) do update set email = excluded.email;

  insert into public.customers (auth_user_id, email, name)
  values (new.id, new.email, null)
  on conflict (email) do nothing;

  return new;
end;
$$;

create table if not exists public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  website text,
  api_endpoint text,
  api_key text,
  status text not null default 'pending',
  rating numeric(3,2) not null default 0,
  notes text,
  contact_person text,
  country text not null default 'DE',
  shipping_time_days integer not null default 7,
  minimum_order numeric(10,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  image text,
  parent_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  sku text unique,
  name text not null,
  slug text unique,
  description text,
  price numeric(10,2) not null default 0,
  original_price numeric(10,2),
  images jsonb not null default '[]'::jsonb,
  variants jsonb,
  stock integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  first_name text not null,
  last_name text not null,
  street1 text not null,
  street2 text,
  city text not null,
  zip text not null,
  country text not null,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  email text not null,
  status text not null default 'created',
  payment_status text not null default 'pending',
  currency text not null default 'EUR',

  -- cent-based fields (worker-compatible)
  subtotal_amount integer,
  shipping_amount integer,
  tax_amount integer,
  total_amount integer,

  -- decimal fields (legacy admin-compatible)
  subtotal numeric(10,2),
  shipping_cost numeric(10,2),
  tax numeric(10,2),
  total numeric(10,2),

  payment_provider text,
  payment_reference text,
  payment_method text,

  shipping_method text not null default 'express',
  shipping_address_id uuid references public.addresses(id) on delete restrict,
  shipping_address jsonb,
  billing_address jsonb,

  tracking_number text,
  tracking_url text,
  notes text,
  customer_notes text,
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text,
  title text,
  variant text,
  variant_name text,
  unit_price_amount integer,
  price numeric(10,2),
  quantity integer not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  tracking_url text,
  status text not null default 'label_created',
  label_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz
);

create table if not exists public.wishlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,
  variant_name text,
  created_at timestamptz not null default now(),
  unique(user_id, sku)
);

create table if not exists public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,
  variant_name text,
  quantity integer not null default 1,
  unit_price_amount integer not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, sku)
);

create table if not exists public.email_log (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete set null,
  recipient text not null,
  email_type text not null,
  subject text not null,
  status text not null default 'sent',
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_order_amounts()
returns trigger
language plpgsql
as $$
begin
  if new.subtotal_amount is null and new.subtotal is not null then
    new.subtotal_amount = round(new.subtotal * 100);
  end if;
  if new.shipping_amount is null and new.shipping_cost is not null then
    new.shipping_amount = round(new.shipping_cost * 100);
  end if;
  if new.tax_amount is null and new.tax is not null then
    new.tax_amount = round(new.tax * 100);
  end if;
  if new.total_amount is null and new.total is not null then
    new.total_amount = round(new.total * 100);
  end if;

  if new.subtotal is null and new.subtotal_amount is not null then
    new.subtotal = (new.subtotal_amount::numeric / 100.0);
  end if;
  if new.shipping_cost is null and new.shipping_amount is not null then
    new.shipping_cost = (new.shipping_amount::numeric / 100.0);
  end if;
  if new.tax is null and new.tax_amount is not null then
    new.tax = (new.tax_amount::numeric / 100.0);
  end if;
  if new.total is null and new.total_amount is not null then
    new.total = (new.total_amount::numeric / 100.0);
  end if;

  return new;
end;
$$;

create or replace function public.sync_order_item_prices()
returns trigger
language plpgsql
as $$
begin
  if new.unit_price_amount is null and new.price is not null then
    new.unit_price_amount = round(new.price * 100);
  end if;
  if new.price is null and new.unit_price_amount is not null then
    new.price = (new.unit_price_amount::numeric / 100.0);
  end if;
  if new.variant is null and new.variant_name is not null then
    new.variant = new.variant_name;
  end if;
  if new.variant_name is null and new.variant is not null then
    new.variant_name = new.variant;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_suppliers_updated on public.suppliers;
create trigger trg_suppliers_updated before update on public.suppliers
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_addresses_updated on public.addresses;
create trigger trg_addresses_updated before update on public.addresses
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_orders_sync_amounts on public.orders;
create trigger trg_orders_sync_amounts before insert or update on public.orders
for each row execute procedure public.sync_order_amounts();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_order_items_sync on public.order_items;
create trigger trg_order_items_sync before insert or update on public.order_items
for each row execute procedure public.sync_order_item_prices();

drop trigger if exists trg_order_items_updated on public.order_items;
create trigger trg_order_items_updated before update on public.order_items
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_shipments_updated on public.shipments;
create trigger trg_shipments_updated before update on public.shipments
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_cart_items_updated on public.cart_items;
create trigger trg_cart_items_updated before update on public.cart_items
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated before update on public.settings
for each row execute procedure public.touch_updated_at();

create index if not exists idx_customers_email on public.customers(email);
create index if not exists idx_customers_auth_user on public.customers(auth_user_id);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_shipments_order on public.shipments(order_id);
create index if not exists idx_shipments_tracking on public.shipments(tracking_number);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_supplier on public.products(supplier_id);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_wishlist_user on public.wishlist(user_id);
create index if not exists idx_cart_user on public.cart_items(user_id);
create index if not exists idx_admin_log_admin on public.admin_log(admin_id);
create index if not exists idx_email_log_order on public.email_log(order_id);

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.wishlist enable row level security;
alter table public.cart_items enable row level security;
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "addresses_select_own" on public.addresses;
create policy "addresses_select_own" on public.addresses for select using (auth.uid() = user_id);
drop policy if exists "addresses_write_own" on public.addresses;
create policy "addresses_write_own" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
drop policy if exists "shipments_select_own" on public.shipments;
create policy "shipments_select_own" on public.shipments for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

drop policy if exists "wishlist_select_own" on public.wishlist;
create policy "wishlist_select_own" on public.wishlist for select using (auth.uid() = user_id);
drop policy if exists "wishlist_write_own" on public.wishlist;
create policy "wishlist_write_own" on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cart_select_own" on public.cart_items;
create policy "cart_select_own" on public.cart_items for select using (auth.uid() = user_id);
drop policy if exists "cart_write_own" on public.cart_items;
create policy "cart_write_own" on public.cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "newsletter_insert_public" on public.newsletter_subscribers;
create policy "newsletter_insert_public" on public.newsletter_subscribers for insert with check (true);
