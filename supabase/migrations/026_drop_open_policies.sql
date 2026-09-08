-- 026_drop_open_policies.sql
-- ROOT CAUSE of the "RLS not enforcing" symptom: eight tables carried two blanket
-- PERMISSIVE policies (created during development, NOT in the repo migrations):
--     open_read   FOR SELECT USING (true)
--     open_write  FOR ALL    USING (true)
-- PostgreSQL OR's permissive policies, so these granted every authenticated user
-- full read/write regardless of the scoped policies. RLS itself was already ON
-- (verified), so the fix is simply to drop the two rogue policies. After this:
--   • onboarding_checklists / offboarding_checklists / performance_goals -> governed
--     by the scoped policies from 025 (employee sees own; HR/admin/manager manage).
--   • suggestions -> governed by its existing own+admin policies.
--   • loan_repayments / overtime_requests / ticket_comments / task_watchers -> no
--     client policies remain, so they are locked to service-role/trigger access only
--     (none are queried client-side; triggers and the service role bypass RLS).
--
-- Self-verifying: the final SELECT must return ZERO rows.

begin;
do $$
declare
  t text;
  tables text[] := array[
    'onboarding_checklists','offboarding_checklists','performance_goals',
    'suggestions','loan_repayments','overtime_requests','ticket_comments','task_watchers'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists open_read  on public.%I', t);
    execute format('drop policy if exists open_write on public.%I', t);
    -- make sure RLS is actually on (idempotent)
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
commit;

-- VERIFICATION — expect NO rows. Any row here means a rogue open policy survived.
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and policyname in ('open_read','open_write')
  and tablename in ('onboarding_checklists','offboarding_checklists','performance_goals',
                    'suggestions','loan_repayments','overtime_requests','ticket_comments','task_watchers');
