-- ============================================================
-- SA'DA ONE — 036  HOTFIX (run immediately after 035)
--
-- 035 introduced two RLS policies that reference each other:
--   tasks.tasks_multi_assignee_select      → SELECT ... FROM task_assignees
--   task_assignees.task_assignees_select   → SELECT ... FROM tasks
-- Evaluating either one triggers the other, so Postgres aborts with
--   42P17: infinite recursion detected in policy for relation "task_assignees"
-- which takes the whole Tasks feature down.
--
-- Fix: move the cross-table lookups into SECURITY DEFINER functions.
-- They run as the table owner, so RLS is not re-evaluated inside them
-- and the cycle is broken. Behaviour is otherwise identical to 035.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- ── Helper: am I an assignee of this task? (no RLS re-entry) ──
CREATE OR REPLACE FUNCTION is_task_assignee(p_task UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM task_assignees ta
    WHERE ta.task_id = p_task
      AND ta.employee_id = current_employee_id()
  );
$$;

-- ── Helper: did I create/assign this task? (no RLS re-entry) ──
CREATE OR REPLACE FUNCTION is_task_reporter(p_task UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = p_task
      AND t.reporter_id = current_employee_id()
  );
$$;

REVOKE ALL ON FUNCTION is_task_assignee(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_task_reporter(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_task_assignee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_task_reporter(UUID) TO authenticated;


-- ── Rebuild the recursive policies using the helpers ─────────
DROP POLICY IF EXISTS "tasks_multi_assignee_select" ON tasks;
CREATE POLICY "tasks_multi_assignee_select" ON tasks FOR SELECT TO authenticated
  USING (is_task_assignee(tasks.id));

DROP POLICY IF EXISTS "tasks_multi_assignee_update" ON tasks;
CREATE POLICY "tasks_multi_assignee_update" ON tasks FOR UPDATE TO authenticated
  USING (is_task_assignee(tasks.id));

DROP POLICY IF EXISTS "task_assignees_select" ON task_assignees;
CREATE POLICY "task_assignees_select" ON task_assignees FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()          -- I'm assigned
    OR is_task_reporter(task_assignees.task_id)  -- I assigned it
    OR is_elevated()
  );

DROP POLICY IF EXISTS "task_assignees_write" ON task_assignees;
CREATE POLICY "task_assignees_write" ON task_assignees FOR ALL TO authenticated
  USING      (is_task_reporter(task_assignees.task_id) OR is_elevated())
  WITH CHECK (is_task_reporter(task_assignees.task_id) OR is_elevated());


-- ── SUCCESS CHECK ────────────────────────────────────────────
-- Should return one row and must NOT raise 42P17.
SELECT
  '036 applied ✓'                                             AS status,
  (SELECT count(*) FROM pg_proc
     WHERE proname IN ('is_task_assignee','is_task_reporter')) AS helper_functions,  -- 2
  (SELECT count(*) FROM task_assignees)                        AS assignment_rows,
  (SELECT count(*) FROM tasks)                                 AS tasks_readable;    -- no recursion = OK
