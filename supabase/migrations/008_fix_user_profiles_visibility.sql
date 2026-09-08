-- ============================================================
-- SA'DA ONE — Migration 008: Fix user_profiles visibility
-- Diagnosis: current_user_role() now returns 'admin' correctly
-- (verified via RPC), but the live user_profiles SELECT policy
-- still only exposes the caller's own row. We drop EVERY existing
-- SELECT policy on user_profiles and recreate one clean, correct
-- policy so admins/HR can see all users. Safe to re-run.
-- ============================================================

-- Drop any/all known SELECT-policy variants that may exist live
DROP POLICY IF EXISTS "profiles_select_own"        ON user_profiles;
DROP POLICY IF EXISTS "profiles_select"            ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select"       ON user_profiles;
DROP POLICY IF EXISTS "profiles_read"              ON user_profiles;
DROP POLICY IF EXISTS "profiles_select_all_admin"  ON user_profiles;

-- Recreate a single, correct SELECT policy.
-- Admin + HR see everyone; everyone else sees their own row.
CREATE POLICY "profiles_select_all_admin" ON user_profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR current_user_role() IN ('admin', 'hr_officer')
  );

-- ── Verify (run as admin): should return ALL profiles, not 1 ──
SELECT count(*) AS visible_profiles FROM user_profiles;

-- Also list the active SELECT policies so we can see what's there:
SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
WHERE polrelid = 'public.user_profiles'::regclass AND polcmd IN ('r','*')
ORDER BY polname;
