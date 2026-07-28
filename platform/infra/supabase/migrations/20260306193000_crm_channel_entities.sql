alter table public.crm_tasks
  drop constraint if exists crm_tasks_entity_type_check;

alter table public.crm_tasks
  add constraint crm_tasks_entity_type_check
  check (entity_type in ('supplier', 'customer', 'ticket', 'order', 'channel'));

alter table public.crm_activities
  drop constraint if exists crm_activities_entity_type_check;

alter table public.crm_activities
  add constraint crm_activities_entity_type_check
  check (entity_type in ('supplier', 'customer', 'ticket', 'order', 'channel'));

alter table public.crm_notes
  drop constraint if exists crm_notes_entity_type_check;

alter table public.crm_notes
  add constraint crm_notes_entity_type_check
  check (entity_type in ('supplier', 'customer', 'ticket', 'order', 'channel'));

alter table public.crm_entity_tags
  drop constraint if exists crm_entity_tags_entity_type_check;

alter table public.crm_entity_tags
  add constraint crm_entity_tags_entity_type_check
  check (entity_type in ('supplier', 'customer', 'ticket', 'order', 'channel'));
