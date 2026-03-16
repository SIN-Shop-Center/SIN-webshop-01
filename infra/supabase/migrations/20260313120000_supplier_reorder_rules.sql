alter table public.product_suppliers
  add column if not exists reorder_min_stock integer,
  add column if not exists reorder_target_stock integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_suppliers_reorder_stock_check'
  ) then
    alter table public.product_suppliers
      add constraint product_suppliers_reorder_stock_check
      check (
        (reorder_min_stock is null or reorder_min_stock >= 0) and
        (reorder_target_stock is null or reorder_target_stock >= 0) and
        (reorder_min_stock is null or reorder_target_stock is null or reorder_target_stock >= reorder_min_stock)
      );
  end if;
end $$;
