-- ============================================================
-- SA'DA ONE — 038
-- Full self-service employee records.
--
-- 035 stopped employees editing their own job title, division,
-- join date and contract — those were HR's to set. The model has
-- changed: staff now enter ALL of their own details, and admins
-- correct anything afterwards.
--
-- A small number of fields stay locked because they are not
-- descriptive data — they drive behaviour elsewhere in the app:
--   employee_number   unique payroll key, issued by HR
--   status            active / on_leave / offboarding — drives approvals
--   company_id        single-company install
--   manager_id        vestigial since the flat-approval change (035)
--   work_schedule_id  attendance rules
--
-- Note this only ever governs a user editing THEIR OWN row without
-- elevated rights. Admin/HR edits and system updates are untouched.
--
-- Idempotent. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_employees_protect_hr_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.id = current_employee_id() AND NOT is_elevated() THEN
    -- Behavioural / identity fields only. Everything else — name, job
    -- title, division, department, documents, dates, contract type — is
    -- the employee's to fill in.
    NEW.employee_number  := OLD.employee_number;
    NEW.status           := OLD.status;
    NEW.company_id       := OLD.company_id;
    NEW.manager_id       := OLD.manager_id;
    NEW.work_schedule_id := OLD.work_schedule_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS employees_protect_hr_columns ON employees;
CREATE TRIGGER employees_protect_hr_columns BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION trg_employees_protect_hr_columns();

-- Reference data the onboarding wizard needs in its dropdowns.
-- Divisions and departments are org structure, not sensitive.
DROP POLICY IF EXISTS "divisions_read_all" ON divisions;
CREATE POLICY "divisions_read_all" ON divisions FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "departments_read_all" ON departments;
CREATE POLICY "departments_read_all" ON departments FOR SELECT TO authenticated USING (TRUE);

-- ── SUCCESS CHECK ────────────────────────────────────────────
SELECT '038 applied ✓'                                        AS status,
       (SELECT count(*) FROM pg_trigger
          WHERE tgname = 'employees_protect_hr_columns')       AS protect_trigger,  -- 1
       (SELECT count(*) FROM divisions)                        AS divisions_readable,
       (SELECT count(*) FROM departments)                      AS departments_readable;
