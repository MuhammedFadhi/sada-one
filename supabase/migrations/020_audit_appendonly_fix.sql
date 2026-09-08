-- 020_audit_appendonly_fix.sql
-- Root cause: audit_logs has append-only RULES (no_update_audit / no_delete_audit)
-- that rewrite ANY update/delete on the table to a no-op — including the internal
-- update the FK's ON DELETE SET NULL action performs. So no FK action can ever
-- clear an audit reference, and deleting an employee or auth user always fails.
--
-- Fix: drop the two rules (audit_logs is still protected by RLS + its insert-only
-- policies), then make the FKs detach on delete so audit history is preserved but
-- never blocks deletion.

drop rule if exists no_update_audit on audit_logs;
drop rule if exists no_delete_audit on audit_logs;

do $$
declare c text;
begin
  -- employee_id -> employees : ON DELETE SET NULL
  select conname into c from pg_constraint
    where conrelid = 'public.audit_logs'::regclass and contype = 'f'
      and confrelid = 'public.employees'::regclass
    limit 1;
  if c is not null then execute format('alter table audit_logs drop constraint %I', c); end if;
  alter table audit_logs
    add constraint audit_logs_employee_id_fkey
    foreign key (employee_id) references employees(id) on delete set null;

  -- user_id -> auth.users : ON DELETE SET NULL
  select conname into c from pg_constraint
    where conrelid = 'public.audit_logs'::regclass and contype = 'f'
      and confrelid = 'auth.users'::regclass
    limit 1;
  if c is not null then execute format('alter table audit_logs drop constraint %I', c); end if;
  alter table audit_logs
    add constraint audit_logs_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;
end $$;
