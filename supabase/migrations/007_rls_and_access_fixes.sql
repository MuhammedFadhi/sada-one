-- ============================================================
-- SA'DA ONE — Migration 007: Critical RLS & Access Fixes
-- Fixes (confirmed by live diagnosis):
--   • Admin sees only 1 user  → current_user_role() was being INLINED
--     into user_profiles' own policy, defeating SECURITY DEFINER.
--   • Chat 500 (42P17 infinite recursion) → chat_channel_members
--     policy referenced its own table in a subquery.
--   • Employees can't see colleagues (chat "people", directory empty).
--   • Attendance break/overtime columns for the new punch features.
-- Safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. HELPER FUNCTIONS → PL/pgSQL so the planner cannot INLINE them.
--    Inlined SQL functions lose their SECURITY DEFINER RLS-bypass
--    when called from a policy on the SAME table they read, which is
--    exactly what silently hid all but the caller's own row.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE r user_role;
BEGIN
  SELECT role INTO r FROM user_profiles WHERE id = auth.uid();
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE e UUID;
BEGIN
  SELECT employee_id INTO e FROM user_profiles WHERE id = auth.uid();
  RETURN e;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. CHANNEL MEMBERSHIP HELPER (breaks the recursion)
--    SECURITY DEFINER → reading chat_channel_members here does NOT
--    re-trigger the table's own RLS policy.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_channel_member(p_channel UUID, p_emp UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_channel_members
    WHERE channel_id = p_channel AND employee_id = p_emp
  );
END;
$$;

-- Rewrite the recursive chat policies ─────────────────────────
DROP POLICY IF EXISTS "channel_members_select" ON chat_channel_members;
CREATE POLICY "channel_members_select" ON chat_channel_members FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR is_channel_member(channel_id, current_employee_id())
    OR current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "channels_select" ON chat_channels;
CREATE POLICY "channels_select" ON chat_channels FOR SELECT TO authenticated
  USING (
    type = 'public'
    OR is_channel_member(id, current_employee_id())
    OR current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "messages_select" ON chat_messages;
CREATE POLICY "messages_select" ON chat_messages FOR SELECT TO authenticated
  USING ( is_channel_member(channel_id, current_employee_id()) OR current_user_role() = 'admin' );

DROP POLICY IF EXISTS "messages_insert" ON chat_messages;
CREATE POLICY "messages_insert" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK ( sender_id = current_employee_id() AND is_channel_member(channel_id, current_employee_id()) );

-- ────────────────────────────────────────────────────────────
-- 3. COMPANY DIRECTORY — every authenticated user may read basic
--    employee records (needed for the directory + chat "people").
--    Salaries live in employee_salaries (separately restricted),
--    so this exposes no compensation data.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "employees_directory_read" ON employees;
CREATE POLICY "employees_directory_read" ON employees FOR SELECT TO authenticated
  USING (true);

-- ────────────────────────────────────────────────────────────
-- 4. ATTENDANCE — break & overtime punch columns + geo for each
-- ────────────────────────────────────────────────────────────
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS break_in      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS break_out     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overtime_in   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overtime_out  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS break_minutes NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(6,2) DEFAULT 0;

-- ── Verify ──────────────────────────────────────────────────
-- After running, this should return ALL users (not just you):
SELECT count(*) AS visible_user_profiles FROM user_profiles;
-- This should NOT error (chat recursion gone):
SELECT count(*) AS visible_channels FROM chat_channels;
