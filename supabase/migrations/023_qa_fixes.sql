-- 023_qa_fixes.sql
-- Findings from full front-to-back QA pass.
--
-- ── FIX 1 (LIVE BUG) ──────────────────────────────────────────────────────────
-- update_channel_last_message() fires AFTER INSERT on chat_messages and updates
-- chat_channels.last_message / last_message_at. It was NOT SECURITY DEFINER, and
-- channels_update only allows the channel CREATOR (or admin) to update the row.
-- Result: when a NON-creator sends a message, that UPDATE is RLS-filtered to 0 rows
-- (no error) — so the channel's last-message preview and sort/unread timestamp go
-- stale for the majority of messages (in any DM only one side is the creator).
-- Fix: run the trigger as SECURITY DEFINER so it always updates the channel,
-- regardless of who sent the message. Clients still can't update chat_channels
-- directly (channels_update is unchanged).
create or replace function update_channel_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update chat_channels set
    last_message_at = new.created_at,
    last_message    = case when new.type = 'text' then left(new.content, 100) else '📎 File' end
  where id = new.channel_id;
  return new;
end;
$$;

-- ── FIX 2 (reachable features were RLS-locked → empty shells) ─────────────────
-- onboarding_checklists, offboarding_checklists and performance_goals have RLS
-- enabled but ZERO policies, so every client read returns [] and every write is
-- denied. onboarding is in the HR nav and offboarding/performance are routed, so
-- these render but can never load or save. Add sensible policies:
--   • employees can see their own rows
--   • HR / admin / managers can see and manage all
-- (No DELETE policy — matches the rest of the app; teardown is service-role only.)

-- onboarding_checklists
drop policy if exists onboarding_select on onboarding_checklists;
drop policy if exists onboarding_insert on onboarding_checklists;
drop policy if exists onboarding_update on onboarding_checklists;
create policy onboarding_select on onboarding_checklists for select to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));
create policy onboarding_insert on onboarding_checklists for insert to authenticated
  with check (current_user_role() in ('hr_officer','admin'));
create policy onboarding_update on onboarding_checklists for update to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'))
  with check (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));

-- offboarding_checklists
drop policy if exists offboarding_select on offboarding_checklists;
drop policy if exists offboarding_insert on offboarding_checklists;
drop policy if exists offboarding_update on offboarding_checklists;
create policy offboarding_select on offboarding_checklists for select to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));
create policy offboarding_insert on offboarding_checklists for insert to authenticated
  with check (current_user_role() in ('hr_officer','admin'));
create policy offboarding_update on offboarding_checklists for update to authenticated
  using (current_user_role() in ('hr_officer','admin','manager'))
  with check (current_user_role() in ('hr_officer','admin','manager'));

-- performance_goals
drop policy if exists perfgoals_select on performance_goals;
drop policy if exists perfgoals_insert on performance_goals;
drop policy if exists perfgoals_update on performance_goals;
create policy perfgoals_select on performance_goals for select to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));
create policy perfgoals_insert on performance_goals for insert to authenticated
  with check (current_user_role() in ('hr_officer','admin','manager'));
create policy perfgoals_update on performance_goals for update to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'))
  with check (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));
