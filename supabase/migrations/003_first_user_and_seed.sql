-- ============================================================
-- SA'DA HR — Migration 003: First User + Full Seed Data
-- Run this AFTER 001_initial_schema.sql and 002_tasks_and_chat.sql
--
-- INSTRUCTIONS:
-- 1. Go to Supabase → Authentication → Users → "Invite user"
-- 2. Enter: yasar@a3sixty.com
-- 3. You'll get a signup email — click it and set your password
-- 4. Come back to SQL Editor and run THIS file
--    (it will find your auth user by email and set everything up)
-- ============================================================

-- ============================================================
-- STEP 1: SA'DA GROUP DIVISIONS (real company structure)
-- ============================================================

INSERT INTO divisions (id, company_id, name_en, name_ar, city, cost_center_code, is_active) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SA''DA Water',          'سعادة للمياه',             'Al Khobar', 'CC-001', TRUE),
  ('d0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Operations',           'العمليات',                 'Al Khobar', 'CC-002', TRUE),
  ('d0000001-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Sales & Marketing',    'المبيعات والتسويق',        'Al Khobar', 'CC-003', TRUE),
  ('d0000001-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Finance',              'المالية',                  'Al Khobar', 'CC-004', TRUE),
  ('d0000001-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Information Technology','تقنية المعلومات',          'Al Khobar', 'CC-005', TRUE),
  ('d0000001-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Human Resources',      'الموارد البشرية',          'Al Khobar', 'CC-006', TRUE),
  ('d0000001-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Logistics & Delivery', 'اللوجستيات والتوصيل',      'Dammam',    'CC-007', TRUE),
  ('d0000001-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Customer Service',     'خدمة العملاء',             'Al Khobar', 'CC-008', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 2: DEPARTMENTS
-- ============================================================

INSERT INTO departments (id, division_id, name_en, name_ar) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000005', 'Software Development', 'تطوير البرمجيات'),
  ('e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000005', 'Infrastructure',       'البنية التحتية'),
  ('e0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000003', 'Digital Marketing',    'التسويق الرقمي'),
  ('e0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000003', 'Sales',                'المبيعات'),
  ('e0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000004', 'Accounting',           'المحاسبة'),
  ('e0000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000006', 'Recruitment',          'التوظيف'),
  ('e0000001-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000001', 'Quality Control',      'ضبط الجودة'),
  ('e0000001-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000007', 'Fleet Management',     'إدارة الأسطول')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: YASAR'S EMPLOYEE RECORD
-- ============================================================

INSERT INTO employees (
  id,
  company_id,
  division_id,
  department_id,
  employee_number,
  full_name_en,
  full_name_ar,
  job_title_en,
  job_title_ar,
  nationality,
  work_email,
  join_date,
  contract_type,
  status
) VALUES (
  'f0000001-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000005',  -- IT Division
  'e0000001-0000-0000-0000-000000000001',  -- Software Development
  'EMP-0001',
  'Yasar Rahmani',
  'ياسر رحماني',
  'System Administrator',
  'مدير النظام',
  'Saudi',
  'yasar@a3sixty.com',
  CURRENT_DATE,
  'permanent',
  'active'
)
ON CONFLICT (employee_number) DO UPDATE SET
  full_name_en = EXCLUDED.full_name_en,
  work_email   = EXCLUDED.work_email;

-- ============================================================
-- STEP 4: LINK AUTH USER → EMPLOYEE PROFILE
-- Finds your Supabase auth user by email and connects it
-- ============================================================

DO $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  -- Find your auth user ID from the email you signed up with
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'yasar@a3sixty.com'
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION '
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AUTH USER NOT FOUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Make sure you have completed the invite step:
  Supabase → Authentication → Users → Invite user
  Enter: yasar@a3sixty.com
  Then click the link in your email to set password.
  Then re-run this SQL file.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  END IF;

  -- Insert or update user profile with FULL ACCESS (admin role)
  INSERT INTO user_profiles (
    id,
    employee_id,
    role,
    is_active,
    two_fa_enabled,
    language_pref,
    must_change_password
  ) VALUES (
    v_auth_user_id,
    'f0000001-0000-0000-0000-000000000001',
    'admin',   -- full access to everything
    TRUE,
    FALSE,
    'en',
    FALSE      -- no forced password reset since you set it via invite
  )
  ON CONFLICT (id) DO UPDATE SET
    employee_id          = EXCLUDED.employee_id,
    role                 = EXCLUDED.role,
    is_active            = EXCLUDED.is_active,
    must_change_password = EXCLUDED.must_change_password;

  RAISE NOTICE '✓ User profile created for auth user: %', v_auth_user_id;
END $$;

-- ============================================================
-- STEP 5: LEAVE BALANCES FOR YASAR (current year)
-- ============================================================

INSERT INTO leave_balances (employee_id, year, leave_type, entitled_days, taken_days, pending_days, carried_over)
SELECT
  'f0000001-0000-0000-0000-000000000001',
  EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  lp.leave_type,
  lp.days_per_year,
  0, 0, 0
FROM leave_policies lp
WHERE lp.company_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT (employee_id, year, leave_type) DO NOTHING;

-- ============================================================
-- STEP 6: SAMPLE EMPLOYEES (so the app looks populated)
-- You can delete these later or keep them as test accounts
-- ============================================================

INSERT INTO employees (id, company_id, division_id, department_id, manager_id, employee_number, full_name_en, full_name_ar, job_title_en, job_title_ar, nationality, work_email, mobile, join_date, contract_type, status)
VALUES
  -- IT Division
  ('f0000002-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'EMP-0002', 'Mohammed Al-Otaibi',  'محمد العتيبي',     'Senior Developer',       'مطور أول',              'Saudi',    'mohammed.dev@sada.sa',   '+966501111001', '2022-03-15', 'permanent', 'active'),
  ('f0000002-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'EMP-0003', 'Sara Al-Qahtani',     'سارة القحطاني',    'UI/UX Designer',         'مصممة واجهات',          'Saudi',    'sara.design@sada.sa',    '+966501111002', '2023-01-10', 'permanent', 'active'),
  ('f0000002-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'EMP-0004', 'Ahmed Bukhamseen',    'أحمد بوخمسين',     'Network Engineer',       'مهندس شبكات',           'Saudi',    'ahmed.net@sada.sa',      '+966501111003', '2021-06-01', 'permanent', 'active'),

  -- SA'DA Water
  ('f0000003-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000007', NULL,                                   'EMP-0005', 'Khalid Al-Dosari',    'خالد الدوسري',     'Water Quality Manager',  'مدير جودة المياه',      'Saudi',    'khalid.water@sada.sa',   '+966501111004', '2019-09-01', 'permanent', 'active'),
  ('f0000003-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000007', 'f0000003-0000-0000-0000-000000000001', 'EMP-0006', 'Ali Hassan Al-Ghamdi','علي حسن الغامدي',  'Water Technician',       'فني مياه',              'Saudi',    'ali.tech@sada.sa',       '+966501111005', '2020-02-15', 'permanent', 'active'),
  ('f0000003-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000007', 'f0000003-0000-0000-0000-000000000001', 'EMP-0007', 'Fatima Al-Shehri',    'فاطمة الشهري',     'Lab Analyst',            'محللة مختبر',           'Saudi',    'fatima.lab@sada.sa',     '+966501111006', '2022-07-20', 'permanent', 'active'),

  -- Sales & Marketing
  ('f0000004-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000004', NULL,                                   'EMP-0008', 'Nasser Al-Mutairi',   'ناصر المطيري',     'Sales Manager',          'مدير مبيعات',           'Saudi',    'nasser.sales@sada.sa',   '+966501111007', '2020-11-01', 'permanent', 'active'),
  ('f0000004-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000004', 'f0000004-0000-0000-0000-000000000001', 'EMP-0009', 'Reem Al-Harbi',       'ريم الحربي',       'Marketing Specialist',   'أخصائية تسويق',         'Saudi',    'reem.mkt@sada.sa',       '+966501111008', '2023-03-05', 'permanent', 'active'),
  ('f0000004-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000004', 'f0000004-0000-0000-0000-000000000001', 'EMP-0010', 'Sami Al-Zahrani',     'سامي الزهراني',    'Sales Representative',   'مندوب مبيعات',          'Saudi',    'sami.sales@sada.sa',     '+966501111009', '2023-08-15', 'permanent', 'active'),

  -- Finance
  ('f0000005-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000005', NULL,                                   'EMP-0011', 'Turki Al-Anazi',      'تركي العنزي',      'Finance Manager',        'مدير مالي',             'Saudi',    'turki.finance@sada.sa',  '+966501111010', '2018-05-01', 'permanent', 'active'),
  ('f0000005-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000005', 'f0000005-0000-0000-0000-000000000001', 'EMP-0012', 'Hessa Al-Dossari',    'حصة الدوسري',      'Senior Accountant',      'محاسبة أولى',           'Saudi',    'hessa.acc@sada.sa',      '+966501111011', '2021-01-20', 'permanent', 'active'),

  -- HR
  ('f0000006-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000006', NULL,                                   'EMP-0013', 'Dana Al-Rashidi',     'دانا الراشدي',     'HR Manager',             'مديرة موارد بشرية',     'Saudi',    'dana.hr@sada.sa',        '+966501111012', '2019-03-10', 'permanent', 'active'),
  ('f0000006-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000006', 'f0000006-0000-0000-0000-000000000001', 'EMP-0014', 'Lujain Al-Sulami',    'لجين السلمي',      'HR Officer',             'أخصائية موارد بشرية',   'Saudi',    'lujain.hr@sada.sa',      '+966501111013', '2022-09-01', 'permanent', 'active'),

  -- Logistics
  ('f0000007-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000007', 'e0000001-0000-0000-0000-000000000008', NULL,                                   'EMP-0015', 'Saad Al-Malki',       'سعد المالكي',      'Logistics Manager',      'مدير لوجستيات',         'Saudi',    'saad.log@sada.sa',       '+966501111014', '2020-07-15', 'permanent', 'active'),
  ('f0000007-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000007', 'e0000001-0000-0000-0000-000000000008', 'f0000007-0000-0000-0000-000000000001', 'EMP-0016', 'Omar Al-Subaie',      'عمر السبيعي',      'Delivery Driver',        'سائق توصيل',            'Saudi',    'omar.delivery@sada.sa',  '+966501111015', '2023-05-01', 'permanent', 'active'),

  -- Customer Service
  ('f0000008-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000008', NULL,                                   NULL,                                   'EMP-0017', 'Nouf Al-Otaibi',      'نوف العتيبي',      'Customer Service Lead',  'قائدة خدمة العملاء',    'Saudi',    'nouf.cs@sada.sa',        '+966501111016', '2021-11-15', 'permanent', 'active'),
  ('f0000008-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000008', NULL,                                   'f0000008-0000-0000-0000-000000000001', 'EMP-0018', 'Yazeed Al-Qahtani',   'يزيد القحطاني',    'Customer Service Agent', 'موظف خدمة عملاء',       'Saudi',    'yazeed.cs@sada.sa',      '+966501111017', '2024-01-10', 'permanent', 'active'),

  -- Expat employees (adds realism to document expiry tracking)
  ('f0000009-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000007', 'f0000003-0000-0000-0000-000000000001', 'EMP-0019', 'Rajesh Kumar',        'راجيش كومار',      'Water Plant Operator',   'مشغل محطة مياه',        'Indian',   'rajesh.op@sada.sa',      '+966501111018', '2020-04-01', 'permanent', 'active'),
  ('f0000009-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000007', 'e0000001-0000-0000-0000-000000000008', 'f0000007-0000-0000-0000-000000000001', 'EMP-0020', 'John Paul Santos',    'جون بول سانتوس',   'Delivery Coordinator',   'منسق توصيل',            'Filipino', 'john.coord@sada.sa',     '+966501111019', '2021-08-20', 'permanent', 'active')
ON CONFLICT (employee_number) DO NOTHING;

-- ============================================================
-- STEP 7: LEAVE BALANCES FOR ALL SAMPLE EMPLOYEES
-- ============================================================

INSERT INTO leave_balances (employee_id, year, leave_type, entitled_days, taken_days, pending_days, carried_over)
SELECT
  e.id,
  EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  lp.leave_type,
  lp.days_per_year,
  -- Random realistic taken days
  CASE lp.leave_type
    WHEN 'annual' THEN FLOOR(RANDOM() * 12)::INT
    WHEN 'sick'   THEN FLOOR(RANDOM() * 4)::INT
    ELSE 0
  END,
  0, 0
FROM employees e
CROSS JOIN leave_policies lp
WHERE e.company_id = 'a0000000-0000-0000-0000-000000000001'
  AND lp.company_id = 'a0000000-0000-0000-0000-000000000001'
  AND e.id != 'f0000001-0000-0000-0000-000000000001' -- skip Yasar (already done)
ON CONFLICT (employee_id, year, leave_type) DO NOTHING;

-- ============================================================
-- STEP 8: SAMPLE DOCUMENTS WITH EXPIRY DATES
-- Includes some expiring soon so document tracking works
-- ============================================================

INSERT INTO employee_documents (employee_id, doc_type, doc_name, expiry_date, is_verified) VALUES
  -- Yasar
  ('f0000001-0000-0000-0000-000000000001', 'iqama',             'Iqama',                CURRENT_DATE + INTERVAL '180 days', TRUE),
  ('f0000001-0000-0000-0000-000000000001', 'passport',          'Saudi Passport',       CURRENT_DATE + INTERVAL '3 years',  TRUE),
  ('f0000001-0000-0000-0000-000000000001', 'medical_insurance', 'Medical Insurance',    CURRENT_DATE + INTERVAL '8 months', TRUE),

  -- Expats (iqama + passport — these drive the document expiry alerts)
  ('f0000009-0000-0000-0000-000000000001', 'iqama',             'Iqama',                CURRENT_DATE + INTERVAL '25 days',  TRUE),  -- critical!
  ('f0000009-0000-0000-0000-000000000001', 'passport',          'Indian Passport',      CURRENT_DATE + INTERVAL '14 months',TRUE),
  ('f0000009-0000-0000-0000-000000000001', 'medical_insurance', 'Medical Insurance',    CURRENT_DATE + INTERVAL '55 days',  TRUE),  -- warning
  ('f0000009-0000-0000-0000-000000000002', 'iqama',             'Iqama',                CURRENT_DATE + INTERVAL '72 days',  TRUE),  -- warning
  ('f0000009-0000-0000-0000-000000000002', 'passport',          'Philippine Passport',  CURRENT_DATE + INTERVAL '2 years',  TRUE),
  ('f0000009-0000-0000-0000-000000000002', 'medical_insurance', 'Medical Insurance',    CURRENT_DATE + INTERVAL '6 months', TRUE),

  -- Saudi employees
  ('f0000002-0000-0000-0000-000000000001', 'iqama',             'Saudi National ID',    CURRENT_DATE + INTERVAL '2 years',  TRUE),
  ('f0000002-0000-0000-0000-000000000001', 'medical_insurance', 'Medical Insurance',    CURRENT_DATE + INTERVAL '45 days',  TRUE),  -- warning
  ('f0000003-0000-0000-0000-000000000001', 'iqama',             'Saudi National ID',    CURRENT_DATE + INTERVAL '1 year',   TRUE),
  ('f0000003-0000-0000-0000-000000000001', 'medical_insurance', 'Medical Insurance',    CURRENT_DATE + INTERVAL '10 months',TRUE),
  ('f0000005-0000-0000-0000-000000000001', 'iqama',             'Saudi National ID',    CURRENT_DATE + INTERVAL '18 months',TRUE),
  ('f0000005-0000-0000-0000-000000000001', 'medical_insurance', 'Medical Insurance',    CURRENT_DATE + INTERVAL '20 days',  TRUE)   -- critical!
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 9: SAMPLE ATTENDANCE (last 7 days for a few employees)
-- ============================================================

INSERT INTO attendance_logs (employee_id, date, check_in, check_out, hours_worked, status)
SELECT
  emp_id,
  log_date,
  log_date + TIME '08:05:00' + (FLOOR(RANDOM() * 20) || ' minutes')::INTERVAL,
  log_date + TIME '17:00:00' + (FLOOR(RANDOM() * 30) || ' minutes')::INTERVAL,
  8 + ROUND((RANDOM() * 1.5)::NUMERIC, 2),
  'present'
FROM (
  VALUES
    ('f0000002-0000-0000-0000-000000000001'::UUID),
    ('f0000002-0000-0000-0000-000000000002'::UUID),
    ('f0000003-0000-0000-0000-000000000001'::UUID),
    ('f0000004-0000-0000-0000-000000000001'::UUID),
    ('f0000005-0000-0000-0000-000000000001'::UUID)
) AS emps(emp_id)
CROSS JOIN (
  SELECT CURRENT_DATE - n AS log_date
  FROM generate_series(1, 7) AS n
) AS dates
WHERE EXTRACT(DOW FROM log_date) NOT IN (5, 6) -- skip Fri-Sat (weekend in KSA)
ON CONFLICT (employee_id, date) DO NOTHING;

-- ============================================================
-- STEP 10: SAMPLE ANNOUNCEMENTS
-- ============================================================

INSERT INTO announcements (company_id, title_en, title_ar, body_en, body_ar, tag, is_pinned, published_at, posted_by) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Welcome to SA''DA ONE',
    'مرحباً بكم في منصة سعادة ONE',
    'We are excited to launch the new SA''DA ONE platform. All employee services, leave requests, payslips, and HR documents are now available digitally. For any questions, please contact HR.',
    'يسعدنا إطلاق منصة سعادة ONE. جميع خدمات الموظفين وطلبات الإجازات وكشوف الرواتب والوثائق الإدارية متاحة الآن رقمياً.',
    'general', TRUE, NOW() - INTERVAL '1 day',
    'f0000001-0000-0000-0000-000000000001'
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    'Eid Al-Adha Holiday — June 2025',
    'إجازة عيد الأضحى — يونيو 2025',
    'In observance of Eid Al-Adha, the official holiday will be from June 6 to June 12, 2025. Please submit any pending requests before the holiday period.',
    'بمناسبة عيد الأضحى المبارك، تعلن مجموعة سعادة عن إجازة رسمية من 6 يونيو حتى 12 يونيو 2025.',
    'holiday', TRUE, NOW() - INTERVAL '3 days',
    'f0000001-0000-0000-0000-000000000001'
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    'Monthly Payroll — Transfer Completed',
    'الراتب الشهري — اكتمل التحويل',
    'Salaries for this month have been transferred to all employee bank accounts. Please allow 24 hours for the amount to reflect. Check your payslip in the Finance section.',
    'تم تحويل رواتب هذا الشهر إلى حسابات جميع الموظفين البنكية. يرجى الانتظار 24 ساعة لظهور المبلغ.',
    'general', FALSE, NOW() - INTERVAL '5 days',
    'f0000001-0000-0000-0000-000000000001'
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    'Document Expiry Reminder',
    'تذكير بانتهاء صلاحية الوثائق',
    'HR has identified employees with documents expiring within 90 days. Please visit the Documents section to view your expiry dates and coordinate renewal with HR.',
    'رصد قسم الموارد البشرية موظفين لديهم وثائق تنتهي صلاحيتها خلال 90 يوماً. يرجى زيارة قسم الوثائق للاطلاع على تواريخ الانتهاء.',
    'urgent', FALSE, NOW() - INTERVAL '2 days',
    'f0000001-0000-0000-0000-000000000001'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 11: SAMPLE COMPANY POLICIES
-- ============================================================

INSERT INTO company_policies (company_id, title_en, title_ar, category, version, requires_ack, published_at, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Leave & Attendance Policy',     'سياسة الإجازات والحضور',          'HR',       '1.0', TRUE,  NOW() - INTERVAL '30 days', 'f0000001-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'Code of Conduct',               'مدونة قواعد السلوك',               'General',  '1.0', TRUE,  NOW() - INTERVAL '30 days', 'f0000001-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'IT & Data Security Policy',     'سياسة تقنية المعلومات وأمن البيانات','IT',      '1.0', TRUE,  NOW() - INTERVAL '15 days', 'f0000001-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'Health & Safety Policy',        'سياسة الصحة والسلامة',             'Operations','1.0', FALSE, NOW() - INTERVAL '30 days', 'f0000001-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'Loan & Advance Policy',         'سياسة القروض والسلف',              'Finance',  '1.0', FALSE, NOW() - INTERVAL '30 days', 'f0000001-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'Remote Work Policy',            'سياسة العمل عن بعد',               'HR',       '1.0', TRUE,  NOW() - INTERVAL '10 days', 'f0000001-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 12: SAMPLE TRAINING COURSES
-- ============================================================

INSERT INTO training_courses (company_id, title_en, title_ar, provider, category, duration_hours, module_count, is_required) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Saudi Labor Law Essentials',         'أساسيات نظام العمل السعودي',      'HR Team',        'Compliance',  3.0, 4, TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'Workplace Safety & Health',          'السلامة والصحة في بيئة العمل',    'Safety Team',    'Safety',      2.0, 3, TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'Customer Service Excellence',        'التميز في خدمة العملاء',          'External',       'Customer',    4.0, 6, FALSE),
  ('a0000000-0000-0000-0000-000000000001', 'Data Privacy & Cybersecurity',       'خصوصية البيانات والأمن السيبراني','IT Team',        'IT',          2.5, 4, TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'Leadership & Team Management',       'القيادة وإدارة الفرق',            'External',       'Leadership',  8.0, 10, FALSE),
  ('a0000000-0000-0000-0000-000000000001', 'Water Quality Standards (SASO)',     'معايير جودة المياه (ساسو)',       'SA''DA Water',   'Technical',   5.0, 7, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 13: SAMPLE HR REQUESTS (to populate the queue)
-- ============================================================

INSERT INTO hr_requests (employee_id, request_type, purpose, urgency, status) VALUES
  ('f0000002-0000-0000-0000-000000000001', 'experience_letter',   'For bank loan application',  'normal', 'pending'),
  ('f0000003-0000-0000-0000-000000000002', 'salary_certificate',  'For visa application',       'high',   'pending'),
  ('f0000004-0000-0000-0000-000000000002', 'noc_letter',          'For rental contract',        'normal', 'completed'),
  ('f0000009-0000-0000-0000-000000000001', 'employment_letter',   'For iqama renewal',          'urgent', 'processing')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 14: SAMPLE HELP DESK TICKETS
-- ============================================================

INSERT INTO help_desk_tickets (employee_id, category, priority, subject, description, status) VALUES
  ('f0000002-0000-0000-0000-000000000001', 'it_support',          'normal', 'Laptop running slow',             'My laptop has been very slow for the past week. It takes 5+ minutes to boot.', 'open'),
  ('f0000004-0000-0000-0000-000000000002', 'access_permissions',  'high',   'Cannot access CRM system',        'I get an "Access Denied" error when trying to open the CRM. I need it for my daily work.', 'in_progress'),
  ('f0000006-0000-0000-0000-000000000002', 'hr_request',          'low',    'Update emergency contact info',   'I would like to update my emergency contact information in the system.', 'resolved'),
  ('f0000009-0000-0000-0000-000000000001', 'facilities',          'urgent', 'AC not working in water plant',   'The air conditioning unit in the water treatment plant has stopped working. Temperature is very high.', 'open')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 15: DEFAULT CHAT CHANNELS — add all employees as members
-- ============================================================

-- Add all employees to #general and #random
INSERT INTO chat_channel_members (channel_id, employee_id, is_admin)
SELECT
  c.id,
  e.id,
  e.id = 'f0000001-0000-0000-0000-000000000001' -- Yasar is admin
FROM chat_channels c
CROSS JOIN employees e
WHERE c.name IN ('general', 'random')
  AND c.company_id = 'a0000000-0000-0000-0000-000000000001'
  AND e.company_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT (channel_id, employee_id) DO NOTHING;

-- Create division-specific channels
INSERT INTO chat_channels (company_id, name, description, type, created_by, division_id)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  LOWER(REPLACE(d.name_en, ' & ', '-and-')) || '-team',
  d.name_en || ' team channel',
  'private',
  'f0000001-0000-0000-0000-000000000001',
  d.id
FROM divisions d
WHERE d.company_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- Add employees to their division channels
INSERT INTO chat_channel_members (channel_id, employee_id)
SELECT
  c.id,
  e.id
FROM chat_channels c
JOIN employees e ON e.division_id = c.division_id
WHERE c.division_id IS NOT NULL
  AND c.company_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT (channel_id, employee_id) DO NOTHING;

-- Also add Yasar (admin) to all channels
INSERT INTO chat_channel_members (channel_id, employee_id, is_admin)
SELECT c.id, 'f0000001-0000-0000-0000-000000000001', TRUE
FROM chat_channels c
WHERE c.company_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT (channel_id, employee_id) DO NOTHING;

-- ============================================================
-- STEP 16: SAMPLE TASKS PROJECT + TASKS
-- ============================================================

INSERT INTO task_projects (id, company_id, name, description, color, icon, owner_id, division_id) VALUES
  (
    'a1000001-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'SA''DA HR Launch',
    'Tasks for rolling out the HR portal to all employees',
    '#17B8D0',
    'rocket',
    'f0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000005'
  ),
  (
    'a1000001-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Q3 Water Campaign',
    'SA''DA Water marketing and school outreach campaign',
    '#1D9E75',
    'droplet',
    'f0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000003'
  )
ON CONFLICT (id) DO NOTHING;

-- Add Yasar as member of both projects
INSERT INTO task_project_members (project_id, employee_id, role) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'owner'),
  ('a1000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'owner'),
  ('a1000001-0000-0000-0000-000000000001', 'f0000002-0000-0000-0000-000000000001', 'member'),
  ('a1000001-0000-0000-0000-000000000001', 'f0000006-0000-0000-0000-000000000001', 'member'),
  ('a1000001-0000-0000-0000-000000000002', 'f0000004-0000-0000-0000-000000000001', 'member'),
  ('a1000001-0000-0000-0000-000000000002', 'f0000004-0000-0000-0000-000000000002', 'member')
ON CONFLICT (project_id, employee_id) DO NOTHING;

INSERT INTO tasks (project_id, company_id, title, description, priority, status, assignee_id, reporter_id, due_date, position) VALUES
  -- HR Launch project
  ('a1000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Send HR portal invites to all employees', 'Invite all 20 employees via the Admin panel', 'high', 'in_progress',
   'f0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', CURRENT_DATE + 3, 1),

  ('a1000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Upload all employee documents', 'Iqama, passport, insurance for all employees', 'high', 'todo',
   'f0000006-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', CURRENT_DATE + 7, 2),

  ('a1000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Run first payroll on the system', 'Test payroll run for current month', 'urgent', 'todo',
   'f0000005-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', CURRENT_DATE + 14, 3),

  ('a1000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Train HR team on the portal', 'Walkthrough session with Dana and Lujain', 'normal', 'done',
   'f0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', CURRENT_DATE - 2, 4),

  -- Water campaign project
  ('a1000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Prepare school contact database', 'Eastern Province schools — 50 targets', 'normal', 'done',
   'f0000004-0000-0000-0000-000000000002', 'f0000004-0000-0000-0000-000000000001', CURRENT_DATE - 5, 1),

  ('a1000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Design campaign brochure', 'Navy/teal/gold brand — A4 PDF + digital version', 'normal', 'in_progress',
   'f0000004-0000-0000-0000-000000000002', 'f0000004-0000-0000-0000-000000000001', CURRENT_DATE + 5, 2),

  ('a1000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Launch SMS campaign via Taqnyat', 'Send to 1,200 contacts — schools and universities', 'high', 'todo',
   'f0000004-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', CURRENT_DATE + 10, 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICATION — shows what was created
-- ============================================================

SELECT
  '✓ Employees'    AS item, COUNT(*)::TEXT AS count FROM employees    WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT '✓ Divisions',    COUNT(*)::TEXT FROM divisions    WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT '✓ Departments',  COUNT(*)::TEXT FROM departments  WHERE division_id IN (SELECT id FROM divisions WHERE company_id = 'a0000000-0000-0000-0000-000000000001')
UNION ALL SELECT '✓ Announcements',COUNT(*)::TEXT FROM announcements WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT '✓ Policies',     COUNT(*)::TEXT FROM company_policies WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT '✓ HR Requests',  COUNT(*)::TEXT FROM hr_requests  WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'a0000000-0000-0000-0000-000000000001')
UNION ALL SELECT '✓ Tickets',      COUNT(*)::TEXT FROM help_desk_tickets WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'a0000000-0000-0000-0000-000000000001')
UNION ALL SELECT '✓ Chat Channels',COUNT(*)::TEXT FROM chat_channels WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT '✓ Tasks',        COUNT(*)::TEXT FROM tasks        WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT '✓ Training',     COUNT(*)::TEXT FROM training_courses WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT '✓ User Profile', COUNT(*)::TEXT FROM user_profiles WHERE employee_id IN (SELECT id FROM employees WHERE company_id = 'a0000000-0000-0000-0000-000000000001');
