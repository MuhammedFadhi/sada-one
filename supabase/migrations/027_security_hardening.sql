-- 027_security_hardening.sql
-- Consolidated hardening. DEPLOY THE APP CODE FIRST, THEN run this (the app stops
-- writing PII columns to `employees` before this drops them). Idempotent where possible.

begin;

-- =====================================================================================
-- 1) AUDIT LOGS — stop users injecting fake audit rows.
--    audit_trigger_func() writes audit_logs on every audited change. Make it run as
--    SECURITY DEFINER (bypasses RLS) and drop the blanket authenticated INSERT policy.
--    Triggers and the service role keep writing; direct client inserts are denied.
--    (The app only READS audit_logs.)
-- =====================================================================================
alter function audit_trigger_func() security definer;
alter function audit_trigger_func() set search_path = public;
drop policy if exists audit_insert on audit_logs;   -- was: WITH CHECK (true)
-- audit_select / audit_no_update / audit_no_delete remain.

-- =====================================================================================
-- 2) INVITE TOKENS — validate/consume via SECURITY DEFINER RPCs so the table can be
--    locked (no direct client read) while anonymous invitees can still use their link.
-- =====================================================================================
create or replace function validate_invite_token(p_token text)
returns table(full_name_en text, job_title_en text, work_email text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select e.full_name_en, e.job_title_en, e.work_email
  from invite_tokens t
  join employees e on e.id = t.employee_id
  where t.token = p_token
    and t.used_at is null
    and t.expires_at > now();
end;
$$;

create or replace function consume_invite_token(p_token text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update invite_tokens set used_at = now()
  where token = p_token and used_at is null and expires_at > now();
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke all on function validate_invite_token(text) from public;
revoke all on function consume_invite_token(text)  from public;
grant execute on function validate_invite_token(text) to anon, authenticated;
grant execute on function consume_invite_token(text)  to anon, authenticated;

-- lock the table itself (RPCs above are definer and bypass this)
alter table invite_tokens enable row level security;
drop policy if exists open_read  on invite_tokens;
drop policy if exists open_write on invite_tokens;

-- =====================================================================================
-- 3) EMPLOYEE PII — move identifying fields out of the broadly-readable employees table
--    (the app does select('*') on employees everywhere) into a locked side table.
--    Only the employee themselves + HR/admin can read/write it.
-- =====================================================================================
create table if not exists employee_private (
  employee_id       uuid primary key references employees(id) on delete cascade,
  national_id       text,
  iqama_number      text,
  passport_number   text,
  emergency_contact jsonb default '{}',
  updated_at        timestamptz default now()
);

alter table employee_private enable row level security;

drop policy if exists emppriv_select on employee_private;
drop policy if exists emppriv_insert on employee_private;
drop policy if exists emppriv_update on employee_private;
create policy emppriv_select on employee_private for select to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin'));
create policy emppriv_insert on employee_private for insert to authenticated
  with check (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin'));
create policy emppriv_update on employee_private for update to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin'))
  with check (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin'));

-- carry over any existing values (safe if columns already gone / all null)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='employees' and column_name='iqama_number') then
    insert into employee_private (employee_id, national_id, iqama_number, passport_number, emergency_contact)
    select id, national_id, iqama_number, passport_number, emergency_contact
    from employees
    where national_id is not null or iqama_number is not null or passport_number is not null
       or (emergency_contact is not null and emergency_contact <> '{}'::jsonb)
    on conflict (employee_id) do nothing;
  end if;
end $$;

-- drop the identifying PII columns from employees (kept: date_of_birth, iqama_expiry, passport_expiry)
alter table employees drop column if exists national_id;
alter table employees drop column if exists iqama_number;
alter table employees drop column if exists passport_number;
alter table employees drop column if exists emergency_contact;

commit;

-- =====================================================================================
-- 4) TASKS REALTIME — add tasks to the realtime publication so task boards update
--    across clients instantly (mirrors chat). No-op if already present.
-- =====================================================================================
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; when others then null;
end $$;

-- VERIFICATION
select 'employee_private rls' as check,
       (select relrowsecurity from pg_class where relname='employee_private') as ok
union all
select 'pii cols removed from employees',
       not exists (select 1 from information_schema.columns
                   where table_name='employees' and column_name in
                   ('national_id','iqama_number','passport_number','emergency_contact'));
