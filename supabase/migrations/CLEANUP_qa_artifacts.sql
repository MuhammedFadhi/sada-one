-- ============================================================
-- Purge QA artifacts created during testing. BULLETPROOF:
-- every delete is wrapped so a missing column/table or an FK
-- reference can never abort the rest (skipped rows are NOTICEd).
-- Scope: only data created by the seeded test accounts
-- (employee ids a1111111-0000-0000-0000-0000000000xx) plus the
-- edge-function throwaway employee/user (EDGE* / edgetest+*).
-- Test ACCOUNTS themselves are kept. Run the whole block at once.
-- ============================================================
DO $$
DECLARE
  t uuid[] := ARRAY(SELECT id FROM employees WHERE id::text LIKE 'a1111111-0000-0000-0000-%');
  s text;
  stmts text[] := ARRAY[
    'DELETE FROM chat_messages        WHERE channel_id IN (SELECT id FROM chat_channels WHERE created_by = ANY($1))',
    'DELETE FROM chat_channel_members WHERE channel_id IN (SELECT id FROM chat_channels WHERE created_by = ANY($1))',
    'DELETE FROM chat_messages        WHERE sender_id   = ANY($1)',
    'DELETE FROM chat_channel_members WHERE employee_id = ANY($1)',
    'DELETE FROM chat_channels        WHERE created_by  = ANY($1)',
    'DELETE FROM attendance_logs      WHERE employee_id = ANY($1)',
    'DELETE FROM leave_requests       WHERE employee_id = ANY($1)',
    'DELETE FROM hr_requests          WHERE employee_id = ANY($1)',
    'DELETE FROM expense_claims       WHERE employee_id = ANY($1)',
    'DELETE FROM help_desk_tickets    WHERE employee_id = ANY($1)',
    'DELETE FROM task_comments        WHERE task_id IN (SELECT id FROM tasks WHERE reporter_id = ANY($1))',
    'DELETE FROM task_activity        WHERE task_id IN (SELECT id FROM tasks WHERE reporter_id = ANY($1))',
    'DELETE FROM task_watchers        WHERE task_id IN (SELECT id FROM tasks WHERE reporter_id = ANY($1))',
    'DELETE FROM tasks                WHERE reporter_id = ANY($1)',
    'DELETE FROM task_project_members WHERE project_id IN (SELECT id FROM task_projects WHERE owner_id = ANY($1))',
    'DELETE FROM task_projects        WHERE owner_id = ANY($1)',
    'DELETE FROM sales_records        WHERE uploaded_by = ANY($1)'
  ];
BEGIN
  FOREACH s IN ARRAY stmts LOOP
    BEGIN EXECUTE s USING t; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped (%): %', SQLERRM, s; END;
  END LOOP;

  -- Edge-function test artifacts
  BEGIN DELETE FROM user_profiles WHERE employee_id IN (SELECT id FROM employees WHERE employee_number LIKE 'EDGE%'); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip profiles: %', SQLERRM; END;
  BEGIN DELETE FROM employees     WHERE employee_number LIKE 'EDGE%'; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip employees: %', SQLERRM; END;
  BEGIN DELETE FROM auth.users    WHERE email LIKE 'edgetest+%@sada.test' OR email LIKE 'edgeemp+%@sada.test'; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip auth: %', SQLERRM; END;
END $$;
