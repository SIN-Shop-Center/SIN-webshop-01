alter table public.supplier_orders
  add column if not exists cost_amount integer,
  add column if not exists cost_currency text not null default 'EUR',
  add column if not exists due_at timestamptz,
  add column if not exists discount_until timestamptz,
  add column if not exists discount_pct numeric(5,2),
  add column if not exists paid_at timestamptz,
  add column if not exists payment_reference text;

create or replace function public.compute_supplier_order_payment_dates()
returns trigger as $$
declare
  v_terms_days integer;
  v_discount_pct numeric(5,2);
  v_discount_days integer;
begin
  select payment_terms_days, early_payment_discount_pct, early_payment_discount_days
  into v_terms_days, v_discount_pct, v_discount_days
  from public.suppliers
  where id = new.supplier_id;

  if new.placed_at is not null and old.placed_at is null then
    new.due_at := new.placed_at + (v_terms_days || ' days')::interval;
    if v_discount_pct is not null and v_discount_days is not null then
      new.discount_until := new.placed_at + (v_discount_days || ' days')::interval;
      new.discount_pct := v_discount_pct;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_supplier_order_payment_dates
  before insert or update on public.supplier_orders
  for each row execute procedure public.compute_supplier_order_payment_dates();
