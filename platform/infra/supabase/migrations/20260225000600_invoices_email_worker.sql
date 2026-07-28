create table if not exists public.invoice_sequences (
  year integer primary key,
  next_value integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  invoice_number text not null unique,
  status text not null default 'issued',
  issue_date date not null,
  performance_date date not null,
  currency text not null default 'EUR',
  subtotal_amount integer not null,
  shipping_amount integer not null default 0,
  tax_amount integer not null default 0,
  total_amount integer not null,
  customer_email text not null,
  customer_name text,
  customer_address jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  pdf_path text not null,
  pdf_sha256 text not null,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_issue_date on public.invoices(issue_date desc);
create index if not exists idx_invoices_status on public.invoices(status, created_at);

drop trigger if exists trg_invoices_updated on public.invoices;
create trigger trg_invoices_updated before update on public.invoices
for each row execute procedure public.touch_updated_at();

alter table public.email_log
  add column if not exists last_error text;

alter table public.email_log
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists ux_email_log_order_type
  on public.email_log(order_id, email_type)
  where order_id is not null;

drop trigger if exists trg_email_log_updated on public.email_log;
create trigger trg_email_log_updated before update on public.email_log
for each row execute procedure public.touch_updated_at();

create table if not exists public.ai_chat_audit (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  request_message text not null,
  response_message text,
  provider text not null default 'local',
  status text not null default 'processed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_ai_chat_audit_session
  on public.ai_chat_audit(session_id, created_at desc);
