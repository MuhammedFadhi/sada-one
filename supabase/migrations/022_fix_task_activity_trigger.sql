-- 022_fix_task_activity_trigger.sql
-- Bug: task_activity has RLS enabled with only a SELECT policy (no INSERT policy).
-- The task_status_activity() trigger (fired on every status/assignee change) was NOT
-- SECURITY DEFINER, so it ran as the calling user and its INSERT into task_activity was
-- denied by RLS -> the whole tasks UPDATE failed. Result: nobody could complete or
-- reassign a task from the app.
--
-- Fix: recreate the trigger function as SECURITY DEFINER so the audit insert runs with
-- owner privileges (bypasses RLS). Clients still cannot insert into task_activity
-- directly (no INSERT policy), so the audit trail stays trigger-only.

create or replace function task_status_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into task_activity(task_id, actor_id, action, old_value, new_value)
    values (new.id, new.assignee_id, 'status_changed', old.status::text, new.status::text);
    if new.status = 'done' then
      new.completed_at := now();
    end if;
  end if;
  if old.assignee_id is distinct from new.assignee_id then
    insert into task_activity(task_id, actor_id, action, old_value, new_value)
    values (new.id, new.reporter_id, 'assigned', old.assignee_id::text, new.assignee_id::text);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
