-- 025_rls_consolidated.sql
-- Self-contained + self-verifying. Safe to run repeatedly (idempotent).
-- Fixes: RLS was NOT actually enforced on these tables in the live DB, so the
-- policies added in 023 were dormant and the tables were world-read/writable.
-- This one script enables RLS, (re)creates the scoped policies, and prints the
-- final state so you can confirm it took effect. Run the WHOLE thing; the last
-- SELECT should show rls_enabled = true for every row.

begin;

-- ── enable RLS (schema-qualified to avoid any search_path ambiguity) ──────────
alter table public.onboarding_checklists  enable row level security;
alter table public.offboarding_checklists enable row level security;
alter table public.performance_goals      enable row level security;
alter table public.loan_repayments        enable row level security;
alter table public.recognition_points     enable row level security;
alter table public.overtime_requests      enable row level security;
alter table public.asset_history          enable row level security;
alter table public.ticket_comments        enable row level security;

-- ── onboarding_checklists policies ────────────────────────────────────────────
drop policy if exists onboarding_select on public.onboarding_checklists;
drop policy if exists onboarding_insert on public.onboarding_checklists;
drop policy if exists onboarding_update on public.onboarding_checklists;
create policy onboarding_select on public.onboarding_checklists for select to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));
create policy onboarding_insert on public.onboarding_checklists for insert to authenticated
  with check (current_user_role() in ('hr_officer','admin'));
create policy onboarding_update on public.onboarding_checklists for update to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'))
  with check (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));

-- ── offboarding_checklists policies ───────────────────────────────────────────
drop policy if exists offboarding_select on public.offboarding_checklists;
drop policy if exists offboarding_insert on public.offboarding_checklists;
drop policy if exists offboarding_update on public.offboarding_checklists;
create policy offboarding_select on public.offboarding_checklists for select to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));
create policy offboarding_insert on public.offboarding_checklists for insert to authenticated
  with check (current_user_role() in ('hr_officer','admin'));
create policy offboarding_update on public.offboarding_checklists for update to authenticated
  using (current_user_role() in ('hr_officer','admin','manager'))
  with check (current_user_role() in ('hr_officer','admin','manager'));

-- ── performance_goals policies ────────────────────────────────────────────────
drop policy if exists perfgoals_select on public.performance_goals;
drop policy if exists perfgoals_insert on public.performance_goals;
drop policy if exists perfgoals_update on public.performance_goals;
create policy perfgoals_select on public.performance_goals for select to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));
create policy perfgoals_insert on public.performance_goals for insert to authenticated
  with check (current_user_role() in ('hr_officer','admin','manager'));
create policy perfgoals_update on public.performance_goals for update to authenticated
  using (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'))
  with check (employee_id = current_employee_id() or current_user_role() in ('hr_officer','admin','manager'));

commit;

-- ── VERIFICATION — this result grid should show rls_enabled = true for all 8 ──
select c.relname            as table_name,
       c.relrowsecurity     as rls_enabled,
       count(p.policyname)  as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where c.relname in ('onboarding_checklists','offboarding_checklists','performance_goals',
                    'loan_repayments','recognition_points','overtime_requests',
                    'asset_history','ticket_comments')
group by c.relname, c.relrowsecurity
order by c.relname;
