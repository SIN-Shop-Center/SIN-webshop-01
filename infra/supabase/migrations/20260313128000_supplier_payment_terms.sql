alter table public.suppliers
  add column if not exists payment_terms_days integer not null default 30,
  add column if not exists early_payment_discount_pct numeric(5,2),
  add column if not exists early_payment_discount_days integer;
