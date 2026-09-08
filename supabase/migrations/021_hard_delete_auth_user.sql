-- 021_hard_delete_auth_user.sql
-- Extend admin_hard_delete_employee to also delete the linked auth.users row,
-- via SQL (owner privileges) instead of GoTrue's admin API, which was returning
-- an empty error and leaving the login active. All auth.users FKs are CASCADE or
-- SET NULL, so this deletes cleanly and takes the user_profiles row + sessions with it.

create or replace function admin_hard_delete_employee(p_emp uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_uid uuid;
begin
  -- capture the linked auth user BEFORE the teardown removes user_profiles
  select id into v_uid from user_profiles where employee_id = p_emp limit 1;

  -- detach self-reference first (reports pointing at this manager)
  update employees set manager_id = null where manager_id = p_emp;

  -- catalog-driven teardown of every FK column that references employees(id)
  for r in
    select c.conrelid::regclass::text as tbl,
           a.attname                  as col,
           a.attnotnull               as notnull
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.confrelid = 'public.employees'::regclass
      and c.conrelid <> 'public.employees'::regclass
    order by a.attnotnull desc
  loop
    if r.notnull then
      execute format('delete from %s where %I = $1', r.tbl, r.col) using p_emp;
    else
      execute format('update %s set %I = null where %I = $1', r.tbl, r.col, r.col) using p_emp;
    end if;
  end loop;

  delete from user_profiles where employee_id = p_emp;
  delete from employees      where id = p_emp;

  -- remove the auth login (cascades any remaining profile row + sessions)
  if v_uid is not null then
    delete from auth.users where id = v_uid;
  end if;
end;
$$;

revoke all on function admin_hard_delete_employee(uuid) from public, anon, authenticated;
grant execute on function admin_hard_delete_employee(uuid) to service_role;
