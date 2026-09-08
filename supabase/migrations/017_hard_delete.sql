-- 017_hard_delete.sql
-- Full hard-delete of an employee and all their data.
-- Catalog-driven: for every FK column that references employees(id),
--   NOT NULL column  -> delete those rows (data the employee owns / is a required party to)
--   NULLABLE column   -> set NULL (detach them as approver/manager/actor, keep others' records)
-- Then delete the employee row itself. The caller (edge function) deletes the auth user.
-- SECURITY DEFINER so it runs with owner privileges (bypasses RLS). Not granted to clients.

create or replace function admin_hard_delete_employee(p_emp uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Detach self-reference first (reports pointing at this manager)
  update employees set manager_id = null where manager_id = p_emp;

  for r in
    select c.conrelid::regclass::text as tbl,
           a.attname                  as col,
           a.attnotnull               as notnull
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.confrelid = 'public.employees'::regclass
      and c.conrelid <> 'public.employees'::regclass   -- self-ref handled above
    order by a.attnotnull desc                          -- delete owned rows before nulling
  loop
    if r.notnull then
      execute format('delete from %s where %I = $1', r.tbl, r.col) using p_emp;
    else
      execute format('update %s set %I = null where %I = $1', r.tbl, r.col, r.col) using p_emp;
    end if;
  end loop;

  delete from user_profiles where employee_id = p_emp;  -- safety (also cascades from auth delete)
  delete from employees      where id = p_emp;
end;
$$;

revoke all on function admin_hard_delete_employee(uuid) from public, anon, authenticated;
grant execute on function admin_hard_delete_employee(uuid) to service_role;
