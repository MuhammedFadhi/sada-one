-- ============================================================
-- 032 — V2 FEATURES (run whole file in Supabase SQL editor)
--  A. Test account reset (dev accounts only)
--  B. HR + Finance role merge
--  C. Two-stage approvals (manager -> HR/Finance)
--  D. Notifications: triggers + realtime + email bridge
--  E. Storage: receipts bucket (+ policies)
--  F. Org management policies (companies/divisions/departments)
-- ============================================================

-- ── A. TEST ACCOUNTS: create one login per role (idempotent) ──
-- Password for all = SadaTest#2026. Safe to re-run.
--   admin1@sada.test     (admin)
--   hr1@sada.test        (hr_officer  = "HR & Finance" after merge in §B)
--   finance1@sada.test   (finance     -> becomes hr_officer in §B)
--   manager1@sada.test   (manager)
--   employee1@sada.test  (employee; reports to manager1 -> drives two-stage)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_company  UUID := 'a0000000-0000-0000-0000-000000000001';  -- SA'DA Group
  v_div_it   UUID := 'd0000001-0000-0000-0000-000000000005';  -- Information Technology
  v_div_hr   UUID := 'd0000001-0000-0000-0000-000000000006';  -- Human Resources
  v_div_fin  UUID := 'd0000001-0000-0000-0000-000000000004';  -- Finance
  v_div_ops  UUID := 'd0000001-0000-0000-0000-000000000002';  -- Operations
  v_mgr_eid  UUID := 'a1111111-0000-0000-0000-000000000007';  -- manager1 employee id
  v_pwd TEXT := 'SadaTest#2026';
  rec RECORD;
  v_auth_id UUID;
  accounts CONSTANT JSONB := '[
    {"email":"admin1@sada.test",   "role":"admin",     "eid":"a1111111-0000-0000-0000-000000000001","name":"Test Admin One",  "num":"TST-A01","title":"System Administrator","div":"d0000001-0000-0000-0000-000000000005"},
    {"email":"hr1@sada.test",      "role":"hr_officer","eid":"a1111111-0000-0000-0000-000000000003","name":"Test HR Finance", "num":"TST-H01","title":"HR & Finance Officer","div":"d0000001-0000-0000-0000-000000000006"},
    {"email":"finance1@sada.test", "role":"finance",   "eid":"a1111111-0000-0000-0000-000000000005","name":"Test Finance",    "num":"TST-F01","title":"Finance Officer","div":"d0000001-0000-0000-0000-000000000004"},
    {"email":"manager1@sada.test", "role":"manager",   "eid":"a1111111-0000-0000-0000-000000000007","name":"Test Manager",    "num":"TST-M01","title":"Department Manager","div":"d0000001-0000-0000-0000-000000000002"},
    {"email":"employee1@sada.test","role":"employee",  "eid":"a1111111-0000-0000-0000-000000000009","name":"Test Employee",   "num":"TST-E01","title":"Staff","div":"d0000001-0000-0000-0000-000000000002"}
  ]'::jsonb;
BEGIN
  FOR rec IN SELECT * FROM jsonb_to_recordset(accounts)
    AS x(email TEXT, role TEXT, eid UUID, name TEXT, num TEXT, title TEXT, div UUID)
  LOOP
    -- 1. AUTH USER
    SELECT id INTO v_auth_id FROM auth.users WHERE email = rec.email LIMIT 1;
    IF v_auth_id IS NULL THEN
      v_auth_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_auth_id, 'authenticated', 'authenticated',
        rec.email, crypt(v_pwd, gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', rec.name),
        '', '', '', ''
      );
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_auth_id,
        jsonb_build_object('sub', v_auth_id::text, 'email', rec.email),
        'email', v_auth_id::text, NOW(), NOW(), NOW()
      );
    ELSE
      UPDATE auth.users
        SET encrypted_password = crypt(v_pwd, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = v_auth_id;
    END IF;

    -- 2. EMPLOYEE (employee1 reports to manager1)
    INSERT INTO employees (
      id, company_id, division_id, manager_id, employee_number,
      full_name_en, full_name_ar, job_title_en, job_title_ar,
      nationality, gender, work_email, join_date, contract_type, status
    ) VALUES (
      rec.eid, v_company, rec.div,
      CASE WHEN rec.role = 'employee' THEN v_mgr_eid ELSE NULL END,
      rec.num, rec.name, rec.name, rec.title, rec.title,
      'Saudi', 'male', rec.email, CURRENT_DATE - INTERVAL '1 year',
      'permanent', 'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name_en = EXCLUDED.full_name_en,
      division_id  = EXCLUDED.division_id,
      manager_id   = EXCLUDED.manager_id,
      job_title_en = EXCLUDED.job_title_en,
      work_email   = EXCLUDED.work_email,
      status       = 'active';

    -- 3. USER PROFILE (role link)
    INSERT INTO user_profiles (
      id, employee_id, role, is_active, language_pref, must_change_password
    ) VALUES (
      v_auth_id, rec.eid, rec.role::user_role, TRUE, 'en', FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
      employee_id = EXCLUDED.employee_id,
      role        = EXCLUDED.role,
      is_active   = TRUE,
      must_change_password = FALSE;

    -- 4. LEAVE BALANCES (current year)
    INSERT INTO leave_balances (employee_id, year, leave_type, entitled_days, taken_days, pending_days, carried_over)
    VALUES
      (rec.eid, EXTRACT(YEAR FROM CURRENT_DATE)::INT, 'annual', 30, 0, 0, 0),
      (rec.eid, EXTRACT(YEAR FROM CURRENT_DATE)::INT, 'sick',   30, 0, 0, 0)
    ON CONFLICT (employee_id, year, leave_type) DO NOTHING;
  END LOOP;
END $$;

-- ── B. ROLE MERGE: finance users become hr_officer ──────────
-- (enum value 'finance' kept harmlessly; no enum surgery)
UPDATE user_profiles SET role = 'hr_officer' WHERE role = 'finance';

-- Recreate finance-gated policies to include hr_officer
DROP POLICY IF EXISTS "salaries_select" ON employee_salaries;
CREATE POLICY "salaries_select" ON employee_salaries FOR SELECT TO authenticated
  USING (employee_id = current_employee_id()
    OR current_user_role() IN ('finance','hr_officer','admin'));

DROP POLICY IF EXISTS "salaries_write" ON employee_salaries;
CREATE POLICY "salaries_write" ON employee_salaries FOR ALL TO authenticated
  USING (current_user_role() IN ('finance','hr_officer','admin'));

DROP POLICY IF EXISTS "payroll_runs_select" ON payroll_runs;
CREATE POLICY "payroll_runs_select" ON payroll_runs FOR SELECT TO authenticated
  USING (current_user_role() IN ('finance','hr_officer','admin','director'));

DROP POLICY IF EXISTS "payroll_runs_write" ON payroll_runs;
CREATE POLICY "payroll_runs_write" ON payroll_runs FOR ALL TO authenticated
  USING (current_user_role() IN ('finance','hr_officer','admin'));

DROP POLICY IF EXISTS "payslips_select" ON payslips;
CREATE POLICY "payslips_select" ON payslips FOR SELECT TO authenticated
  USING (employee_id = current_employee_id()
    OR current_user_role() IN ('finance','hr_officer','admin'));

DROP POLICY IF EXISTS "loans_select" ON loans;
CREATE POLICY "loans_select" ON loans FOR SELECT TO authenticated
  USING (employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = loans.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('finance','hr_officer','admin','director'));

DROP POLICY IF EXISTS "loans_update" ON loans;
CREATE POLICY "loans_update" ON loans FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = loans.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('finance','hr_officer','admin')
  );

DROP POLICY IF EXISTS "expense_select" ON expense_claims;
CREATE POLICY "expense_select" ON expense_claims FOR SELECT TO authenticated
  USING (employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = expense_claims.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('finance','hr_officer','admin'));

DROP POLICY IF EXISTS "expense_update" ON expense_claims;
CREATE POLICY "expense_update" ON expense_claims FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = expense_claims.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('finance','hr_officer','admin')
  );

DROP POLICY IF EXISTS "sales_read" ON sales_records;
CREATE POLICY "sales_read" ON sales_records FOR SELECT TO authenticated
  USING (current_user_role() IN ('finance','hr_officer','admin','manager'));

DROP POLICY IF EXISTS "sales_write" ON sales_records;
CREATE POLICY "sales_write" ON sales_records FOR ALL TO authenticated
  USING (current_user_role() IN ('finance','hr_officer','admin'))
  WITH CHECK (current_user_role() IN ('finance','hr_officer','admin'));

-- ── C. TWO-STAGE APPROVALS ───────────────────────────────────
-- Flow: pending (awaiting manager) -> processing (awaiting HR/Finance) -> approved
-- loans + exit_reentry already have stage columns. Add to leave + expenses:
ALTER TABLE leave_requests  ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES employees(id);
ALTER TABLE leave_requests  ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ;
ALTER TABLE expense_claims  ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES employees(id);
ALTER TABLE expense_claims  ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ;

-- Managers must be able to update leave rows of their reports (stage 1):
DROP POLICY IF EXISTS "leave_req_update" ON leave_requests;
CREATE POLICY "leave_req_update" ON leave_requests FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = leave_requests.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','finance','admin')
  );

DROP POLICY IF EXISTS "exit_update" ON exit_reentry;
CREATE POLICY "exit_update" ON exit_reentry FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = exit_reentry.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','finance','admin')
  );

-- ── D. NOTIFICATIONS ─────────────────────────────────────────
-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: employee_id -> notification row (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION notify_emp(p_emp UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM user_profiles WHERE employee_id = p_emp LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (v_uid, p_type, p_title, p_body, p_data);
  END IF;
END $$;

-- Helper: notify every HR/Finance user
CREATE OR REPLACE FUNCTION notify_hr_fin(p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT id, p_type, p_title, p_body, p_data
  FROM user_profiles WHERE role IN ('hr_officer','finance') AND COALESCE(is_active, TRUE);
END $$;

-- Generic request lifecycle trigger (used by 4 tables)
CREATE OR REPLACE FUNCTION trg_request_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT; v_mgr UUID; v_label TEXT; v_link TEXT;
BEGIN
  SELECT full_name_en, manager_id INTO v_name, v_mgr FROM employees WHERE id = NEW.employee_id;
  v_label := CASE TG_TABLE_NAME
    WHEN 'leave_requests' THEN 'Leave request'
    WHEN 'loans'          THEN 'Loan request'
    WHEN 'exit_reentry'   THEN 'Exit/Re-entry request'
    WHEN 'expense_claims' THEN 'Expense claim'
    ELSE 'Request' END;
  v_link := CASE TG_TABLE_NAME
    WHEN 'leave_requests' THEN '/employee/leave'
    WHEN 'loans'          THEN '/employee/loans'
    WHEN 'exit_reentry'   THEN '/employee/exit'
    WHEN 'expense_claims' THEN '/employee/expenses'
    ELSE '/' END;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' AND v_mgr IS NOT NULL THEN
      PERFORM notify_emp(v_mgr, 'approval', v_label || ' — action needed',
        v_name || ' submitted a ' || lower(v_label) || '.', jsonb_build_object('link','/manager/approvals'));
    ELSE
      PERFORM notify_hr_fin('approval', v_label || ' — action needed',
        v_name || ' submitted a ' || lower(v_label) || '.', jsonb_build_object('link','/hr/requests'));
    END IF;

  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'processing' THEN
      PERFORM notify_emp(NEW.employee_id, 'status', v_label || ' approved by manager',
        'Your ' || lower(v_label) || ' is now with HR & Finance for final approval.', jsonb_build_object('link', v_link));
      PERFORM notify_hr_fin('approval', v_label || ' — final approval needed',
        v_name || '''s ' || lower(v_label) || ' was approved by their manager.', jsonb_build_object('link','/hr/requests'));
    ELSIF NEW.status = 'approved' THEN
      PERFORM notify_emp(NEW.employee_id, 'status', v_label || ' approved ✓',
        'Your ' || lower(v_label) || ' has been approved.', jsonb_build_object('link', v_link));
    ELSIF NEW.status = 'rejected' THEN
      PERFORM notify_emp(NEW.employee_id, 'status', v_label || ' declined',
        'Your ' || lower(v_label) || ' was declined.' ||
        COALESCE(' Reason: ' || NULLIF(to_jsonb(NEW)->>'rejection_reason',''), ''), jsonb_build_object('link', v_link));
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_leave   ON leave_requests;
DROP TRIGGER IF EXISTS notify_loan    ON loans;
DROP TRIGGER IF EXISTS notify_exit    ON exit_reentry;
DROP TRIGGER IF EXISTS notify_expense ON expense_claims;
CREATE TRIGGER notify_leave   AFTER INSERT OR UPDATE OF status ON leave_requests  FOR EACH ROW EXECUTE FUNCTION trg_request_notify();
CREATE TRIGGER notify_loan    AFTER INSERT OR UPDATE OF status ON loans           FOR EACH ROW EXECUTE FUNCTION trg_request_notify();
CREATE TRIGGER notify_exit    AFTER INSERT OR UPDATE OF status ON exit_reentry    FOR EACH ROW EXECUTE FUNCTION trg_request_notify();
CREATE TRIGGER notify_expense AFTER INSERT OR UPDATE OF status ON expense_claims  FOR EACH ROW EXECUTE FUNCTION trg_request_notify();

-- HR document requests (letters): direct to HR, notify on result
CREATE OR REPLACE FUNCTION trg_hr_request_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  SELECT full_name_en INTO v_name FROM employees WHERE id = NEW.employee_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_hr_fin('approval', 'Document request',
      v_name || ' requested: ' || replace(NEW.request_type::text,'_',' '), jsonb_build_object('link','/hr/requests'));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','completed','rejected') THEN
    PERFORM notify_emp(NEW.employee_id, 'status',
      'Document request ' || CASE WHEN NEW.status='rejected' THEN 'declined' ELSE 'ready' END,
      'Your ' || replace(NEW.request_type::text,'_',' ') || ' request is ' || NEW.status || '.',
      jsonb_build_object('link','/employee/hr-requests'));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_hr_req ON hr_requests;
CREATE TRIGGER notify_hr_req AFTER INSERT OR UPDATE OF status ON hr_requests FOR EACH ROW EXECUTE FUNCTION trg_hr_request_notify();

-- Task assignment
CREATE OR REPLACE FUNCTION trg_task_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_by TEXT;
BEGIN
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM NEW.reporter_id
     AND (TG_OP = 'INSERT' OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id) THEN
    SELECT full_name_en INTO v_by FROM employees WHERE id = NEW.reporter_id;
    PERFORM notify_emp(NEW.assignee_id, 'task', 'Task assigned to you',
      COALESCE(v_by,'Someone') || ' assigned you: ' || NEW.title, jsonb_build_object('link','/tasks','task_id',NEW.id));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_task ON tasks;
CREATE TRIGGER notify_task AFTER INSERT OR UPDATE OF assignee_id ON tasks FOR EACH ROW EXECUTE FUNCTION trg_task_notify();

-- Chat messages -> notify other channel members (in-app only, no email)
CREATE OR REPLACE FUNCTION trg_chat_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender TEXT;
BEGIN
  IF COALESCE(NEW.is_deleted,false) THEN RETURN NEW; END IF;
  SELECT full_name_en INTO v_sender FROM employees WHERE id = NEW.sender_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT up.id, 'chat_message', COALESCE(v_sender,'New message'),
         CASE WHEN NEW.attachment_type LIKE 'audio/%' THEN '🎤 Voice note'
              WHEN NEW.attachment_url IS NOT NULL AND COALESCE(NEW.content,'')='' THEN '📎 Attachment'
              ELSE left(COALESCE(NEW.content,''), 80) END,
         jsonb_build_object('link','/chat/' || NEW.channel_id, 'channel_id', NEW.channel_id)
  FROM chat_channel_members m
  JOIN user_profiles up ON up.employee_id = m.employee_id
  WHERE m.channel_id = NEW.channel_id AND m.employee_id <> NEW.sender_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_chat ON chat_messages;
CREATE TRIGGER notify_chat AFTER INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION trg_chat_notify();

-- Email bridge: on notification insert (non-chat), POST to send-email edge fn via pg_net.
-- Safe no-op until RESEND_API_KEY is configured in the function.
-- pg_net is available on Supabase; guard so the migration never fails if it isn't.
DO $enet$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net not available — email bridge will no-op until enabled';
END $enet$;

CREATE OR REPLACE FUNCTION trg_notification_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  IF NEW.type = 'chat_message' THEN RETURN NEW; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  IF v_email IS NULL OR v_email LIKE '%@sada.test' THEN RETURN NEW; END IF;
  -- pg_net may be absent; PERFORM on a missing function is caught below.
  PERFORM net.http_post(
    url     := 'https://psjcmitxouzwtljrlucv.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret','sada-one-mail-2026'),
    body    := jsonb_build_object('to', v_email, 'subject', NEW.title, 'text', NEW.body,
                                  'link', COALESCE(NEW.data->>'link','/'))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; -- never block the app on email problems
END $$;
DROP TRIGGER IF EXISTS notification_email ON notifications;
CREATE TRIGGER notification_email AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION trg_notification_email();

-- ── E. STORAGE: receipts bucket ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts','receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');
DROP POLICY IF EXISTS "receipts_read" ON storage.objects;
CREATE POLICY "receipts_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'receipts');

-- ── F. ORG MANAGEMENT POLICIES ───────────────────────────────
DROP POLICY IF EXISTS "company_insert" ON companies;
CREATE POLICY "company_insert" ON companies FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'admin');
DROP POLICY IF EXISTS "company_delete" ON companies;
CREATE POLICY "company_delete" ON companies FOR DELETE TO authenticated
  USING (current_user_role() = 'admin');
-- divisions_write + departments_write (FOR ALL, admin) already exist.

-- Done.
SELECT 'MIGRATION 032 COMPLETE' AS status;
