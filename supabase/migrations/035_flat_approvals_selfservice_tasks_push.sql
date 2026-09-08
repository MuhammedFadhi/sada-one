-- ============================================================
-- SA'DA ONE — 035
-- 1. Flat approval hierarchy  (no per-employee direct manager)
-- 2. Multi-assignee tasks     (visible to assignees AND the assigner)
-- 3. Push for chat messages   (phone notifications like a native app)
-- 4. Self-service profile     (employee edits own data; HR fields protected)
--
-- Idempotent. Safe to re-run. Run in Supabase SQL editor.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1 · FLAT APPROVAL HIERARCHY
-- Before: only the employee's direct manager (employees.manager_id)
--         could see/act on their stage-1 requests.
-- After:  ANY user with role 'manager' handles stage 1 company-wide;
--         HR/Finance still handle stage 2 ('processing').
-- These policies are ADDITIVE (RLS policies OR together), so nothing
-- that worked before stops working — managers simply gain reach.
-- UPDATE is deliberately limited to status='pending' so a manager can
-- only act at stage 1 and cannot re-open stage-2 / finalised requests.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['leave_requests','loans','exit_reentry','expense_claims'] LOOP
    -- table may not exist in every environment; skip quietly
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name=t) THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_mgr_stage1_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (current_user_role() = ''manager'')',
      t||'_mgr_stage1_select', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t||'_mgr_stage1_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (current_user_role() = ''manager'' AND status = ''pending'')',
      t||'_mgr_stage1_update', t);
  END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2 · MULTI-ASSIGNEE TASKS
-- tasks.assignee_id (single) is KEPT for backward compatibility and is
-- treated as the "primary" assignee; task_assignees is the real list.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id     UUID NOT NULL REFERENCES tasks(id)     ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_task_assignees_employee ON task_assignees(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task     ON task_assignees(task_id);

-- Backfill existing single assignments so nothing disappears from anyone's list.
INSERT INTO task_assignees (task_id, employee_id)
SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_assignees_select" ON task_assignees;
CREATE POLICY "task_assignees_select" ON task_assignees FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()                                   -- I'm assigned
    OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_assignees.task_id
               AND t.reporter_id = current_employee_id())                 -- I assigned it
    OR is_elevated()
  );

DROP POLICY IF EXISTS "task_assignees_write" ON task_assignees;
CREATE POLICY "task_assignees_write" ON task_assignees FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_assignees.task_id
            AND t.reporter_id = current_employee_id())                    -- assigner manages the list
    OR is_elevated()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_assignees.task_id
            AND t.reporter_id = current_employee_id())
    OR is_elevated()
  );

-- A task is visible to anyone in its assignee list (additive to existing policies,
-- which already covered assignee_id / reporter_id / project member / elevated).
DROP POLICY IF EXISTS "tasks_multi_assignee_select" ON tasks;
CREATE POLICY "tasks_multi_assignee_select" ON tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM task_assignees ta
            WHERE ta.task_id = tasks.id AND ta.employee_id = current_employee_id())
  );

-- Assignees may update the task they're working on (e.g. move it across the board).
DROP POLICY IF EXISTS "tasks_multi_assignee_update" ON tasks;
CREATE POLICY "tasks_multi_assignee_update" ON tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM task_assignees ta
            WHERE ta.task_id = tasks.id AND ta.employee_id = current_employee_id())
  );

-- Keep task_assignees in sync when the legacy single column is used.
CREATE OR REPLACE FUNCTION trg_task_sync_primary_assignee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id) THEN
    INSERT INTO task_assignees (task_id, employee_id)
    VALUES (NEW.id, NEW.assignee_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS task_sync_primary_assignee ON tasks;
CREATE TRIGGER task_sync_primary_assignee AFTER INSERT OR UPDATE OF assignee_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION trg_task_sync_primary_assignee();


-- ────────────────────────────────────────────────────────────
-- 3 · PUSH FOR CHAT MESSAGES
-- 033 deliberately skipped chat ("chat has its own realtime UI"), which is
-- why phones stayed silent for messages. A phone should buzz for a DM the
-- same way it does for WhatsApp — so chat now goes out over Web Push too.
-- (Identical to 033's function minus the chat_message early-return.)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_notification_push()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url     := 'https://psjcmitxouzwtljrlucv.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret','sada-one-push-2026'),
    body    := jsonb_build_object('user_id', NEW.user_id, 'title', NEW.title,
                                  'body', COALESCE(NEW.body,''), 'link', COALESCE(NEW.data->>'link','/'),
                                  'tag', NEW.type)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notification_push ON notifications;
CREATE TRIGGER notification_push AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION trg_notification_push();


-- ────────────────────────────────────────────────────────────
-- 4 · SELF-SERVICE PROFILE
-- Employees fill in / correct their own details instead of HR typing
-- everything. HR-controlled fields are reverted by a trigger rather than
-- rejected, so a self-service save can never escalate privileges.
-- ────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Everyone who already exists is considered onboarded; only NEW accounts
-- get sent through the completion wizard.
UPDATE user_profiles SET profile_completed = TRUE WHERE profile_completed IS NOT TRUE;

DROP POLICY IF EXISTS "employees_self_update" ON employees;
CREATE POLICY "employees_self_update" ON employees FOR UPDATE TO authenticated
  USING (id = current_employee_id())
  WITH CHECK (id = current_employee_id());

CREATE OR REPLACE FUNCTION trg_employees_protect_hr_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only constrain a user editing their OWN row without elevated rights.
  -- HR/admin edits and all system/other-row updates pass through untouched.
  IF NEW.id = current_employee_id() AND NOT is_elevated() THEN
    NEW.company_id        := OLD.company_id;
    NEW.division_id       := OLD.division_id;
    NEW.department_id     := OLD.department_id;
    NEW.manager_id        := OLD.manager_id;
    NEW.work_schedule_id  := OLD.work_schedule_id;
    NEW.employee_number   := OLD.employee_number;
    NEW.job_title_en      := OLD.job_title_en;
    NEW.job_title_ar      := OLD.job_title_ar;
    NEW.status            := OLD.status;
    NEW.contract_type     := OLD.contract_type;
    NEW.contract_end_date := OLD.contract_end_date;
    NEW.join_date         := OLD.join_date;
    NEW.work_email        := OLD.work_email;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS employees_protect_hr_columns ON employees;
CREATE TRIGGER employees_protect_hr_columns BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION trg_employees_protect_hr_columns();


-- ────────────────────────────────────────────────────────────
-- SUCCESS CHECK (prints only if the whole file ran)
-- ────────────────────────────────────────────────────────────
SELECT
  '035 applied ✓'                                                                       AS status,
  (SELECT count(*) FROM pg_policies
     WHERE schemaname='public' AND policyname LIKE '%_mgr_stage1_%')                     AS flat_approval_policies,  -- 8
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema='public' AND table_name='task_assignees')                        AS task_assignees_table,    -- 1
  (SELECT count(*) FROM task_assignees)                                                  AS assignments_backfilled,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name='user_profiles' AND column_name='profile_completed')               AS profile_completed_col,   -- 1
  (SELECT count(*) FROM pg_trigger
     WHERE tgname IN ('employees_protect_hr_columns','task_sync_primary_assignee','notification_push')) AS new_triggers; -- 3
