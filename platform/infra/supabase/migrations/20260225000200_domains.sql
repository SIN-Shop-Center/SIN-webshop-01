-- Domain extension schema for CMS, AI, social, support and affiliate automation

create table if not exists public.pages (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  content text not null default '',
  meta_title text,
  meta_description text,
  page_type text not null default 'custom',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  featured_image text,
  category text,
  tags text[] not null default '{}'::text[],
  author text,
  status text not null default 'draft',
  published_at timestamptz,
  scheduled_at timestamptz,
  meta_title text,
  meta_description text,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  type text not null,
  code text unique,
  discount_value numeric(10,2) not null default 0,
  discount_percentage numeric(5,2) not null default 0,
  minimum_order numeric(10,2) not null default 0,
  maximum_discount numeric(10,2),
  usage_limit integer,
  usage_count integer not null default 0,
  per_customer_limit integer,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  is_active boolean not null default true,
  applies_to text not null default 'all',
  category_ids uuid[] not null default '{}'::uuid[],
  product_ids uuid[] not null default '{}'::uuid[],
  banner_text text,
  banner_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_config (
  id text primary key,
  provider text not null,
  model text not null,
  personality text not null default 'friendly',
  language text not null default 'de',
  "systemPrompt" text not null,
  temperature numeric(3,2) not null default 0.7,
  "maxTokens" integer not null default 500,
  "welcomeMessage" text,
  "fallbackMessage" text,
  "enabledFeatures" jsonb not null default '{}'::jsonb,
  "workingHours" jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trends (
  id uuid primary key default uuid_generate_v4(),
  source text not null,
  title text not null,
  summary text,
  score numeric(5,2),
  metadata jsonb not null default '{}'::jsonb,
  report_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id uuid primary key default uuid_generate_v4(),
  channel text not null,
  status text not null default 'draft',
  content text not null,
  media_urls text[] not null default '{}'::text[],
  scheduled_for timestamptz,
  posted_at timestamptz,
  external_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  email text,
  subject text not null,
  message text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  assigned_to uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_partners (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  email text,
  status text not null default 'active',
  commission_rate numeric(5,2) not null default 10,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid not null references public.affiliate_partners(id) on delete cascade,
  session_id text,
  referrer text,
  target_url text,
  converted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_conversions (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid not null references public.affiliate_partners(id) on delete cascade,
  click_id uuid references public.affiliate_clicks(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(10,2) not null default 0,
  commission_amount numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_pages_slug on public.pages(slug);
create index if not exists idx_blog_slug on public.blog_posts(slug);
create index if not exists idx_blog_status on public.blog_posts(status);
create index if not exists idx_promotions_active on public.promotions(is_active, start_date, end_date);
create index if not exists idx_trends_date on public.trends(report_date desc);
create index if not exists idx_social_status on public.social_posts(status, scheduled_for);
create index if not exists idx_support_status on public.support_tickets(status, priority);
create index if not exists idx_affiliate_clicks_partner on public.affiliate_clicks(partner_id, created_at);
create index if not exists idx_affiliate_conversions_partner on public.affiliate_conversions(partner_id, created_at);

create or replace function public.sync_ai_config_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new."updatedAt" = new.updated_at;
  if new."createdAt" is null then
    new."createdAt" = coalesce(new.created_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pages_updated on public.pages;
create trigger trg_pages_updated before update on public.pages
for each row execute procedure public.touch_updated_at();
drop trigger if exists trg_blog_posts_updated on public.blog_posts;
create trigger trg_blog_posts_updated before update on public.blog_posts
for each row execute procedure public.touch_updated_at();
drop trigger if exists trg_promotions_updated on public.promotions;
create trigger trg_promotions_updated before update on public.promotions
for each row execute procedure public.touch_updated_at();
drop trigger if exists trg_ai_config_updated on public.ai_config;
create trigger trg_ai_config_updated before update on public.ai_config
for each row execute procedure public.sync_ai_config_updated_at();
drop trigger if exists trg_social_posts_updated on public.social_posts;
create trigger trg_social_posts_updated before update on public.social_posts
for each row execute procedure public.touch_updated_at();
drop trigger if exists trg_support_tickets_updated on public.support_tickets;
create trigger trg_support_tickets_updated before update on public.support_tickets
for each row execute procedure public.touch_updated_at();
drop trigger if exists trg_affiliate_partners_updated on public.affiliate_partners;
create trigger trg_affiliate_partners_updated before update on public.affiliate_partners
for each row execute procedure public.touch_updated_at();
