alter table public.promotions
  add column if not exists banner_placement text not null default 'all';

alter table public.promotions
  add column if not exists segment_scope text not null default 'all';

alter table public.promotions
  drop constraint if exists chk_promotions_banner_placement;

alter table public.promotions
  add constraint chk_promotions_banner_placement
  check (banner_placement in ('all', 'header', 'pdp', 'cart'));

alter table public.promotions
  drop constraint if exists chk_promotions_segment_scope;

alter table public.promotions
  add constraint chk_promotions_segment_scope
  check (segment_scope in ('all', 'b2c', 'b2b'));

create index if not exists idx_promotions_banner_scope
  on public.promotions(is_active, banner_placement, segment_scope, start_date, end_date);
