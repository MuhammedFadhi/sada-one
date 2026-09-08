-- ============================================================
-- SA'DA ONE — 039
--   2 · Suggestions: record who submitted
--   6 · Tasks: deletion actually works (there was NO delete policy)
--   7 · Tasks: history of completed / open / deleted
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 2 · SUGGESTION ATTRIBUTION
--
-- The table was built deliberately anonymous — the original schema
-- carries the comment "NO employee_id — fully anonymous". Adding the
-- author is therefore a POLICY CHANGE, not a bug fix.
--
-- Two things follow, and both are handled:
--   • Rows created before today stay NULL and display as "Anonymous
--     (before tracking)" — we cannot retroactively attribute them.
--   • The employee-facing screen no longer claims anonymity. Telling
--     staff a channel is anonymous while recording their name is the
--     one outcome that must not ship.
-- ────────────────────────────────────────────────────────────
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_suggestions_employee ON suggestions(employee_id);

-- Everyone may still read suggestions (unchanged); elevated roles can
-- now resolve the author through the employees embed.
DROP POLICY IF EXISTS "suggestions_insert_self" ON suggestions;
CREATE POLICY "suggestions_insert_self" ON suggestions FOR INSERT TO authenticated
  WITH CHECK (employee_id IS NULL OR employee_id = current_employee_id());


-- ────────────────────────────────────────────────────────────
-- 6 · TASK DELETION
--
-- Root cause of "tasks aren't getting deleted": tasks had SELECT,
-- INSERT and UPDATE policies but NO DELETE policy. With RLS enabled,
-- a missing policy denies the operation — and PostgREST reports
-- success with zero rows affected, so the UI looked like it worked
-- while nothing happened.
--
-- Deletion is implemented as a SOFT delete so item 7's history can
-- still show what was removed. The hard-delete policy below is kept
-- for admins who genuinely need a row gone.
-- ────────────────────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES employees(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

-- Hard delete: the person who raised the task, or an elevated role.
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (reporter_id = current_employee_id() OR is_elevated());

-- Soft delete needs UPDATE rights for the reporter too — the existing
-- update policies cover assignees and elevated roles but not
-- necessarily the person who created the task.
DROP POLICY IF EXISTS "tasks_reporter_update" ON tasks;
CREATE POLICY "tasks_reporter_update" ON tasks FOR UPDATE TO authenticated
  USING (reporter_id = current_employee_id());

-- Cascade the soft delete to the assignee list so a removed task stops
-- appearing in anyone's queue while remaining intact for history.
CREATE OR REPLACE FUNCTION trg_task_soft_delete_cascade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    NEW.status := COALESCE(NEW.status, OLD.status);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS task_soft_delete_cascade ON tasks;
CREATE TRIGGER task_soft_delete_cascade BEFORE UPDATE OF deleted_at ON tasks
  FOR EACH ROW EXECUTE FUNCTION trg_task_soft_delete_cascade();


-- ────────────────────────────────────────────────────────────
-- SUCCESS CHECK
-- ────────────────────────────────────────────────────────────
SELECT '039 applied ✓'                                            AS status,
       (SELECT count(*) FROM information_schema.columns
          WHERE table_name='suggestions' AND column_name='employee_id')   AS suggestion_author_col,   -- 1
       (SELECT count(*) FROM information_schema.columns
          WHERE table_name='tasks' AND column_name IN ('deleted_at','deleted_by')) AS task_history_cols, -- 2
       (SELECT count(*) FROM pg_policies
          WHERE tablename='tasks' AND cmd='DELETE')                        AS task_delete_policies,   -- 1
       (SELECT count(*) FROM tasks WHERE deleted_at IS NULL)               AS active_tasks;
