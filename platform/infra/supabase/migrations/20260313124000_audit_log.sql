create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  request_id text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_supplier_created
  on public.audit_log(supplier_id, created_at desc);

create index if not exists idx_audit_log_entity_created
  on public.audit_log(entity_type, entity_id, created_at desc);

create index if not exists idx_audit_log_action_created
  on public.audit_log(action, created_at desc);
