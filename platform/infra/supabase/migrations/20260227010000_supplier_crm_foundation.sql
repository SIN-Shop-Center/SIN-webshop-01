-- Supplier CRM/CSM foundation + onboarding automation

alter table public.suppliers
  add column if not exists onboarding_status text not null default 'new',
  add column if not exists registration_url text,
  add column if not exists portal_url text,
  add column if not exists compliance_state text not null default 'unchecked',
  add column if not exists last_onboarding_run_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'suppliers_onboarding_status_check'
  ) then
    alter table public.suppliers
      add constraint suppliers_onboarding_status_check
      check (onboarding_status in ('new', 'shortlisted', 'applied', 'awaiting_access', 'connected', 'rejected'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'suppliers_compliance_state_check'
  ) then
    alter table public.suppliers
      add constraint suppliers_compliance_state_check
      check (compliance_state in ('unchecked', 'pending', 'approved', 'blocked', 'rejected'));
  end if;
end $$;

create table if not exists public.supplier_credentials_refs (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  provider text not null default 'supplier_portal',
  secret_ref text not null,
  username text,
  metadata jsonb not null default '{}'::jsonb,
  last_rotated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, provider)
);

create index if not exists idx_supplier_credentials_refs_supplier
  on public.supplier_credentials_refs(supplier_id, provider, updated_at desc);

drop trigger if exists trg_supplier_credentials_refs_updated on public.supplier_credentials_refs;
create trigger trg_supplier_credentials_refs_updated before update on public.supplier_credentials_refs
for each row execute procedure public.touch_updated_at();

create table if not exists public.supplier_onboarding_runs (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  status text not null default 'queued',
  execution_mode text not null default 'hybrid',
  skill_id text,
  dry_run boolean not null default false,
  started_at timestamptz,
  finished_at timestamptz,
  requested_by uuid references auth.users(id) on delete set null,
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  last_error text,
  lock_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'supplier_onboarding_runs_status_check'
  ) then
    alter table public.supplier_onboarding_runs
      add constraint supplier_onboarding_runs_status_check
      check (status in ('queued', 'running', 'awaiting_human', 'succeeded', 'failed', 'cancelled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'supplier_onboarding_runs_execution_mode_check'
  ) then
    alter table public.supplier_onboarding_runs
      add constraint supplier_onboarding_runs_execution_mode_check
      check (execution_mode in ('api', 'browser', 'hybrid'));
  end if;
end $$;

create index if not exists idx_supplier_onboarding_runs_supplier_status
  on public.supplier_onboarding_runs(supplier_id, status, created_at desc);

create index if not exists idx_supplier_onboarding_runs_lock
  on public.supplier_onboarding_runs(supplier_id, status, updated_at desc)
  where status in ('queued', 'running');

create unique index if not exists uq_supplier_onboarding_runs_active_supplier
  on public.supplier_onboarding_runs(supplier_id)
  where status in ('queued', 'running', 'awaiting_human');

drop trigger if exists trg_supplier_onboarding_runs_updated on public.supplier_onboarding_runs;
create trigger trg_supplier_onboarding_runs_updated before update on public.supplier_onboarding_runs
for each row execute procedure public.touch_updated_at();

create table if not exists public.supplier_onboarding_steps (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references public.supplier_onboarding_runs(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  step_order integer not null default 0,
  step_type text not null,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  artifact_urls text[] not null default '{}'::text[],
  redacted_log text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, step_order)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'supplier_onboarding_steps_status_check'
  ) then
    alter table public.supplier_onboarding_steps
      add constraint supplier_onboarding_steps_status_check
      check (status in ('queued', 'running', 'awaiting_human', 'succeeded', 'failed', 'cancelled'));
  end if;
end $$;

create index if not exists idx_supplier_onboarding_steps_run
  on public.supplier_onboarding_steps(run_id, step_order asc);

create index if not exists idx_supplier_onboarding_steps_supplier
  on public.supplier_onboarding_steps(supplier_id, created_at desc);

drop trigger if exists trg_supplier_onboarding_steps_updated on public.supplier_onboarding_steps;
create trigger trg_supplier_onboarding_steps_updated before update on public.supplier_onboarding_steps
for each row execute procedure public.touch_updated_at();

create table if not exists public.supplier_activity_log (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  run_id uuid references public.supplier_onboarding_runs(id) on delete set null,
  activity_type text not null,
  severity text not null default 'info',
  actor_type text not null default 'system',
  actor_id uuid references auth.users(id) on delete set null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'supplier_activity_log_severity_check'
  ) then
    alter table public.supplier_activity_log
      add constraint supplier_activity_log_severity_check
      check (severity in ('info', 'warning', 'error', 'critical'));
  end if;
end $$;

create index if not exists idx_supplier_activity_log_supplier
  on public.supplier_activity_log(supplier_id, created_at desc);

create index if not exists idx_supplier_activity_log_run
  on public.supplier_activity_log(run_id, created_at desc)
  where run_id is not null;

-- Mini CRM / CSM schema
create table if not exists public.crm_tasks (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id text not null,
  title text not null,
  description text,
  status text not null default 'open',
  priority text not null default 'medium',
  owner_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_tasks_entity_type_check'
  ) then
    alter table public.crm_tasks
      add constraint crm_tasks_entity_type_check
      check (entity_type in ('supplier', 'customer', 'ticket', 'order'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_tasks_status_check'
  ) then
    alter table public.crm_tasks
      add constraint crm_tasks_status_check
      check (status in ('open', 'in_progress', 'blocked', 'done', 'cancelled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_tasks_priority_check'
  ) then
    alter table public.crm_tasks
      add constraint crm_tasks_priority_check
      check (priority in ('low', 'medium', 'high', 'urgent'));
  end if;
end $$;

create index if not exists idx_crm_tasks_entity
  on public.crm_tasks(entity_type, entity_id, status, priority, updated_at desc);

create index if not exists idx_crm_tasks_owner
  on public.crm_tasks(owner_id, status, due_at asc)
  where owner_id is not null;

drop trigger if exists trg_crm_tasks_updated on public.crm_tasks;
create trigger trg_crm_tasks_updated before update on public.crm_tasks
for each row execute procedure public.touch_updated_at();

create table if not exists public.crm_activities (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id text not null,
  activity_type text not null,
  severity text not null default 'info',
  actor_type text not null default 'system',
  actor_id uuid references auth.users(id) on delete set null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_activities_entity_type_check'
  ) then
    alter table public.crm_activities
      add constraint crm_activities_entity_type_check
      check (entity_type in ('supplier', 'customer', 'ticket', 'order'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_activities_severity_check'
  ) then
    alter table public.crm_activities
      add constraint crm_activities_severity_check
      check (severity in ('info', 'warning', 'error', 'critical'));
  end if;
end $$;

create index if not exists idx_crm_activities_entity
  on public.crm_activities(entity_type, entity_id, created_at desc);

create table if not exists public.crm_notes (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id text not null,
  note text not null,
  visibility text not null default 'internal',
  author_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_notes_entity_type_check'
  ) then
    alter table public.crm_notes
      add constraint crm_notes_entity_type_check
      check (entity_type in ('supplier', 'customer', 'ticket', 'order'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_notes_visibility_check'
  ) then
    alter table public.crm_notes
      add constraint crm_notes_visibility_check
      check (visibility in ('internal', 'shared'));
  end if;
end $$;

create index if not exists idx_crm_notes_entity
  on public.crm_notes(entity_type, entity_id, created_at desc);

drop trigger if exists trg_crm_notes_updated on public.crm_notes;
create trigger trg_crm_notes_updated before update on public.crm_notes
for each row execute procedure public.touch_updated_at();

create table if not exists public.crm_entity_tags (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id text not null,
  tag text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, tag)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_entity_tags_entity_type_check'
  ) then
    alter table public.crm_entity_tags
      add constraint crm_entity_tags_entity_type_check
      check (entity_type in ('supplier', 'customer', 'ticket', 'order'));
  end if;
end $$;

create index if not exists idx_crm_entity_tags_lookup
  on public.crm_entity_tags(entity_type, entity_id, tag);

-- link suppliers.last_onboarding_run_id after onboarding table exists
alter table public.suppliers
  drop constraint if exists suppliers_last_onboarding_run_fk;

alter table public.suppliers
  add constraint suppliers_last_onboarding_run_fk
  foreign key (last_onboarding_run_id)
  references public.supplier_onboarding_runs(id)
  on delete set null;

alter table public.product_suppliers
  add column if not exists supplier_sku text,
  add column if not exists cost_price numeric(10,2),
  add column if not exists lead_time_days integer;

-- Secret reference integration via Supabase Vault (with safe fallback when vault is unavailable)
create or replace function public.set_supplier_secret_ref(
  p_supplier_id uuid,
  p_provider text,
  p_secret_value text,
  p_username text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_provider text := coalesce(nullif(trim(p_provider), ''), 'supplier_portal');
  v_ref text;
  v_vault_available boolean := false;
begin
  if p_supplier_id is null then
    raise exception 'supplier_id_required';
  end if;
  if coalesce(length(trim(p_secret_value)), 0) = 0 then
    raise exception 'secret_value_required';
  end if;

  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'vault'
      and p.proname = 'create_secret'
  ) into v_vault_available;

  if v_vault_available then
    execute $sql$
      select vault.create_secret($1, $2, $3)::text
    $sql$ into v_ref
    using p_secret_value,
          concat('supplier:', p_supplier_id::text, ':', v_provider),
          'Supplier credential';
  else
    v_ref := concat('local://', encode(digest(p_secret_value, 'sha256'), 'hex'));
  end if;

  insert into public.supplier_credentials_refs (
    supplier_id, provider, secret_ref, username, metadata, created_by, last_rotated_at
  )
  values (
    p_supplier_id, v_provider, v_ref, nullif(trim(p_username), ''), coalesce(p_metadata, '{}'::jsonb), p_created_by, now()
  )
  on conflict (supplier_id, provider) do update
  set secret_ref = excluded.secret_ref,
      username = excluded.username,
      metadata = coalesce(public.supplier_credentials_refs.metadata, '{}'::jsonb) || excluded.metadata,
      last_rotated_at = now(),
      updated_at = now();

  update public.suppliers
  set api_secret_ref = v_ref,
      updated_at = now()
  where id = p_supplier_id;

  return v_ref;
end;
$func$;

create or replace function public.resolve_supplier_secret_ref(
  p_secret_ref text
)
returns text
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_ref text := nullif(trim(p_secret_ref), '');
  v_secret text;
  v_table_available boolean := false;
begin
  if v_ref is null then
    return null;
  end if;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'vault'
      and table_name = 'decrypted_secrets'
  ) into v_table_available;

  if v_table_available then
    begin
      execute $sql$
        select decrypted_secret
        from vault.decrypted_secrets
        where id::text = $1 or name = $1
        limit 1
      $sql$ into v_secret
      using v_ref;
    exception
      when undefined_column then
        begin
          execute $sql$
            select secret
            from vault.decrypted_secrets
            where id::text = $1 or name = $1
            limit 1
          $sql$ into v_secret
          using v_ref;
        exception
          when undefined_column then
            v_secret := null;
        end;
    end;
  end if;

  return v_secret;
end;
$func$;
