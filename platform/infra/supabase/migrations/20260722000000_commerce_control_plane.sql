-- Commerce control plane: traceable trend -> sourcing -> enrichment -> creative -> publish pipeline
-- Service-role only. No public RLS policies are intentionally created.

-- ---------------------------------------------------------------------------
-- Product readiness columns (storefront domain lives in shop schema)
-- ---------------------------------------------------------------------------
alter table shop.products
  add column if not exists pipeline_state text not null default 'legacy',
  add column if not exists approval_state text not null default 'review_required',
  add column if not exists data_quality_score numeric(5,2) not null default 0,
  add column if not exists creative_status text not null default 'missing',
  add column if not exists risk_level text not null default 'unknown',
  add column if not exists publish_blockers jsonb not null default '[]'::jsonb,
  add column if not exists research_source_urls text[] not null default '{}'::text[],
  add column if not exists manufacturer_verified boolean not null default false,
  add column if not exists responsible_person_verified boolean not null default false,
  add column if not exists gpsr_verified_at timestamptz,
  add column if not exists last_enriched_at timestamptz;

-- The previous GPSR migration used ShopSIN defaults as placeholders. A default
-- must never turn an unknown manufacturer into an asserted fact for new rows.
alter table shop.products alter column manufacturer_name drop default;
alter table shop.products alter column manufacturer_address drop default;
alter table shop.products alter column manufacturer_email drop default;
alter table shop.products alter column manufacturer_phone drop default;
alter table shop.products alter column manufacturer_name drop not null;
alter table shop.products alter column manufacturer_address drop not null;
alter table shop.products alter column manufacturer_email drop not null;
alter table shop.products alter column manufacturer_phone drop not null;
alter table shop.products alter column responsible_person_name drop default;
alter table shop.products alter column responsible_person_company drop default;
alter table shop.products alter column responsible_person_address drop default;
alter table shop.products alter column responsible_person_email drop default;
alter table shop.products alter column responsible_person_phone drop default;
alter table shop.products alter column responsible_person_name drop not null;
alter table shop.products alter column responsible_person_company drop not null;
alter table shop.products alter column responsible_person_address drop not null;
alter table shop.products alter column responsible_person_email drop not null;
alter table shop.products alter column responsible_person_phone drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_pipeline_state_check'
  ) then
    alter table shop.products
      add constraint products_pipeline_state_check
      check (pipeline_state in (
        'legacy', 'sourced', 'enriching', 'enriched', 'creative_queued',
        'creative_ready', 'ready_to_publish', 'published', 'paused', 'rejected'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'products_approval_state_check'
  ) then
    alter table shop.products
      add constraint products_approval_state_check
      check (approval_state in ('review_required', 'approved', 'rejected', 'override'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'products_creative_status_check'
  ) then
    alter table shop.products
      add constraint products_creative_status_check
      check (creative_status in ('missing', 'queued', 'generating', 'review', 'approved', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'products_risk_level_check'
  ) then
    alter table shop.products
      add constraint products_risk_level_check
      check (risk_level in ('unknown', 'low', 'medium', 'high', 'blocked'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'products_data_quality_score_check'
  ) then
    alter table shop.products
      add constraint products_data_quality_score_check
      check (data_quality_score >= 0 and data_quality_score <= 100);
  end if;
end $$;

create index if not exists idx_shop_products_pipeline
  on shop.products(pipeline_state, approval_state, creative_status, updated_at desc);

create index if not exists idx_shop_products_quality
  on shop.products(data_quality_score desc, risk_level, updated_at desc);

alter table shop.products
  add column if not exists tiktok_product_id text,
  add column if not exists tiktok_status text,
  add column if not exists tiktok_last_error text,
  add column if not exists tiktok_published_at timestamptz,
  add column if not exists tiktok_last_synced_at timestamptz;

alter table shop.products drop constraint if exists products_tiktok_status_check;
alter table shop.products
  add constraint products_tiktok_status_check
  check (tiktok_status in ('pending', 'publishing', 'draft', 'published', 'failed', 'skipped', 'blocked'));

create index if not exists idx_shop_products_tiktok_status
  on shop.products(tiktok_status, updated_at desc)
  where tiktok_status is not null;

-- Public storefront view: append only verified product-specific compliance data.
drop view if exists shop.products_v;
create or replace view shop.products_v as
select
  p.id,
  coalesce(p.title_de, p.name) as title,
  p.slug,
  coalesce(p.description_de, p.description) as description,
  p.price,
  p.original_price,
  p.compare_at_price,
  p.category_id,
  coalesce(p.image_url_local, p.images->>0, '') as image_url,
  coalesce(p.image_gallery, array[]::text[]) as image_gallery,
  p.stock,
  p.is_active,
  coalesce(p.variants, '[]'::jsonb) as variants,
  p.metadata,
  p.badge,
  coalesce(p.sold_count, 0) as sold_count,
  coalesce(p.rating, 0) as rating,
  coalesce(p.rating_count, 0) as rating_count,
  coalesce((p.metadata->>'is_featured')::boolean, false) as is_featured,
  p.created_at,
  p.updated_at,
  p.cj_product_id,
  p.cj_variant_id,
  p.cj_sku,
  p.cj_cost_price,
  p.cj_last_synced_at,
  p.manufacturer_name,
  p.manufacturer_address,
  p.manufacturer_email,
  p.manufacturer_phone,
  p.manufacturer_verified,
  p.responsible_person_name,
  p.responsible_person_company,
  p.responsible_person_address,
  p.responsible_person_email,
  p.responsible_person_phone,
  p.responsible_person_verified,
  p.gpsr_verified_at
from shop.products p;

alter view shop.products_v set (security_invoker = true);
grant select on shop.products_v to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Pipeline run ledger
-- ---------------------------------------------------------------------------
create table if not exists public.commerce_pipeline_runs (
  id uuid primary key default uuid_generate_v4(),
  run_type text not null default 'manual',
  status text not null default 'queued',
  requested_by uuid references auth.users(id) on delete set null,
  source text not null default 'admin',
  requested_payload jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'commerce_pipeline_runs_status_check'
  ) then
    alter table public.commerce_pipeline_runs
      add constraint commerce_pipeline_runs_status_check
      check (status in ('queued', 'running', 'partial', 'completed', 'failed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commerce_pipeline_runs_type_check'
  ) then
    alter table public.commerce_pipeline_runs
      add constraint commerce_pipeline_runs_type_check
      check (run_type in ('manual', 'daily', 'retry', 'single_stage'));
  end if;
end $$;

create index if not exists idx_commerce_pipeline_runs_status
  on public.commerce_pipeline_runs(status, created_at desc);

drop trigger if exists trg_commerce_pipeline_runs_updated on public.commerce_pipeline_runs;
create trigger trg_commerce_pipeline_runs_updated before update on public.commerce_pipeline_runs
for each row execute procedure public.touch_updated_at();

create table if not exists public.commerce_pipeline_stage_runs (
  id uuid primary key default uuid_generate_v4(),
  pipeline_run_id uuid references public.commerce_pipeline_runs(id) on delete cascade,
  queue_job_id uuid references public.queue_jobs(id) on delete set null,
  stage text not null,
  status text not null default 'queued',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  duration_ms integer,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'commerce_pipeline_stage_runs_stage_check'
  ) then
    alter table public.commerce_pipeline_stage_runs
      add constraint commerce_pipeline_stage_runs_stage_check
      check (stage in (
        'trend.scan', 'cj.rank', 'product.enrich', 'creative.generate',
        'shop.publish', 'tiktok.publish', 'social.prepare'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commerce_pipeline_stage_runs_status_check'
  ) then
    alter table public.commerce_pipeline_stage_runs
      add constraint commerce_pipeline_stage_runs_status_check
      check (status in ('queued', 'running', 'completed', 'failed', 'blocked', 'skipped'));
  end if;
end $$;

create index if not exists idx_commerce_pipeline_stage_runs_run
  on public.commerce_pipeline_stage_runs(pipeline_run_id, created_at asc);

create index if not exists idx_commerce_pipeline_stage_runs_status
  on public.commerce_pipeline_stage_runs(stage, status, updated_at desc);

drop trigger if exists trg_commerce_pipeline_stage_runs_updated on public.commerce_pipeline_stage_runs;
create trigger trg_commerce_pipeline_stage_runs_updated before update on public.commerce_pipeline_stage_runs
for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Creative handoff ledger. The older UGC tables reference public.products;
-- this table deliberately references the canonical shop.products domain.
-- ---------------------------------------------------------------------------
create table if not exists public.commerce_creative_jobs (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references shop.products(id) on delete cascade,
  pipeline_run_id uuid references public.commerce_pipeline_runs(id) on delete set null,
  project_id text not null,
  project_path text not null,
  pipeline_type text not null default 'product-ugc',
  aspect_ratio text not null default '9:16',
  status text not null default 'queued',
  approval_state text not null default 'awaiting_brief_review',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  render_path text,
  thumbnail_path text,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, project_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'commerce_creative_jobs_status_check'
  ) then
    alter table public.commerce_creative_jobs
      add constraint commerce_creative_jobs_status_check
      check (status in (
        'queued', 'brief_ready', 'awaiting_approval', 'generating',
        'qa_review', 'approved', 'published', 'failed', 'cancelled'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commerce_creative_jobs_approval_check'
  ) then
    alter table public.commerce_creative_jobs
      add constraint commerce_creative_jobs_approval_check
      check (approval_state in (
        'awaiting_brief_review', 'brief_approved', 'awaiting_asset_review',
        'assets_approved', 'rejected'
      ));
  end if;
end $$;

create index if not exists idx_commerce_creative_jobs_status
  on public.commerce_creative_jobs(status, updated_at desc);

create index if not exists idx_commerce_creative_jobs_product
  on public.commerce_creative_jobs(product_id, created_at desc);

drop trigger if exists trg_commerce_creative_jobs_updated on public.commerce_creative_jobs;
create trigger trg_commerce_creative_jobs_updated before update on public.commerce_creative_jobs
for each row execute procedure public.touch_updated_at();

alter table public.commerce_creative_jobs enable row level security;

create table if not exists public.commerce_creative_approvals (
  id uuid primary key default uuid_generate_v4(),
  creative_job_id uuid not null references public.commerce_creative_jobs(id) on delete cascade,
  stage text not null,
  decision text not null,
  feedback text,
  status text not null default 'pending',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  applied_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(creative_job_id, stage)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'commerce_creative_approvals_stage_check'
  ) then
    alter table public.commerce_creative_approvals
      add constraint commerce_creative_approvals_stage_check
      check (stage in ('research', 'proposal', 'script', 'scene_plan', 'assets', 'edit', 'compose', 'publish'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commerce_creative_approvals_decision_check'
  ) then
    alter table public.commerce_creative_approvals
      add constraint commerce_creative_approvals_decision_check
      check (decision in ('approved', 'revision_requested'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commerce_creative_approvals_status_check'
  ) then
    alter table public.commerce_creative_approvals
      add constraint commerce_creative_approvals_status_check
      check (status in ('pending', 'applied', 'failed', 'superseded'));
  end if;
end $$;

create index if not exists idx_commerce_creative_approvals_pending
  on public.commerce_creative_approvals(status, decided_at asc)
  where status = 'pending';

drop trigger if exists trg_commerce_creative_approvals_updated on public.commerce_creative_approvals;
create trigger trg_commerce_creative_approvals_updated before update on public.commerce_creative_approvals
for each row execute procedure public.touch_updated_at();

alter table public.commerce_creative_approvals enable row level security;

-- ---------------------------------------------------------------------------
-- Product research evidence. Never overwrite product facts without sources.
-- ---------------------------------------------------------------------------
create table if not exists public.product_research_sources (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references shop.products(id) on delete cascade,
  source_url text not null,
  source_type text not null default 'web',
  source_title text,
  publisher text,
  extracted_data jsonb not null default '{}'::jsonb,
  confidence numeric(5,2) not null default 0,
  status text not null default 'active',
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, source_url)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_research_sources_confidence_check'
  ) then
    alter table public.product_research_sources
      add constraint product_research_sources_confidence_check
      check (confidence >= 0 and confidence <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'product_research_sources_status_check'
  ) then
    alter table public.product_research_sources
      add constraint product_research_sources_status_check
      check (status in ('active', 'stale', 'rejected'));
  end if;
end $$;

create index if not exists idx_product_research_sources_product
  on public.product_research_sources(product_id, checked_at desc);

drop trigger if exists trg_product_research_sources_updated on public.product_research_sources;
create trigger trg_product_research_sources_updated before update on public.product_research_sources
for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- TikTok Content Posting handoff. Uploads are drafts for user review by default.
-- ---------------------------------------------------------------------------
create table if not exists public.tiktok_content_uploads (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references shop.products(id) on delete cascade,
  creative_job_id uuid not null references public.commerce_creative_jobs(id) on delete cascade,
  publish_id text,
  render_path text not null,
  content_type text not null default 'video/mp4',
  file_size_bytes bigint,
  uploaded_bytes bigint not null default 0,
  status text not null default 'queued',
  status_payload jsonb not null default '{}'::jsonb,
  last_error text,
  initialized_at timestamptz,
  uploaded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(creative_job_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tiktok_content_uploads_status_check'
  ) then
    alter table public.tiktok_content_uploads
      add constraint tiktok_content_uploads_status_check
      check (status in (
        'queued', 'initializing', 'uploading', 'uploaded', 'processing',
        'ready_in_inbox', 'published', 'failed', 'cancelled'
      ));
  end if;
end $$;

create index if not exists idx_tiktok_content_uploads_status
  on public.tiktok_content_uploads(status, updated_at desc);

drop trigger if exists trg_tiktok_content_uploads_updated on public.tiktok_content_uploads;
create trigger trg_tiktok_content_uploads_updated before update on public.tiktok_content_uploads
for each row execute procedure public.touch_updated_at();

alter table public.tiktok_content_uploads enable row level security;

-- ---------------------------------------------------------------------------
-- Human-review engagement queue. This intentionally does not model fake likes.
-- ---------------------------------------------------------------------------
create table if not exists public.engagement_drafts (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references shop.products(id) on delete set null,
  channel text not null,
  interaction_type text not null,
  audience_ref text,
  source_url text,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  consent_basis text not null default 'public_context',
  idempotency_key text not null unique,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  scheduled_for timestamptz,
  sent_at timestamptz,
  external_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'engagement_drafts_interaction_check'
  ) then
    alter table public.engagement_drafts
      add constraint engagement_drafts_interaction_check
      check (interaction_type in ('post', 'comment_reply', 'creator_outreach', 'community_share'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'engagement_drafts_status_check'
  ) then
    alter table public.engagement_drafts
      add constraint engagement_drafts_status_check
      check (status in ('draft', 'approved', 'scheduled', 'sent', 'rejected', 'failed', 'opted_out'));
  end if;
end $$;

create index if not exists idx_engagement_drafts_review
  on public.engagement_drafts(channel, status, created_at desc);

create index if not exists idx_engagement_drafts_product
  on public.engagement_drafts(product_id, created_at desc);

drop trigger if exists trg_engagement_drafts_updated on public.engagement_drafts;
create trigger trg_engagement_drafts_updated before update on public.engagement_drafts
for each row execute procedure public.touch_updated_at();

alter table public.commerce_pipeline_runs enable row level security;
alter table public.commerce_pipeline_stage_runs enable row level security;
alter table public.product_research_sources enable row level security;
alter table public.engagement_drafts enable row level security;

comment on table public.engagement_drafts is
  'Review queue for compliant social posts/replies/outreach. Automated fake engagement and bulk unsolicited messaging are intentionally excluded.';
