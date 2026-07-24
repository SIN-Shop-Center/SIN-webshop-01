create table if not exists public.checkout_sessions (
  id uuid primary key default uuid_generate_v4(),
  idempotency_key text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  stripe_session_id text not null unique,
  checkout_url text not null,
  status text not null default 'requires_payment',
  customer_email text not null,
  currency text not null,
  amount_total integer not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checkout_sessions_order_id
  on public.checkout_sessions(order_id);

create index if not exists idx_checkout_sessions_status
  on public.checkout_sessions(status);

drop trigger if exists trg_checkout_sessions_updated on public.checkout_sessions;
create trigger trg_checkout_sessions_updated before update on public.checkout_sessions
for each row execute procedure public.touch_updated_at();

