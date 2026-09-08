-- ============================================================
-- SA'DA ONE — Migration 005: Test Accounts (2 per role)
-- Run ONCE in Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Creates 10 login-ready accounts across all 5 roles, each with a
-- linked employee record + user_profile + current-year leave balances.
--
-- ALL PASSWORDS:  SadaTest#2026
--
--   admin1@sada.test      / SadaTest#2026   (admin)
--   admin2@sada.test      / SadaTest#2026   (admin)
--   hr1@sada.test         / SadaTest#2026   (hr_officer)
--   hr2@sada.test         / SadaTest#2026   (hr_officer)
--   finance1@sada.test    / SadaTest#2026   (finance)
--   finance2@sada.test    / SadaTest#2026   (finance)
--   manager1@sada.test    / SadaTest#2026   (manager)
--   manager2@sada.test    / SadaTest#2026   (manager)
--   employee1@sada.test   / SadaTest#2026   (employee)
--   employee2@sada.test   / SadaTest#2026   (employee)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_company UUID := 'a0000000-0000-0000-0000-000000000001';
  v_division UUID := 'd0000001-0000-0000-0000-000000000005';  -- IT division (exists in seed)
  v_manager UUID := 'f0000001-0000-0000-0000-000000000001';   -- Yasar (admin) as reporting line
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_pwd TEXT := 'SadaTest#2026';

  -- email, role, employee_uuid, full_name, emp_number, job_title
  rec RECORD;
  accounts CONSTANT JSONB := '[
    {"email":"admin1@sada.test",   "role":"admin",     "eid":"a1111111-0000-0000-0000-000000000001","name":"Test Admin One",    "num":"TST-A01","title":"System Administrator"},
    {"email":"admin2@sada.test",   "role":"admin",     "eid":"a1111111-0000-0000-0000-000000000002","name":"Test Admin Two",    "num":"TST-A02","title":"System Administrator"},
    {"email":"hr1@sada.test",      "role":"hr_officer","eid":"a1111111-0000-0000-0000-000000000003","name":"Test HR One",       "num":"TST-H01","title":"HR Officer"},
    {"email":"hr2@sada.test",      "role":"hr_officer","eid":"a1111111-0000-0000-0000-000000000004","name":"Test HR Two",       "num":"TST-H02","title":"HR Officer"},
    {"email":"finance1@sada.test", "role":"finance",   "eid":"a1111111-0000-0000-0000-000000000005","name":"Test Finance One",  "num":"TST-F01","title":"Finance Officer"},
    {"email":"finance2@sada.test", "role":"finance",   "eid":"a1111111-0000-0000-0000-000000000006","name":"Test Finance Two",  "num":"TST-F02","title":"Finance Officer"},
    {"email":"manager1@sada.test", "role":"manager",   "eid":"a1111111-0000-0000-0000-000000000007","name":"Test Manager One",  "num":"TST-M01","title":"Department Manager"},
    {"email":"manager2@sada.test", "role":"manager",   "eid":"a1111111-0000-0000-0000-000000000008","name":"Test Manager Two",  "num":"TST-M02","title":"Department Manager"},
    {"email":"employee1@sada.test","role":"employee",  "eid":"a1111111-0000-0000-0000-000000000009","name":"Test Employee One", "num":"TST-E01","title":"Staff"},
    {"email":"employee2@sada.test","role":"employee",  "eid":"a1111111-0000-0000-0000-000000000010","name":"Test Employee Two", "num":"TST-E02","title":"Staff"}
  ]'::jsonb;

  v_auth_id UUID;
BEGIN
  FOR rec IN SELECT * FROM jsonb_to_recordset(accounts)
    AS x(email TEXT, role TEXT, eid UUID, name TEXT, num TEXT, title TEXT)
  LOOP
    -- ── 1. AUTH USER (create or reuse by email) ──────────────
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

      -- identity row (required by GoTrue for email/password sign-in)
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_auth_id,
        jsonb_build_object('sub', v_auth_id::text, 'email', rec.email),
        'email', v_auth_id::text, NOW(), NOW(), NOW()
      );
    ELSE
      -- reset password to the known test password on re-run
      UPDATE auth.users
        SET encrypted_password = crypt(v_pwd, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = v_auth_id;
    END IF;

    -- ── 2. EMPLOYEE RECORD ───────────────────────────────────
    INSERT INTO employees (
      id, company_id, division_id, manager_id, employee_number,
      full_name_en, full_name_ar, job_title_en, job_title_ar,
      nationality, gender, work_email, join_date, contract_type, status
    ) VALUES (
      rec.eid, v_company, v_division,
      CASE WHEN rec.role = 'employee' THEN v_manager ELSE NULL END,
      rec.num, rec.name, rec.name, rec.title, rec.title,
      'Saudi', 'male', rec.email, CURRENT_DATE - INTERVAL '1 year',
      'permanent', 'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name_en = EXCLUDED.full_name_en,
      job_title_en = EXCLUDED.job_title_en,
      work_email   = EXCLUDED.work_email;

    -- ── 3. USER PROFILE (role link) ──────────────────────────
    INSERT INTO user_profiles (
      id, employee_id, role, is_active, two_fa_enabled, language_pref, must_change_password
    ) VALUES (
      v_auth_id, rec.eid, rec.role::user_role, TRUE, FALSE, 'en', FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
      employee_id = EXCLUDED.employee_id,
      role        = EXCLUDED.role,
      is_active   = TRUE,
      must_change_password = FALSE;

    -- ── 4. LEAVE BALANCES (annual + sick, current year) ──────
    INSERT INTO leave_balances (employee_id, year, leave_type, entitled_days, taken_days, pending_days, carried_over)
    VALUES
      (rec.eid, v_year, 'annual', 30, 0, 0, 0),
      (rec.eid, v_year, 'sick',   30, 0, 0, 0)
    ON CONFLICT (employee_id, year, leave_type) DO NOTHING;

    RAISE NOTICE '✓ % (%) → auth %', rec.email, rec.role, v_auth_id;
  END LOOP;
END $$;

-- Verify:
SELECT up.role, e.full_name_en, e.work_email, up.is_active
FROM user_profiles up
JOIN employees e ON e.id = up.employee_id
WHERE e.employee_number LIKE 'TST-%'
ORDER BY up.role, e.employee_number;
