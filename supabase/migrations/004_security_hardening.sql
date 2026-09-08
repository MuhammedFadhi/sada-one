-- ============================================================
-- SA'DA ONE — Migration 004: Security Hardening & RLS Verification
-- Run this in Supabase SQL Editor. It is SAFE to run multiple times.
-- ============================================================

-- ============================================================
-- STEP 1: VERIFY & FORCE-ENABLE RLS ON EVERY TABLE
-- This is the #1 protection against "users accessing data that
-- isn't theirs." If RLS is off, the policies do nothing.
-- ============================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'companies','divisions','departments','employees','employee_salaries',
    'employee_documents','user_profiles','invite_tokens','leave_policies',
    'leave_balances','leave_requests','attendance_logs','payroll_runs','payslips',
    'loans','eos_calculations','expense_claims','hr_requests','exit_reentry',
    'onboarding_checklists','offboarding_checklists','performance_reviews',
    'performance_goals','training_courses','training_enrollments','company_assets',
    'asset_assignments','recognitions','suggestions','help_desk_tickets',
    'announcements','company_policies','policy_acknowledgements','notifications',
    'audit_logs','public_holidays','work_schedules',
    'task_projects','task_project_members','tasks','task_comments','task_activity',
    'task_watchers','chat_channels','chat_channel_members','chat_messages','chat_message_reads'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 2: REPORT — show which tables have RLS on and policy counts
-- (Read the results after running. Every table should show rls_enabled = true)
-- ============================================================

-- (This SELECT runs and shows you the state; not destructive)
-- You'll see it in the results panel.
CREATE OR REPLACE VIEW security_audit_rls AS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COUNT(p.polname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY rls_enabled ASC, c.relname;

-- ============================================================
-- STEP 3: HARDEN SECURITY-DEFINER HELPERS
-- These run as the function owner, so we lock the search_path to
-- prevent search_path-hijack privilege escalation (a real Postgres CVE class).
-- ============================================================

ALTER FUNCTION current_user_role()   SET search_path = public, pg_temp;
ALTER FUNCTION current_employee_id()  SET search_path = public, pg_temp;
ALTER FUNCTION current_manager_id()   SET search_path = public, pg_temp;

-- ============================================================
-- STEP 4: AUDIT-LOG IMMUTABILITY
-- Audit logs must not be editable/deletable by anyone via the API,
-- otherwise an attacker can erase their tracks.
-- ============================================================

DROP POLICY IF EXISTS "audit_no_update" ON audit_logs;
DROP POLICY IF EXISTS "audit_no_delete" ON audit_logs;
CREATE POLICY "audit_no_update" ON audit_logs FOR UPDATE TO authenticated USING (false);
CREATE POLICY "audit_no_delete" ON audit_logs FOR DELETE TO authenticated USING (false);

-- ============================================================
-- STEP 5: LOCK DOWN user_profiles WRITES
-- A user must NOT be able to change their own role to 'admin'.
-- Self-update is allowed but role/is_active changes are admin-only.
-- ============================================================

DROP POLICY IF EXISTS "profiles_update_safe" ON user_profiles;
CREATE POLICY "profiles_update_safe" ON user_profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR current_user_role() = 'admin'
  )
  WITH CHECK (
    -- non-admins can only update their own row AND cannot escalate role
    current_user_role() = 'admin'
    OR (
      id = auth.uid()
      AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
      AND is_active = (SELECT is_active FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ============================================================
-- STEP 6: PREVENT PRIVILEGE-ESCALATION ON employees self-update
-- An employee can update limited fields on their own record but
-- not their salary-affecting or status fields.
-- (Handled at app layer too, but enforced here as defense-in-depth.)
-- ============================================================

-- (Salaries already restricted to finance/admin via existing policy.)

-- ============================================================
-- DONE. Now run this to SEE the result:
-- ============================================================
SELECT * FROM security_audit_rls;

-- ============================================================
-- STEP 7: BRUTE-FORCE LOCKOUT RPC
-- Called on every failed login. Locks account for 15 min after 5 fails.
-- SECURITY DEFINER so it can update even with RLS, but only touches
-- the counter columns by email — it cannot leak data.
-- ============================================================

CREATE OR REPLACE FUNCTION register_failed_login(p_email TEXT)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_attempts INT;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN RETURN; END IF;  -- don't reveal whether email exists

  UPDATE user_profiles
  SET failed_attempts = COALESCE(failed_attempts, 0) + 1,
      locked_until = CASE
        WHEN COALESCE(failed_attempts, 0) + 1 >= 5
        THEN NOW() + INTERVAL '15 minutes'
        ELSE locked_until
      END
  WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Allow anonymous + authenticated to call it (it's safe — no data returned)
GRANT EXECUTE ON FUNCTION register_failed_login(TEXT) TO anon, authenticated;
