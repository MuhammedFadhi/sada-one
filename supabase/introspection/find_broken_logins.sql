-- ============================================================
-- SA'DA ONE — find accounts that CANNOT log in
--
-- The sign-in email lives in auth.users. The email shown in the app
-- lives in employees.work_email. Editing the employee record never
-- moved the login, so the two can drift — and when they do, the person
-- gets "Invalid login credentials" no matter how often you reset their
-- password, because no account exists at the address you're giving them.
--
-- Read-only. Run in the Supabase SQL editor.
-- ============================================================

SELECT
  e.full_name_en                                   AS employee,
  e.work_email                                     AS email_shown_in_app,
  u.email                                          AS email_they_must_actually_use,
  CASE
    WHEN u.email IS NULL                                   THEN 'NO LOGIN ACCOUNT'
    WHEN lower(trim(e.work_email)) = lower(trim(u.email))  THEN 'ok'
    ELSE                                                        'MISMATCH — cannot sign in with the shown address'
  END                                              AS state,
  p.role,
  p.last_login_at
FROM employees e
LEFT JOIN user_profiles p ON p.employee_id = e.id
LEFT JOIN auth.users    u ON u.id = p.id
ORDER BY
  CASE
    WHEN u.email IS NULL THEN 1
    WHEN lower(trim(e.work_email)) <> lower(trim(u.email)) THEN 0
    ELSE 2
  END,
  e.full_name_en;


-- ── Summary ─────────────────────────────────────────────────
SELECT
  count(*) FILTER (WHERE u.email IS NOT NULL
                     AND lower(trim(e.work_email)) <> lower(trim(u.email)))  AS broken_logins,
  count(*) FILTER (WHERE p.id IS NULL)                                       AS no_account,
  count(*) FILTER (WHERE u.email IS NOT NULL
                     AND lower(trim(e.work_email)) = lower(trim(u.email)))   AS healthy,
  count(*)                                                                   AS employees_total
FROM employees e
LEFT JOIN user_profiles p ON p.employee_id = e.id
LEFT JOIN auth.users    u ON u.id = p.id;
