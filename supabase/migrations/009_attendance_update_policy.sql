-- ============================================================
-- SA'DA ONE — Migration 009: Attendance write/read policy fix
-- Bug (confirmed live): check-in works (INSERT) but break, overtime,
-- and check-out return 403 — they UPDATE the existing daily row and
-- attendance_logs had NO UPDATE policy. Also: finance needs to read
-- attendance hours for payroll. Safe to re-run.
-- ============================================================

-- UPDATE policy — own row, your manager's reports, or HR/admin
DROP POLICY IF EXISTS "att_update" ON attendance_logs;
CREATE POLICY "att_update" ON attendance_logs FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees e WHERE e.id = attendance_logs.employee_id AND e.manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','admin')
  )
  WITH CHECK (
    employee_id = current_employee_id()
    OR current_user_role() IN ('hr_officer','admin')
  );

-- Widen SELECT to include finance (payroll needs hours)
DROP POLICY IF EXISTS "att_select" ON attendance_logs;
CREATE POLICY "att_select" ON attendance_logs FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees e WHERE e.id = attendance_logs.employee_id AND e.manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','finance','admin')
  );
