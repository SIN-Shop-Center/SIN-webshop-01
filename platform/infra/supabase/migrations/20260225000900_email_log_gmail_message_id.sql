alter table public.email_log
  add column if not exists gmail_message_id text;

update public.email_log
set gmail_message_id = provider_message_id
where gmail_message_id is null
  and provider_message_id is not null;
