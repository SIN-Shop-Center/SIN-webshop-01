alter table public.product_suppliers
  add column if not exists cost_currency text not null default 'EUR',
  add column if not exists cost_fx_rate_to_eur numeric not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_suppliers_cost_currency_check'
  ) then
    alter table public.product_suppliers
      add constraint product_suppliers_cost_currency_check
      check (cost_currency in ('EUR', 'USD', 'GBP'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_suppliers_cost_fx_rate_check'
  ) then
    alter table public.product_suppliers
      add constraint product_suppliers_cost_fx_rate_check
      check (cost_fx_rate_to_eur > 0 and cost_fx_rate_to_eur < 1000);
  end if;
end $$;
