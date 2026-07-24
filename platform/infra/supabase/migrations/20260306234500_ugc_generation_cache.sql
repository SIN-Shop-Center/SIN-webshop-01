alter table public.ugc_generation_runs
  add column if not exists fingerprint_hash text;

alter table public.ugc_generation_runs
  add column if not exists source_run_id uuid references public.ugc_generation_runs(id) on delete set null;

create index if not exists idx_ugc_generation_runs_fingerprint
  on public.ugc_generation_runs(fingerprint_hash, updated_at desc)
  where fingerprint_hash is not null;

create index if not exists idx_ugc_generation_runs_source
  on public.ugc_generation_runs(source_run_id)
  where source_run_id is not null;
