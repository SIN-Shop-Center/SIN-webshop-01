-- Complete application-owned shop contracts that previously existed only as
-- one-off setup scripts. All tables are RLS default-deny unless a narrow public
-- or authenticated policy is declared below.

create table if not exists shop.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shop.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  user_name text,
  source text not null default 'shop' check (source in ('shop', 'cj')),
  is_verified boolean not null default false,
  cj_comment_id text,
  country_code text,
  image_urls text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists reviews_product_user_uidx
  on shop.reviews (product_id, user_id) where user_id is not null;
create unique index if not exists reviews_cj_comment_uidx
  on shop.reviews (cj_comment_id) where cj_comment_id is not null;
create index if not exists reviews_product_created_idx
  on shop.reviews (product_id, created_at desc);
alter table shop.reviews enable row level security;
drop policy if exists reviews_public_select on shop.reviews;
create policy reviews_public_select on shop.reviews for select to anon, authenticated using (true);

create or replace function shop.has_purchased(p_product uuid)
returns boolean
language sql stable security definer set search_path = shop, public
as $$
  select exists (
    select 1 from shop.orders
    where user_id = auth.uid()
      and status in ('paid', 'shipped', 'fulfilled', 'completed')
      and items @> jsonb_build_array(jsonb_build_object('product_id', p_product::text))
  );
$$;
revoke all on function shop.has_purchased(uuid) from public;
grant execute on function shop.has_purchased(uuid) to authenticated;

drop policy if exists reviews_verified_buyer_insert on shop.reviews;
create policy reviews_verified_buyer_insert on shop.reviews for insert to authenticated
  with check (auth.uid() = user_id and source = 'shop' and shop.has_purchased(product_id));
drop policy if exists reviews_own_update on shop.reviews;
create policy reviews_own_update on shop.reviews for update to authenticated
  using (auth.uid() = user_id and source = 'shop')
  with check (auth.uid() = user_id and source = 'shop');
drop policy if exists reviews_own_delete on shop.reviews;
create policy reviews_own_delete on shop.reviews for delete to authenticated
  using (auth.uid() = user_id and source = 'shop');

create or replace function shop.refresh_product_ratings()
returns void
language sql security definer set search_path = shop, public
as $$
  update shop.products product set
    rating = coalesce(summary.avg_rating, 0),
    rating_count = coalesce(summary.review_count, 0)
  from (
    select product_id, round(avg(rating)::numeric, 1) as avg_rating, count(*)::integer as review_count
    from shop.reviews group by product_id
  ) summary
  where product.id = summary.product_id;
$$;
revoke all on function shop.refresh_product_ratings() from public;
grant execute on function shop.refresh_product_ratings() to service_role;

create table if not exists shop.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shop.products(id) on delete cascade,
  email text not null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, email)
);
create index if not exists stock_alerts_pending_idx
  on shop.stock_alerts (product_id) where notified_at is null;
alter table shop.stock_alerts enable row level security;

create table if not exists shop.fx_rates (
  from_currency text not null,
  to_currency text not null,
  rate numeric(10,6) not null check (rate > 0 and rate < 1000),
  source text not null default 'frankfurter',
  updated_at timestamptz not null default now(),
  primary key (from_currency, to_currency)
);
alter table shop.fx_rates enable row level security;
drop policy if exists fx_rates_public_read on shop.fx_rates;
create policy fx_rates_public_read on shop.fx_rates for select to anon, authenticated using (true);

create table if not exists shop.cj_auth (
  id integer primary key default 1 check (id = 1),
  access_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token text,
  updated_at timestamptz not null default now()
);
alter table shop.cj_auth enable row level security;

create or replace function shop.is_admin()
returns boolean
language sql stable security definer set search_path = shop, public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function shop.is_admin() from public;
grant execute on function shop.is_admin() to authenticated, service_role;

create table if not exists shop.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_actor_idx
  on shop.admin_audit_log (admin_user_id, created_at desc);
create index if not exists admin_audit_resource_idx
  on shop.admin_audit_log (resource_type, resource_id, created_at desc);
alter table shop.admin_audit_log enable row level security;
drop policy if exists admin_audit_read on shop.admin_audit_log;
create policy admin_audit_read on shop.admin_audit_log for select to authenticated
  using (shop.is_admin());

grant all on shop.reviews, shop.stock_alerts, shop.fx_rates, shop.cj_auth, shop.admin_audit_log to service_role;
notify pgrst, 'reload schema';
