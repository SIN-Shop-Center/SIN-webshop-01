-- Purpose: Version the actual ShopSIN storefront schema used by the Next.js app.
-- This consolidates the previous one-off scripts into an idempotent migration.
-- Existing duplicate orders/cart rows are never deleted automatically: the
-- migration aborts so an operator can review and reconcile business data.

create schema if not exists shop;
grant usage on schema shop to anon, authenticated, service_role;

-- Admin membership is operator-managed and never derived from user-editable
-- auth.user_metadata. Only service-role code may read or write the table.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant all on public.admin_users to service_role;

-- Private short-lived GDPR export objects. Access is only via service-role
-- generated signed URLs; the bucket itself is never public.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('data-exports', 'data-exports', false)
    on conflict (id) do update set public = false;
  end if;
end
$$;

-- Bootstrap the shop tables from the versioned public baseline on fresh DBs.
create table if not exists shop.categories (like public.categories including all);
create table if not exists shop.products (like public.products including all);
create table if not exists shop.orders (like public.orders including all);
create table if not exists shop.cart_items (like public.cart_items including all);
create table if not exists shop.tiktok_auth (like public.tiktok_auth including all);
create table if not exists shop.tiktok_orders (like public.tiktok_orders including all);

insert into shop.categories
select * from public.categories
on conflict (id) do nothing;
insert into shop.tiktok_auth
select * from public.tiktok_auth
on conflict (id) do nothing;
insert into shop.tiktok_orders
select * from public.tiktok_orders
on conflict (tiktok_order_id) do nothing;

-- Product contract consumed by products_v, checkout, CJ and TikTok pipelines.
alter table shop.products
  add column if not exists title_de text,
  add column if not exists description_de text,
  add column if not exists compare_at_price numeric(10,2),
  add column if not exists image_url_local text,
  add column if not exists image_gallery text[] not null default '{}'::text[],
  add column if not exists badge text,
  add column if not exists sold_count integer not null default 0,
  add column if not exists rating numeric(3,2) not null default 0,
  add column if not exists rating_count integer not null default 0,
  add column if not exists cj_product_id text,
  add column if not exists cj_variant_id text,
  add column if not exists cj_sku text,
  add column if not exists cj_cost_price numeric(12,4),
  add column if not exists cj_last_synced_at timestamptz,
  add column if not exists allow_backorder boolean not null default false,
  add column if not exists manufacturer_name text,
  add column if not exists manufacturer_address text,
  add column if not exists manufacturer_email text,
  add column if not exists manufacturer_phone text,
  add column if not exists manufacturer_verified boolean not null default false,
  add column if not exists responsible_person_name text,
  add column if not exists responsible_person_company text,
  add column if not exists responsible_person_address text,
  add column if not exists responsible_person_email text,
  add column if not exists responsible_person_phone text,
  add column if not exists responsible_person_verified boolean not null default false,
  add column if not exists gpsr_verified_at timestamptz,
  add column if not exists pipeline_state text,
  add column if not exists approval_state text,
  add column if not exists creative_status text,
  add column if not exists data_quality_score numeric(5,2),
  add column if not exists tiktok_product_id text,
  add column if not exists tiktok_status text,
  add column if not exists tiktok_last_error text,
  add column if not exists tiktok_published_at timestamptz,
  add column if not exists tiktok_last_synced_at timestamptz;

-- Guest cart contract. Legacy authenticated-cart columns remain nullable for
-- compatibility, while every new guest row must have cart_id + product_id.
alter table shop.cart_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists cart_id uuid,
  add column if not exists product_id uuid references shop.products(id) on delete cascade,
  add column if not exists variant_id text,
  add column if not exists variant_name text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'shop'
      and table_name = 'cart_items'
      and column_name = 'product_id'
      and data_type <> 'uuid'
  ) then
    execute $migration$
      alter table shop.cart_items
      alter column product_id type uuid
      using nullif(product_id::text, '')::uuid
    $migration$;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'shop' and table_name = 'cart_items' and column_name = 'user_id'
  ) then
    execute 'alter table shop.cart_items alter column user_id drop not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'shop' and table_name = 'cart_items' and column_name = 'sku'
  ) then
    execute 'alter table shop.cart_items alter column sku drop not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'shop' and table_name = 'cart_items' and column_name = 'unit_price_amount'
  ) then
    execute 'alter table shop.cart_items alter column unit_price_amount drop not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'shop' and table_name = 'cart_items' and column_name = 'cj_variant_id'
  ) then
    execute 'update shop.cart_items set variant_id = cj_variant_id where variant_id is null and cj_variant_id is not null';
  end if;
end
$$;

-- Remove the pre-variant guest uniqueness constraint, regardless of its name.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'shop.cart_items'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (cart_id, product_id)'
  loop
    execute format('alter table shop.cart_items drop constraint %I', constraint_record.conname);
  end loop;
end
$$;

alter table shop.cart_items
  drop constraint if exists cart_items_quantity_range;
alter table shop.cart_items
  add constraint cart_items_quantity_range check (quantity > 0 and quantity <= 99) not valid;
alter table shop.cart_items validate constraint cart_items_quantity_range;

alter table shop.cart_items
  drop constraint if exists cart_items_identity_check;
-- NOT VALID keeps historical rows reviewable, while PostgreSQL still enforces
-- the current guest-cart identity on every new or changed row.
alter table shop.cart_items
  add constraint cart_items_identity_check check (
    cart_id is not null and product_id is not null
  ) not valid;

-- PostgreSQL NULL semantics would otherwise allow duplicate default variants.
do $$
begin
  if exists (
    select 1
    from shop.cart_items
    where cart_id is not null and product_id is not null
    group by cart_id, product_id, coalesce(variant_id, '')
    having count(*) > 1
  ) then
    raise exception 'Duplicate cart rows exist for the same cart/product/variant; reconcile them before migration';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'shop.cart_items'::regclass
      and conname = 'cart_items_product_id_fkey'
  ) then
    alter table shop.cart_items
      add constraint cart_items_product_id_fkey
      foreign key (product_id) references shop.products(id) on delete cascade not valid;
  end if;
end
$$;

alter table shop.cart_items
  drop constraint if exists cart_items_cart_product_variant_key;
create unique index if not exists cart_items_cart_product_variant_uidx
  on shop.cart_items (cart_id, product_id, coalesce(variant_id, ''))
  where cart_id is not null and product_id is not null;
create index if not exists cart_items_cart_updated_idx
  on shop.cart_items (cart_id, updated_at desc)
  where cart_id is not null;

-- Current Stripe/order/fulfillment contract.
alter table shop.orders
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent text,
  add column if not exists amount_total integer,
  add column if not exists customer_name text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists fulfillment_status text not null default 'pending',
  add column if not exists fulfillment_attempts integer not null default 0,
  add column if not exists fulfillment_error text,
  add column if not exists cj_order_id text,
  add column if not exists cj_order_status text,
  add column if not exists tracking_notified_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;

do $$
begin
  if exists (
    select 1 from shop.orders
    where stripe_session_id is not null
    group by stripe_session_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate stripe_session_id values exist; review orders before adding the unique index';
  end if;
end
$$;

create unique index if not exists orders_stripe_session_id_uidx
  on shop.orders (stripe_session_id)
  where stripe_session_id is not null;
create index if not exists orders_fulfillment_retry_idx
  on shop.orders (fulfillment_status, fulfillment_attempts, created_at)
  where fulfillment_status in ('pending', 'failed');

do $$
begin
  if exists (
    select 1 from shop.orders
    where cj_order_id is not null
    group by cj_order_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate cj_order_id values exist; reconcile them before migration';
  end if;
end
$$;
create unique index if not exists orders_cj_order_id_uidx
  on shop.orders (cj_order_id)
  where cj_order_id is not null;

create table if not exists shop.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop.orders(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  photos text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'refunded')),
  refund_amount_cents integer check (refund_amount_cents is null or refund_amount_cents > 0),
  stripe_refund_id text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  refunded_at timestamptz
);
create index if not exists return_requests_user_idx
  on shop.return_requests (user_id, created_at desc);
create index if not exists return_requests_status_idx
  on shop.return_requests (status, created_at desc);
create unique index if not exists return_requests_one_open_uidx
  on shop.return_requests (order_id, user_id)
  where user_id is not null and status in ('pending', 'approved');

do $$
declare
  fk record;
begin
  alter table shop.return_requests alter column user_id drop not null;

  for fk in
    select constraint_name
    from information_schema.key_column_usage
    where table_schema = 'shop'
      and table_name = 'return_requests'
      and column_name = 'user_id'
  loop
    execute format('alter table shop.return_requests drop constraint %I', fk.constraint_name);
  end loop;

  alter table shop.return_requests
    add constraint return_requests_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null not valid;
end
$$;

-- Historical rows are copied without changing ownership or status.
do $$
begin
  if to_regclass('public.return_requests') is not null then
    insert into shop.return_requests (
      id, order_id, user_id, reason, photos, status, refund_amount_cents,
      stripe_refund_id, created_at, approved_at, refunded_at
    )
    select
      id, order_id, user_id, reason, coalesce(photos, '{}'), status,
      refund_amount_cents, stripe_refund_id, created_at, approved_at, refunded_at
    from public.return_requests
    where user_id is not null
    on conflict (id) do nothing;
  end if;
end
$$;

create table if not exists shop.processed_events (
  event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);
create index if not exists processed_events_processed_at_idx
  on shop.processed_events (processed_at);

create table if not exists shop.email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references shop.orders(id) on delete set null,
  email_type text not null,
  recipient text not null,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  sent_at timestamptz not null default now()
);
alter table shop.email_log
  add column if not exists error_message text,
  add column if not exists sent_at timestamptz not null default now();
create index if not exists email_log_order_idx on shop.email_log (order_id, sent_at desc);
create index if not exists email_log_failed_idx
  on shop.email_log (sent_at)
  where status = 'failed';

-- Newsletter uses server-side double opt-in. Raw confirmation/unsubscribe
-- tokens are never stored; only SHA-256 hashes are persisted.
create table if not exists shop.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirmation_token_hash text,
  unsubscribe_token_hash text not null,
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists newsletter_email_lower_uidx
  on shop.newsletter_subscribers (lower(email));
create unique index if not exists newsletter_confirmation_token_uidx
  on shop.newsletter_subscribers (confirmation_token_hash)
  where confirmation_token_hash is not null;
create unique index if not exists newsletter_unsubscribe_token_uidx
  on shop.newsletter_subscribers (unsubscribe_token_hash);

create table if not exists shop.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Zuhause',
  full_name text not null,
  street text not null,
  postal_code text not null,
  city text not null,
  country text not null default 'DE' check (country = 'DE'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_user_idx
  on shop.customer_addresses (user_id, created_at);
create unique index if not exists customer_addresses_one_default_uidx
  on shop.customer_addresses (user_id)
  where is_default;

create table if not exists shop.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  subject text check (subject is null or char_length(subject) <= 200),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new'
    check (status in ('new', 'read', 'replied', 'archived')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '365 days')
);
create index if not exists contact_messages_status_idx
  on shop.contact_messages (status, created_at desc);
create index if not exists contact_messages_expiry_idx
  on shop.contact_messages (expires_at);
create index if not exists contact_messages_user_idx
  on shop.contact_messages (user_id, created_at desc)
  where user_id is not null;

create table if not exists shop.csp_violations (
  id bigserial primary key,
  document_uri text,
  violated_directive text,
  blocked_uri text,
  original_policy text,
  user_agent text,
  received_at timestamptz not null default now()
);
create index if not exists csp_violations_received_idx
  on shop.csp_violations (received_at desc);
create index if not exists csp_violations_directive_idx
  on shop.csp_violations (violated_directive, received_at desc);

create table if not exists shop.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references shop.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists wishlist_items_user_idx
  on shop.wishlist_items (user_id, created_at desc);

-- Preserve historical direct signups only as pending records. They must request
-- a fresh confirmation link before any marketing message may be sent.
do $$
begin
  if to_regclass('public.newsletter_subscribers') is not null then
    insert into shop.newsletter_subscribers (email, status, unsubscribe_token_hash)
    select lower(trim(email)), 'pending', encode(digest(gen_random_uuid()::text || email, 'sha256'), 'hex')
    from public.newsletter_subscribers
    where email is not null and trim(email) <> ''
    on conflict do nothing;
  end if;
end
$$;

-- Existing wishlist rows are copied when their products exist in shop.
do $$
begin
  if to_regclass('public.wishlist_items') is not null then
    insert into shop.wishlist_items (id, user_id, product_id, created_at)
    select wishlist.id, wishlist.user_id, wishlist.product_id, wishlist.created_at
    from public.wishlist_items wishlist
    join shop.products product on product.id = wishlist.product_id
    on conflict (id) do nothing;
  end if;
end
$$;

-- Existing contact messages are retained with a bounded future expiry.
do $$
begin
  if to_regclass('public.contact_messages') is not null then
    insert into shop.contact_messages (
      id, name, email, subject, message, status, created_at, expires_at
    )
    select
      id,
      left(name, 100),
      left(lower(email), 254),
      nullif(left(coalesce(subject, ''), 200), ''),
      left(message, 5000),
      case when status in ('new', 'read', 'replied', 'archived') then status else 'new' end,
      created_at,
      greatest(created_at + interval '365 days', now() + interval '30 days')
    from public.contact_messages
    where char_length(name) >= 2 and char_length(message) >= 10
    on conflict (id) do nothing;
  end if;
end
$$;

-- Existing address-book rows are copied without changing ownership. Invalid
-- non-DE records are intentionally not imported because checkout ships only DE.
do $$
begin
  if to_regclass('public.customer_addresses') is not null then
    insert into shop.customer_addresses (
      id, user_id, label, full_name, street, postal_code, city, country,
      is_default, created_at, updated_at
    )
    select
      id, user_id, label, full_name, street, postal_code, city, country,
      is_default, created_at, updated_at
    from public.customer_addresses
    where country = 'DE'
    on conflict (id) do nothing;
  end if;
end
$$;

-- Atomic cart + stock operations. Every mutation locks the product row before
-- changing stock and cart state, eliminating compensation windows in the app.
create or replace function shop.add_cart_item(
  p_cart_id uuid,
  p_product_id uuid,
  p_variant_id text,
  p_qty integer
)
returns table(item_id uuid, new_quantity integer)
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  product_row shop.products%rowtype;
  existing_id uuid;
  current_quantity integer := 0;
  increment integer;
begin
  if p_cart_id is null or p_product_id is null or p_qty is null or p_qty <= 0 then
    raise exception 'invalid cart input' using errcode = 'P0002';
  end if;

  select * into product_row
  from shop.products
  where id = p_product_id and is_active = true
  for update;
  if not found then
    raise exception 'product unavailable' using errcode = 'P0001';
  end if;

  if p_variant_id is not null and not exists (
    select 1
    from jsonb_array_elements(coalesce(product_row.variants, '[]'::jsonb)) variant
    where coalesce(variant->>'cj_variant_id', variant->>'vid') = p_variant_id
  ) then
    raise exception 'variant unavailable' using errcode = 'P0003';
  end if;

  select id, quantity into existing_id, current_quantity
  from shop.cart_items
  where cart_id = p_cart_id
    and product_id = p_product_id
    and variant_id is not distinct from p_variant_id
  for update;

  current_quantity := coalesce(current_quantity, 0);
  increment := least(p_qty, 99 - current_quantity);
  if increment <= 0 then
    return query select existing_id, current_quantity;
    return;
  end if;

  if not product_row.allow_backorder and product_row.stock < increment then
    raise exception 'stock exhausted' using errcode = 'P0001';
  end if;

  update shop.products
  set stock = stock - increment,
      updated_at = now()
  where id = p_product_id;

  if existing_id is null then
    insert into shop.cart_items (cart_id, product_id, variant_id, quantity)
    values (p_cart_id, p_product_id, p_variant_id, increment)
    returning id, quantity into existing_id, current_quantity;
  else
    update shop.cart_items
    set quantity = current_quantity + increment,
        updated_at = now()
    where id = existing_id
    returning quantity into current_quantity;
  end if;

  return query select existing_id, current_quantity;
end
$$;

create or replace function shop.set_cart_item_quantity(
  p_cart_id uuid,
  p_item_id uuid,
  p_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  product_id_value uuid;
  current_quantity integer;
  target_quantity integer;
  delta integer;
  product_row shop.products%rowtype;
begin
  if p_cart_id is null or p_item_id is null or p_quantity is null then
    raise exception 'invalid cart input' using errcode = 'P0002';
  end if;

  select product_id into product_id_value
  from shop.cart_items
  where id = p_item_id and cart_id = p_cart_id;
  if not found then return null; end if;

  select * into product_row
  from shop.products
  where id = product_id_value
  for update;
  if not found then
    raise exception 'product unavailable' using errcode = 'P0001';
  end if;

  select quantity into current_quantity
  from shop.cart_items
  where id = p_item_id and cart_id = p_cart_id
  for update;
  if not found then return null; end if;

  target_quantity := greatest(0, least(p_quantity, 99));
  delta := target_quantity - current_quantity;

  if delta > 0 then
    if not product_row.allow_backorder and product_row.stock < delta then
      raise exception 'stock exhausted' using errcode = 'P0001';
    end if;
    update shop.products
    set stock = stock - delta,
        updated_at = now()
    where id = product_id_value;
  elsif delta < 0 then
    update shop.products
    set stock = stock + (-delta),
        updated_at = now()
    where id = product_id_value;
  end if;

  if target_quantity = 0 then
    delete from shop.cart_items where id = p_item_id and cart_id = p_cart_id;
  else
    update shop.cart_items
    set quantity = target_quantity,
        updated_at = now()
    where id = p_item_id and cart_id = p_cart_id;
  end if;

  return target_quantity;
end
$$;

-- Lower-level stock functions remain for controlled integration tests and
-- exceptional maintenance, not for normal cart mutations.
create or replace function shop.reserve_stock(p_product_id uuid, p_qty integer)
returns integer
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  remaining integer;
begin
  if p_qty is null or p_qty <= 0 or p_qty > 99 then
    raise exception 'invalid quantity' using errcode = 'P0002';
  end if;

  update shop.products
  set stock = stock - p_qty,
      updated_at = now()
  where id = p_product_id
    and (allow_backorder or stock >= p_qty)
  returning stock into remaining;

  if not found then
    raise exception 'stock exhausted' using errcode = 'P0001';
  end if;
  return remaining;
end
$$;

create or replace function shop.release_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = shop, public
as $$
begin
  if p_qty is null or p_qty <= 0 or p_qty > 99 then
    raise exception 'invalid quantity' using errcode = 'P0002';
  end if;

  update shop.products
  set stock = stock + p_qty,
      updated_at = now()
  where id = p_product_id;
end
$$;

create or replace function shop.save_customer_address(
  p_id uuid,
  p_label text,
  p_full_name text,
  p_street text,
  p_postal_code text,
  p_city text,
  p_country text,
  p_is_default boolean
)
returns uuid
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = 'P0004';
  end if;
  if p_country <> 'DE' then
    raise exception 'unsupported country' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_full_name, ''))) < 2
    or length(trim(coalesce(p_street, ''))) < 3
    or length(trim(coalesce(p_postal_code, ''))) < 4
    or length(trim(coalesce(p_city, ''))) < 2 then
    raise exception 'invalid address' using errcode = 'P0002';
  end if;

  if coalesce(p_is_default, false) then
    update shop.customer_addresses
    set is_default = false, updated_at = now()
    where user_id = current_user_id and is_default = true;
  end if;

  if p_id is null then
    insert into shop.customer_addresses (
      user_id, label, full_name, street, postal_code, city, country, is_default
    ) values (
      current_user_id,
      left(coalesce(nullif(trim(p_label), ''), 'Zuhause'), 40),
      left(trim(p_full_name), 120),
      left(trim(p_street), 200),
      left(trim(p_postal_code), 10),
      left(trim(p_city), 100),
      p_country,
      coalesce(p_is_default, false)
    ) returning id into saved_id;
  else
    update shop.customer_addresses
    set label = left(coalesce(nullif(trim(p_label), ''), 'Zuhause'), 40),
        full_name = left(trim(p_full_name), 120),
        street = left(trim(p_street), 200),
        postal_code = left(trim(p_postal_code), 10),
        city = left(trim(p_city), 100),
        country = p_country,
        is_default = coalesce(p_is_default, false),
        updated_at = now()
    where id = p_id and user_id = current_user_id
    returning id into saved_id;

    if saved_id is null then
      raise exception 'address not found' using errcode = 'P0004';
    end if;
  end if;

  return saved_id;
end
$$;

create or replace function shop.anonymize_customer_account(
  p_user_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  redacted_email text;
  order_ids uuid[];
  anonymized_orders integer := 0;
  deleted_rows integer := 0;
  result jsonb := '{}'::jsonb;
begin
  if p_user_id is null or length(trim(coalesce(p_email, ''))) < 3 then
    raise exception 'invalid account identity' using errcode = 'P0002';
  end if;

  redacted_email := 'deleted-' || replace(p_user_id::text, '-', '') || '@deleted.invalid';

  select coalesce(array_agg(id), '{}'::uuid[]) into order_ids
  from shop.orders
  where user_id = p_user_id;

  update shop.email_log
  set recipient = redacted_email
  where order_id = any(order_ids);

  delete from shop.email_log
  where order_id is null and lower(recipient) = lower(trim(p_email));

  update shop.return_requests
  set user_id = null,
      reason = '[redacted]'
  where user_id = p_user_id;

  update shop.orders
  set email = redacted_email,
      customer_name = null,
      shipping_address = null,
      billing_address = null,
      user_id = null,
      updated_at = now()
  where user_id = p_user_id;
  get diagnostics anonymized_orders = row_count;

  delete from shop.wishlist_items where user_id = p_user_id;
  get diagnostics deleted_rows = row_count;
  result := result || jsonb_build_object('wishlist_deleted', deleted_rows);

  delete from shop.customer_addresses where user_id = p_user_id;
  get diagnostics deleted_rows = row_count;
  result := result || jsonb_build_object('addresses_deleted', deleted_rows);

  delete from shop.contact_messages
  where user_id = p_user_id or lower(email) = lower(trim(p_email));
  get diagnostics deleted_rows = row_count;
  result := result || jsonb_build_object('contact_messages_deleted', deleted_rows);

  delete from shop.newsletter_subscribers
  where lower(email) = lower(trim(p_email));
  get diagnostics deleted_rows = row_count;
  result := result || jsonb_build_object('newsletter_records_deleted', deleted_rows);

  delete from shop.cart_items where user_id = p_user_id;

  delete from public.admin_users where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from public.customers
  where auth_user_id = p_user_id or lower(email) = lower(trim(p_email));

  return result || jsonb_build_object('orders_anonymized', anonymized_orders);
end
$$;

create or replace function shop.apply_tiktok_order_notification(
  p_notification_id text,
  p_shop_id text,
  p_order_id text,
  p_order_status text
)
returns boolean
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  configured_shop_id text;
  inserted integer;
begin
  if length(trim(coalesce(p_notification_id, ''))) < 3
    or length(trim(coalesce(p_shop_id, ''))) < 3
    or length(trim(coalesce(p_order_id, ''))) < 3 then
    raise exception 'invalid TikTok notification' using errcode = 'P0002';
  end if;

  select shop_id into configured_shop_id
  from shop.tiktok_auth
  where id = 1;
  if configured_shop_id is null or configured_shop_id <> trim(p_shop_id) then
    raise exception 'TikTok shop mismatch' using errcode = 'P0004';
  end if;

  insert into shop.processed_events (event_id, type)
  values (
    'tiktok:' || left(trim(p_notification_id), 220),
    'ORDER_STATUS_CHANGE:' || left(trim(p_order_status), 60)
  )
  on conflict (event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return false; end if;

  if p_order_status = 'AWAITING_SHIPMENT' then
    insert into shop.tiktok_orders (
      tiktok_order_id, status, updated_at
    ) values (
      left(trim(p_order_id), 200), 'received', now()
    )
    on conflict (tiktok_order_id) do update
    set status = case
          when shop.tiktok_orders.status in ('received', 'cj_failed') then 'received'
          else shop.tiktok_orders.status
        end,
        updated_at = now();
  end if;

  return true;
end
$$;

create or replace function shop.apply_cj_order_event(
  p_event_id text,
  p_event_type text,
  p_cj_order_id text,
  p_fulfillment_status text,
  p_tracking_number text
)
returns table(order_id uuid, tracking_number text)
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  inserted integer;
begin
  if p_fulfillment_status not in ('shipped', 'delivered', 'failed') then
    raise exception 'invalid fulfillment status' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_event_id, ''))) < 3
    or length(trim(coalesce(p_cj_order_id, ''))) < 3 then
    raise exception 'invalid CJ event' using errcode = 'P0002';
  end if;

  insert into shop.processed_events (event_id, type)
  values ('cj:' || left(trim(p_event_id), 240), left(trim(p_event_type), 100))
  on conflict (event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;

  return query
  update shop.orders
  set fulfillment_status = p_fulfillment_status,
      cj_order_status = left(trim(p_event_type), 100),
      tracking_number = case
        when nullif(trim(coalesce(p_tracking_number, '')), '') is not null
          then left(trim(p_tracking_number), 200)
        else shop.orders.tracking_number
      end,
      shipped_at = case
        when p_fulfillment_status = 'shipped' then coalesce(shop.orders.shipped_at, now())
        else shop.orders.shipped_at
      end,
      delivered_at = case
        when p_fulfillment_status = 'delivered' then coalesce(shop.orders.delivered_at, now())
        else shop.orders.delivered_at
      end,
      updated_at = now()
  where cj_order_id = trim(p_cj_order_id)
  returning id, shop.orders.tracking_number;

  if not found then
    raise exception 'CJ order not found' using errcode = 'P0001';
  end if;
end
$$;

create or replace function shop.apply_email_delivery_event(
  p_event_id text,
  p_event_type text,
  p_recipient text
)
returns boolean
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  inserted integer;
begin
  if length(trim(coalesce(p_event_id, ''))) < 3
    or length(trim(coalesce(p_recipient, ''))) < 3 then
    raise exception 'invalid email event' using errcode = 'P0002';
  end if;

  insert into shop.processed_events (event_id, type)
  values ('resend:' || left(trim(p_event_id), 200), left(trim(p_event_type), 100))
  on conflict (event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return false; end if;

  if p_event_type in ('email.bounced', 'email.complained') then
    update shop.newsletter_subscribers
    set status = 'unsubscribed',
        confirmation_token_hash = null,
        unsubscribed_at = now(),
        updated_at = now()
    where lower(email) = lower(trim(p_recipient));
  end if;

  return true;
end
$$;

create or replace function shop.lookup_order_tracking(
  p_reference text,
  p_email text
)
returns table(
  order_id uuid,
  order_status text,
  created_at timestamptz,
  amount_total integer,
  currency text,
  tracking_number text
)
language sql
security definer
set search_path = shop, public
as $$
  select
    orders.id,
    coalesce(orders.fulfillment_status, orders.status),
    orders.created_at,
    orders.amount_total,
    orders.currency,
    orders.tracking_number
  from shop.orders
  where lower(orders.email) = lower(trim(p_email))
    and (
      lower(orders.id::text) = lower(trim(p_reference))
      or upper(left(replace(orders.id::text, '-', ''), 8)) = upper(replace(trim(p_reference), '-', ''))
    )
  order by orders.created_at desc
  limit 2;
$$;

create or replace function shop.cleanup_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = shop, public
as $$
declare
  cart_row record;
  released integer := 0;
begin
  for cart_row in
    delete from shop.cart_items
    where cart_id is not null
      and updated_at < now() - interval '24 hours'
    returning product_id, quantity
  loop
    update shop.products
    set stock = stock + cart_row.quantity,
        updated_at = now()
    where id = cart_row.product_id;
    released := released + 1;
  end loop;
  return released;
end
$$;

revoke all on function shop.add_cart_item(uuid, uuid, text, integer) from public;
revoke all on function shop.set_cart_item_quantity(uuid, uuid, integer) from public;
revoke all on function shop.save_customer_address(uuid, text, text, text, text, text, text, boolean) from public;
revoke all on function shop.anonymize_customer_account(uuid, text) from public;
revoke all on function shop.apply_tiktok_order_notification(text, text, text, text) from public;
revoke all on function shop.apply_cj_order_event(text, text, text, text, text) from public;
revoke all on function shop.apply_email_delivery_event(text, text, text) from public;
revoke all on function shop.lookup_order_tracking(text, text) from public;
revoke all on function shop.reserve_stock(uuid, integer) from public;
revoke all on function shop.release_stock(uuid, integer) from public;
revoke all on function shop.cleanup_stale_reservations() from public;
grant execute on function shop.add_cart_item(uuid, uuid, text, integer) to service_role;
grant execute on function shop.set_cart_item_quantity(uuid, uuid, integer) to service_role;
grant execute on function shop.save_customer_address(uuid, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function shop.anonymize_customer_account(uuid, text) to service_role;
grant execute on function shop.apply_tiktok_order_notification(text, text, text, text) to service_role;
grant execute on function shop.apply_cj_order_event(text, text, text, text, text) to service_role;
grant execute on function shop.apply_email_delivery_event(text, text, text) to service_role;
grant execute on function shop.lookup_order_tracking(text, text) to service_role;
grant execute on function shop.reserve_stock(uuid, integer) to service_role;
grant execute on function shop.release_stock(uuid, integer) to service_role;
grant execute on function shop.cleanup_stale_reservations() to service_role;

-- App-facing product view. Security invoker preserves the table's RLS policy.
-- Drop/recreate is intentional because the historical one-off view had extra
-- columns and CREATE OR REPLACE cannot remove or reorder existing columns.
drop view if exists shop.products_v;
create view shop.products_v
with (security_invoker = true)
as
select
  p.id,
  coalesce(p.title_de, p.name) as title,
  p.slug,
  coalesce(p.description_de, p.description) as description,
  p.price,
  p.original_price,
  p.compare_at_price,
  p.category_id,
  coalesce(p.image_url_local, p.images->>0, '') as image_url,
  coalesce(p.image_gallery, array[]::text[]) as image_gallery,
  p.stock,
  p.is_active,
  coalesce(p.variants, '[]'::jsonb) as variants,
  p.metadata,
  p.badge,
  p.sold_count,
  p.rating,
  p.rating_count,
  coalesce((p.metadata->>'is_featured')::boolean, false) as is_featured,
  p.created_at,
  p.updated_at,
  p.cj_product_id,
  p.cj_variant_id,
  p.cj_sku,
  p.cj_cost_price,
  p.cj_last_synced_at,
  p.manufacturer_name,
  p.manufacturer_address,
  p.manufacturer_email,
  p.manufacturer_phone,
  p.manufacturer_verified,
  p.responsible_person_name,
  p.responsible_person_company,
  p.responsible_person_address,
  p.responsible_person_email,
  p.responsible_person_phone,
  p.responsible_person_verified,
  p.gpsr_verified_at
from shop.products p;

grant select on shop.categories, shop.products to anon, authenticated;
grant select on shop.categories, shop.products_v to service_role;
grant select, insert, update, delete on shop.customer_addresses to authenticated;
grant select, insert, delete on shop.wishlist_items to authenticated;
grant all on shop.products, shop.categories, shop.orders, shop.cart_items, shop.processed_events, shop.email_log, shop.newsletter_subscribers, shop.customer_addresses, shop.return_requests, shop.contact_messages, shop.csp_violations, shop.wishlist_items, shop.tiktok_auth, shop.tiktok_orders to service_role;

alter table shop.categories enable row level security;
alter table shop.products enable row level security;
alter table shop.orders enable row level security;
alter table shop.cart_items enable row level security;
alter table shop.processed_events enable row level security;
alter table shop.email_log enable row level security;
alter table shop.newsletter_subscribers enable row level security;
alter table shop.customer_addresses enable row level security;
alter table shop.return_requests enable row level security;
alter table shop.contact_messages enable row level security;
alter table shop.csp_violations enable row level security;
alter table shop.wishlist_items enable row level security;
alter table shop.tiktok_auth enable row level security;
alter table shop.tiktok_orders enable row level security;
revoke all on shop.newsletter_subscribers, shop.tiktok_auth, shop.tiktok_orders from anon, authenticated;

drop policy if exists categories_public_read on shop.categories;
create policy categories_public_read on shop.categories
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists products_public_read on shop.products;
create policy products_public_read on shop.products
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists orders_select_own on shop.orders;
create policy orders_select_own on shop.orders
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists email_log_select_own on shop.email_log;
create policy email_log_select_own on shop.email_log
  for select to authenticated
  using (
    exists (
      select 1 from shop.orders
      where shop.orders.id = shop.email_log.order_id
        and shop.orders.user_id = auth.uid()
    )
  );

drop policy if exists customer_addresses_select_own on shop.customer_addresses;
create policy customer_addresses_select_own on shop.customer_addresses
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists customer_addresses_insert_own on shop.customer_addresses;
create policy customer_addresses_insert_own on shop.customer_addresses
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists customer_addresses_update_own on shop.customer_addresses;
create policy customer_addresses_update_own on shop.customer_addresses
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists customer_addresses_delete_own on shop.customer_addresses;
create policy customer_addresses_delete_own on shop.customer_addresses
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists wishlist_items_select_own on shop.wishlist_items;
create policy wishlist_items_select_own on shop.wishlist_items
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists wishlist_items_insert_own on shop.wishlist_items;
create policy wishlist_items_insert_own on shop.wishlist_items
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists wishlist_items_delete_own on shop.wishlist_items;
create policy wishlist_items_delete_own on shop.wishlist_items
  for delete to authenticated using (auth.uid() = user_id);

-- Keep timestamps current on the tables modified by the runtime.
drop trigger if exists trg_shop_products_updated on shop.products;
create trigger trg_shop_products_updated
before update on shop.products
for each row execute function public.touch_updated_at();

drop trigger if exists trg_shop_orders_updated on shop.orders;
create trigger trg_shop_orders_updated
before update on shop.orders
for each row execute function public.touch_updated_at();

drop trigger if exists trg_shop_cart_items_updated on shop.cart_items;
create trigger trg_shop_cart_items_updated
before update on shop.cart_items
for each row execute function public.touch_updated_at();

drop trigger if exists trg_shop_newsletter_updated on shop.newsletter_subscribers;
create trigger trg_shop_newsletter_updated
before update on shop.newsletter_subscribers
for each row execute function public.touch_updated_at();

drop trigger if exists trg_shop_customer_addresses_updated on shop.customer_addresses;
create trigger trg_shop_customer_addresses_updated
before update on shop.customer_addresses
for each row execute function public.touch_updated_at();

notify pgrst, 'reload schema';
