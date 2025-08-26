
-- 1) Audit tables

create table if not exists public.audit_change_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  org_id text,
  actor_user_id text,
  actor_role text,
  source text, -- e.g., 'app', 'edge-function', 'db-trigger'
  changed_fields text[] default array[]::text[],
  old_values jsonb,
  new_values jsonb,
  redactions text[] default array[]::text[],
  route text,
  request_ip text,
  request_id uuid default gen_random_uuid()
);

comment on table public.audit_change_logs is 'Append-only change audit logs with redaction for sensitive fields';

create table if not exists public.audit_access_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  table_name text not null,
  record_id uuid,
  action text not null default 'READ',
  org_id text,
  actor_user_id text,
  actor_role text,
  purpose text,
  route text,
  request_ip text,
  request_id uuid default gen_random_uuid()
);

comment on table public.audit_access_logs is 'Append-only access (read) audit logs';


-- 2) RLS: Enable and secure

alter table public.audit_change_logs enable row level security;
alter table public.audit_access_logs enable row level security;

-- Viewing logs:
-- - service_role can see all
-- - org admins can see their organization's logs

create policy if not exists "Service role can read change logs"
  on public.audit_change_logs
  for select
  using ((auth.jwt() ->> 'role') = 'service_role');

create policy if not exists "Org admins can read their change logs"
  on public.audit_change_logs
  for select
  using (
    (auth.jwt() ->> 'org_role') = 'org:admin'
    and org_id = (auth.jwt() ->> 'org_id')
  );

create policy if not exists "Service role can read access logs"
  on public.audit_access_logs
  for select
  using ((auth.jwt() ->> 'role') = 'service_role');

create policy if not exists "Org admins can read their access logs"
  on public.audit_access_logs
  for select
  using (
    (auth.jwt() ->> 'org_role') = 'org:admin'
    and org_id = (auth.jwt() ->> 'org_id')
  );

-- Inserting logs:
-- Allow inserts broadly so triggers and various contexts (anon/authenticated/service_role) can write logs reliably.
-- We do NOT create UPDATE/DELETE policies, making these tables append-only via API.

create policy if not exists "Anyone can insert change logs"
  on public.audit_change_logs
  for insert
  with check (true);

create policy if not exists "Anyone can insert access logs"
  on public.audit_access_logs
  for insert
  with check (true);


-- 3) Helpful indexes for reporting

create index if not exists idx_audit_change_logs_org_created
  on public.audit_change_logs (org_id, created_at desc);

create index if not exists idx_audit_change_logs_table_record
  on public.audit_change_logs (table_name, record_id);

create index if not exists idx_audit_access_logs_org_created
  on public.audit_access_logs (org_id, created_at desc);

create index if not exists idx_audit_access_logs_table_record
  on public.audit_access_logs (table_name, record_id);


-- 4) Trigger function to log changes on anamnes_entries
-- Redacts large/sensitive fields like answers, formatted_raw_data, ai_summary.
-- Captures a whitelist of safe fields and the set of changed field names.

create or replace function public.log_anamnes_entries_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_action text := tg_op;
  v_table text := tg_table_name;
  v_org text;
  v_actor_user text := coalesce(auth.jwt() ->> 'sub', null);
  v_actor_role text := coalesce(auth.jwt() ->> 'role', null);
  v_route text := nullif(current_setting('request.path', true), '');
  v_ip text := nullif(current_setting('request.headers', true), '')::text;
  v_record uuid;
  changed text[] := array[]::text[];
  safe_old jsonb := '{}'::jsonb;
  safe_new jsonb := '{}'::jsonb;
  redactions text[] := array[]::text[];
begin
  -- Determine org_id and record_id based on operation
  if v_action = 'DELETE' then
    v_org := coalesce(old.organization_id, coalesce(auth.jwt() ->> 'org_id', null));
    v_record := old.id;
  else
    v_org := coalesce(new.organization_id, coalesce(auth.jwt() ->> 'org_id', null));
    v_record := new.id;
  end if;

  -- Compute changed fields for UPDATE
  if v_action = 'UPDATE' then
    if new.status is distinct from old.status then changed := array_append(changed, 'status'); end if;
    if new.patient_identifier is distinct from old.patient_identifier then changed := array_append(changed, 'patient_identifier'); end if;
    if new.store_id is distinct from old.store_id then changed := array_append(changed, 'store_id'); end if;
    if new.optician_id is distinct from old.optician_id then changed := array_append(changed, 'optician_id'); end if;
    if new.booking_date is distinct from old.booking_date then changed := array_append(changed, 'booking_date'); end if;
    if new.internal_notes is distinct from old.internal_notes then changed := array_append(changed, 'internal_notes'); end if;
    if new.first_name is distinct from old.first_name then changed := array_append(changed, 'first_name'); end if;
    if new.booking_id is distinct from old.booking_id then changed := array_append(changed, 'booking_id'); end if;
    if new.is_magic_link is distinct from old.is_magic_link then changed := array_append(changed, 'is_magic_link'); end if;
    if new.ai_summary is distinct from old.ai_summary then redactions := array_append(redactions, 'ai_summary'); end if;
    if new.formatted_raw_data is distinct from old.formatted_raw_data then redactions := array_append(redactions, 'formatted_raw_data'); end if;
    if new.answers is distinct from old.answers then redactions := array_append(redactions, 'answers'); end if;
  elsif v_action = 'INSERT' then
    -- On insert, mark presence of sensitive fields as redacted if present
    if new.ai_summary is not null then redactions := array_append(redactions, 'ai_summary'); end if;
    if new.formatted_raw_data is not null then redactions := array_append(redactions, 'formatted_raw_data'); end if;
    if new.answers is not null then redactions := array_append(redactions, 'answers'); end if;
  elsif v_action = 'DELETE' then
    if old.ai_summary is not null then redactions := array_append(redactions, 'ai_summary'); end if;
    if old.formatted_raw_data is not null then redactions := array_append(redactions, 'formatted_raw_data'); end if;
    if old.answers is not null then redactions := array_append(redactions, 'answers'); end if;
  end if;

  -- Build safe_old/safe_new with whitelisted fields only
  if v_action in ('UPDATE','DELETE') then
    safe_old := jsonb_build_object(
      'status', old.status,
      'patient_identifier', old.patient_identifier,
      'store_id', old.store_id,
      'optician_id', old.optician_id,
      'booking_date', old.booking_date,
      'internal_notes', old.internal_notes,
      'first_name', old.first_name,
      'booking_id', old.booking_id,
      'is_magic_link', old.is_magic_link
    );
  end if;

  if v_action in ('UPDATE','INSERT') then
    safe_new := jsonb_build_object(
      'status', new.status,
      'patient_identifier', new.patient_identifier,
      'store_id', new.store_id,
      'optician_id', new.optician_id,
      'booking_date', new.booking_date,
      'internal_notes', new.internal_notes,
      'first_name', new.first_name,
      'booking_id', new.booking_id,
      'is_magic_link', new.is_magic_link
    );
  end if;

  insert into public.audit_change_logs (
    table_name, record_id, action, org_id, actor_user_id, actor_role, source,
    changed_fields, old_values, new_values, redactions, route, request_ip
  )
  values (
    tg_table_name, v_record, v_action, v_org, v_actor_user, v_actor_role, 'db-trigger',
    changed, case when v_action in ('UPDATE','DELETE') then safe_old else null end,
           case when v_action in ('UPDATE','INSERT') then safe_new else null end,
    redactions, v_route, v_ip
  );

  if v_action = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

-- 5) Attach triggers to anamnes_entries

drop trigger if exists trg_log_anamnes_insert on public.anamnes_entries;
drop trigger if exists trg_log_anamnes_update on public.anamnes_entries;
drop trigger if exists trg_log_anamnes_delete on public.anamnes_entries;

create trigger trg_log_anamnes_insert
after insert on public.anamnes_entries
for each row
execute function public.log_anamnes_entries_change();

create trigger trg_log_anamnes_update
after update on public.anamnes_entries
for each row
execute function public.log_anamnes_entries_change();

create trigger trg_log_anamnes_delete
after delete on public.anamnes_entries
for each row
execute function public.log_anamnes_entries_change();


-- 6) RPC to log access from the app

create or replace function public.log_access(
  p_table_name text,
  p_record_id uuid,
  p_purpose text default null,
  p_route text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor_user text := coalesce(auth.jwt() ->> 'sub', null);
  v_actor_role text := coalesce(auth.jwt() ->> 'role', null);
  v_org text := coalesce(auth.jwt() ->> 'org_id', null);
  v_ip text := nullif(current_setting('request.headers', true), '');
begin
  insert into public.audit_access_logs (
    table_name, record_id, action, org_id, actor_user_id, actor_role, purpose, route, request_ip
  )
  values (
    p_table_name, p_record_id, 'READ', v_org, v_actor_user, v_actor_role, p_purpose, p_route, v_ip
  );
end;
$$;

-- Optional: sanity grants (PostgREST role-level default privileges are usually fine; RLS will enforce access)
-- We intentionally do not create UPDATE/DELETE policies to keep tables append-only via API.
