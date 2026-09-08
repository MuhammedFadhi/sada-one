-- ============================================================
-- SA'DA HR — Complete Database Schema
-- Supabase / PostgreSQL
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'employee', 'manager', 'hr_officer', 'finance', 'admin', 'director'
);

CREATE TYPE employee_status AS ENUM (
  'active', 'on_leave', 'suspended', 'offboarding', 'terminated'
);

CREATE TYPE contract_type AS ENUM (
  'permanent', 'fixed_term', 'probation', 'contractor'
);

CREATE TYPE gender_type AS ENUM ('male', 'female');

CREATE TYPE leave_type AS ENUM (
  'annual', 'sick', 'emergency', 'maternity', 'paternity', 'hajj', 'unpaid', 'other'
);

CREATE TYPE request_status AS ENUM (
  'pending', 'approved', 'rejected', 'cancelled', 'processing', 'completed'
);

CREATE TYPE attendance_status AS ENUM (
  'present', 'absent', 'late', 'half_day', 'holiday', 'remote', 'on_leave'
);

CREATE TYPE loan_type AS ENUM (
  'salary_advance', 'emergency_loan', 'personal_loan'
);

CREATE TYPE payroll_status AS ENUM (
  'draft', 'pending_approval', 'approved', 'released', 'failed'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'paid', 'failed', 'on_hold'
);

CREATE TYPE termination_reason AS ENUM (
  'resignation', 'contract_end', 'employer_termination', 'mutual_agreement', 'retirement', 'other'
);

CREATE TYPE permit_type AS ENUM ('single', 'multiple');

CREATE TYPE asset_type AS ENUM (
  'laptop', 'mobile', 'vehicle', 'tablet', 'printer', 'equipment', 'other'
);

CREATE TYPE asset_status AS ENUM (
  'available', 'assigned', 'under_repair', 'retired', 'lost'
);

CREATE TYPE asset_condition AS ENUM ('good', 'fair', 'damaged');

CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE ticket_status AS ENUM (
  'open', 'in_progress', 'resolved', 'closed'
);

CREATE TYPE ticket_category AS ENUM (
  'it_support', 'hr_request', 'payroll_issue', 'access_permissions', 'facilities', 'other'
);

CREATE TYPE announcement_tag AS ENUM (
  'holiday', 'policy', 'event', 'urgent', 'general'
);

CREATE TYPE suggestion_status AS ENUM (
  'pending', 'in_review', 'implemented', 'declined'
);

CREATE TYPE hr_request_type AS ENUM (
  'experience_letter', 'salary_certificate', 'noc_letter',
  'salary_advance_letter', 'employment_letter', 'other'
);

CREATE TYPE review_status AS ENUM (
  'draft', 'submitted', 'manager_review', 'final'
);

CREATE TYPE training_status AS ENUM (
  'not_started', 'in_progress', 'completed', 'failed'
);

CREATE TYPE document_type AS ENUM (
  'iqama', 'passport', 'medical_insurance', 'work_contract',
  'degree_certificate', 'background_check', 'driving_license', 'other'
);

CREATE TYPE holiday_type AS ENUM ('national', 'religious', 'company');

CREATE TYPE expense_category AS ENUM (
  'fuel_transport', 'meals_entertainment', 'equipment',
  'travel', 'accommodation', 'medical', 'other'
);

CREATE TYPE language_pref AS ENUM ('ar', 'en');

-- ============================================================
-- COMPANY STRUCTURE
-- ============================================================

CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en             TEXT NOT NULL,
  name_ar             TEXT NOT NULL,
  cr_number           TEXT UNIQUE NOT NULL,
  hq_city             TEXT NOT NULL DEFAULT 'Al Khobar',
  fiscal_year_start   INT NOT NULL DEFAULT 1, -- month 1=Jan
  currency            TEXT NOT NULL DEFAULT 'SAR',
  labor_law_version   TEXT NOT NULL DEFAULT 'Saudi Labor Law 2024',
  logo_url            TEXT,
  primary_color       TEXT DEFAULT '#17B8D0',
  accent_color        TEXT DEFAULT '#C8A96E',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_schedules (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  working_days        INT[] NOT NULL DEFAULT '{0,1,2,3,4}', -- 0=Sun..6=Sat
  start_time          TIME NOT NULL DEFAULT '08:00',
  end_time            TIME NOT NULL DEFAULT '17:00',
  break_minutes       INT DEFAULT 60,
  overtime_multiplier NUMERIC(3,2) DEFAULT 1.5,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE divisions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_en             TEXT NOT NULL,
  name_ar             TEXT NOT NULL,
  head_employee_id    UUID, -- FK added after employees table
  city                TEXT,
  cost_center_code    TEXT UNIQUE,
  max_headcount       INT,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id         UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  name_en             TEXT NOT NULL,
  name_ar             TEXT NOT NULL,
  manager_id          UUID, -- FK added after employees
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================

CREATE TABLE employees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  division_id         UUID REFERENCES divisions(id),
  department_id       UUID REFERENCES departments(id),
  manager_id          UUID REFERENCES employees(id),
  work_schedule_id    UUID REFERENCES work_schedules(id),
  employee_number     TEXT UNIQUE NOT NULL,
  full_name_en        TEXT NOT NULL,
  full_name_ar        TEXT NOT NULL,
  job_title_en        TEXT NOT NULL,
  job_title_ar        TEXT NOT NULL,
  date_of_birth       DATE,
  gender              gender_type,
  nationality         TEXT DEFAULT 'Saudi',
  national_id         TEXT, -- store encrypted at app level
  iqama_number        TEXT,
  iqama_expiry        DATE,
  passport_number     TEXT,
  passport_expiry     DATE,
  work_email          TEXT UNIQUE NOT NULL,
  mobile              TEXT,
  emergency_contact   JSONB DEFAULT '{}', -- {name, relation, mobile}
  join_date           DATE NOT NULL,
  contract_type       contract_type NOT NULL DEFAULT 'permanent',
  contract_end_date   DATE,
  status              employee_status NOT NULL DEFAULT 'active',
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Add deferred FKs now that employees exists
ALTER TABLE divisions ADD CONSTRAINT fk_div_head
  FOREIGN KEY (head_employee_id) REFERENCES employees(id);
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id);

CREATE TABLE employee_salaries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary        NUMERIC(12,2) NOT NULL,
  housing_allowance   NUMERIC(12,2) DEFAULT 0,
  transport_allowance NUMERIC(12,2) DEFAULT 0,
  other_allowances    JSONB DEFAULT '[]', -- [{name, amount}]
  bank_name           TEXT,
  iban                TEXT, -- store encrypted at app level
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  created_by          UUID REFERENCES employees(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employee_documents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type            document_type NOT NULL,
  doc_name            TEXT NOT NULL,
  file_url            TEXT, -- Supabase Storage
  expiry_date         DATE,
  is_verified         BOOLEAN DEFAULT FALSE,
  alert_sent_90d      BOOLEAN DEFAULT FALSE,
  alert_sent_60d      BOOLEAN DEFAULT FALSE,
  alert_sent_30d      BOOLEAN DEFAULT FALSE,
  uploaded_by         UUID REFERENCES employees(id),
  uploaded_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE user_profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id         UUID UNIQUE REFERENCES employees(id),
  role                user_role NOT NULL DEFAULT 'employee',
  is_active           BOOLEAN DEFAULT TRUE,
  two_fa_enabled      BOOLEAN DEFAULT FALSE,
  two_fa_secret       TEXT, -- encrypted
  language_pref       language_pref DEFAULT 'ar',
  last_login_at       TIMESTAMPTZ,
  last_login_device   TEXT,
  last_login_ip       TEXT,
  failed_attempts     INT DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  must_change_password BOOLEAN DEFAULT TRUE, -- true for new accounts
  push_token          TEXT, -- for web push notifications
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invite_tokens (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id),
  token               TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '72 hours',
  used_at             TIMESTAMPTZ,
  created_by          UUID REFERENCES employees(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE & LEAVE
-- ============================================================

CREATE TABLE public_holidays (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_en             TEXT NOT NULL,
  name_ar             TEXT NOT NULL,
  date                DATE NOT NULL,
  year                INT NOT NULL,
  type                holiday_type NOT NULL DEFAULT 'national'
);

CREATE TABLE leave_policies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  leave_type          leave_type NOT NULL,
  days_per_year       INT NOT NULL,
  carries_over        BOOLEAN DEFAULT FALSE,
  max_carryover_days  INT DEFAULT 0,
  requires_approval   BOOLEAN DEFAULT TRUE,
  min_notice_days     INT DEFAULT 1,
  max_consecutive     INT,
  UNIQUE(company_id, leave_type)
);

CREATE TABLE leave_balances (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year                INT NOT NULL,
  leave_type          leave_type NOT NULL,
  entitled_days       NUMERIC(5,2) NOT NULL,
  taken_days          NUMERIC(5,2) DEFAULT 0,
  pending_days        NUMERIC(5,2) DEFAULT 0,
  carried_over        NUMERIC(5,2) DEFAULT 0,
  UNIQUE(employee_id, year, leave_type)
);

-- Computed column via function
CREATE OR REPLACE FUNCTION leave_remaining(lb leave_balances)
RETURNS NUMERIC AS $$
  SELECT lb.entitled_days + lb.carried_over - lb.taken_days - lb.pending_days;
$$ LANGUAGE sql STABLE;

CREATE TABLE leave_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type          leave_type NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  days_count          INT NOT NULL,
  reason              TEXT,
  status              request_status NOT NULL DEFAULT 'pending',
  approved_by         UUID REFERENCES employees(id),
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  check_in            TIMESTAMPTZ,
  check_out           TIMESTAMPTZ,
  hours_worked        NUMERIC(5,2),
  status              attendance_status NOT NULL DEFAULT 'present',
  check_in_lat        NUMERIC(10,7),
  check_in_lng        NUMERIC(10,7),
  check_out_lat       NUMERIC(10,7),
  check_out_lng       NUMERIC(10,7),
  device_id           TEXT,
  notes               TEXT,
  UNIQUE(employee_id, date)
);

CREATE TABLE overtime_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  hours               NUMERIC(4,2) NOT NULL,
  project_code        TEXT,
  reason              TEXT,
  amount_payable      NUMERIC(10,2),
  status              request_status DEFAULT 'pending',
  approved_by         UUID REFERENCES employees(id),
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYROLL & FINANCE
-- ============================================================

CREATE TABLE payroll_runs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month               INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                INT NOT NULL,
  total_gross         NUMERIC(14,2) DEFAULT 0,
  total_deductions    NUMERIC(14,2) DEFAULT 0,
  total_net           NUMERIC(14,2) DEFAULT 0,
  employee_count      INT DEFAULT 0,
  status              payroll_status NOT NULL DEFAULT 'draft',
  notes               TEXT,
  released_by         UUID REFERENCES employees(id),
  released_at         TIMESTAMPTZ,
  transfer_date       DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month, year)
);

CREATE TABLE payslips (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id      UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id         UUID NOT NULL REFERENCES employees(id),
  basic_salary        NUMERIC(12,2) NOT NULL,
  housing_allowance   NUMERIC(12,2) DEFAULT 0,
  transport_allowance NUMERIC(12,2) DEFAULT 0,
  other_allowances    JSONB DEFAULT '[]',
  overtime_amount     NUMERIC(12,2) DEFAULT 0,
  gross_salary        NUMERIC(12,2) NOT NULL,
  loan_deduction      NUMERIC(12,2) DEFAULT 0,
  absence_deduction   NUMERIC(12,2) DEFAULT 0,
  other_deductions    JSONB DEFAULT '[]',
  net_salary          NUMERIC(12,2) NOT NULL,
  payment_status      payment_status DEFAULT 'pending',
  is_on_hold          BOOLEAN DEFAULT FALSE,
  hold_reason         TEXT,
  pdf_url             TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, employee_id)
);

CREATE TABLE loans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  loan_type           loan_type NOT NULL DEFAULT 'salary_advance',
  amount_requested    NUMERIC(12,2) NOT NULL,
  amount_approved     NUMERIC(12,2),
  repayment_months    INT NOT NULL,
  monthly_deduction   NUMERIC(12,2),
  total_repaid        NUMERIC(12,2) DEFAULT 0,
  reason              TEXT,
  status              request_status DEFAULT 'pending',
  manager_approved_by UUID REFERENCES employees(id),
  manager_approved_at TIMESTAMPTZ,
  finance_approved_by UUID REFERENCES employees(id),
  finance_approved_at TIMESTAMPTZ,
  rejection_reason    TEXT,
  disbursed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loan_repayments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id             UUID NOT NULL REFERENCES loans(id),
  payroll_run_id      UUID REFERENCES payroll_runs(id),
  amount              NUMERIC(12,2) NOT NULL,
  repayment_date      DATE NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE end_of_service (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id),
  termination_reason  termination_reason NOT NULL,
  last_working_day    DATE NOT NULL,
  years_of_service    NUMERIC(5,2),
  last_basic_salary   NUMERIC(12,2) NOT NULL,
  gratuity_amount     NUMERIC(12,2),
  unused_leave_days   INT DEFAULT 0,
  unused_leave_amount NUMERIC(12,2) DEFAULT 0,
  outstanding_salary  NUMERIC(12,2) DEFAULT 0,
  loan_deductions     NUMERIC(12,2) DEFAULT 0,
  other_deductions    NUMERIC(12,2) DEFAULT 0,
  total_payable       NUMERIC(12,2),
  status              request_status DEFAULT 'pending',
  approved_by         UUID REFERENCES employees(id),
  approved_at         TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_claims (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  category            expense_category NOT NULL,
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT DEFAULT 'SAR',
  expense_date        DATE NOT NULL,
  description         TEXT NOT NULL,
  receipt_url         TEXT,
  status              request_status DEFAULT 'pending',
  approved_by         UUID REFERENCES employees(id),
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  paid_in_payroll_id  UUID REFERENCES payroll_runs(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HR WORKFLOWS
-- ============================================================

CREATE TABLE hr_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_type        hr_request_type NOT NULL,
  purpose             TEXT,
  urgency             TEXT DEFAULT 'normal' CHECK (urgency IN ('normal','high','urgent')),
  status              request_status DEFAULT 'pending',
  processed_by        UUID REFERENCES employees(id),
  processed_at        TIMESTAMPTZ,
  output_file_url     TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exit_reentry (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  permit_type         permit_type NOT NULL DEFAULT 'single',
  destination_country TEXT NOT NULL,
  departure_date      DATE NOT NULL,
  return_date         DATE NOT NULL,
  travel_reason       leave_type DEFAULT 'annual',
  status              request_status DEFAULT 'pending',
  manager_approved_by UUID REFERENCES employees(id),
  manager_approved_at TIMESTAMPTZ,
  hr_approved_by      UUID REFERENCES employees(id),
  hr_approved_at      TIMESTAMPTZ,
  rejection_reason    TEXT,
  permit_expiry       DATE,
  actual_return_date  DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE onboarding_checklists (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  step_key            TEXT NOT NULL,
  step_label_en       TEXT NOT NULL,
  step_label_ar       TEXT NOT NULL,
  is_completed        BOOLEAN DEFAULT FALSE,
  completed_by        UUID REFERENCES employees(id),
  completed_at        TIMESTAMPTZ,
  notes               TEXT,
  step_order          INT NOT NULL,
  UNIQUE(employee_id, step_key)
);

CREATE TABLE offboarding_checklists (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  step_key            TEXT NOT NULL,
  step_label_en       TEXT NOT NULL,
  step_label_ar       TEXT NOT NULL,
  is_completed        BOOLEAN DEFAULT FALSE,
  completed_by        UUID REFERENCES employees(id),
  completed_at        TIMESTAMPTZ,
  notes               TEXT,
  step_order          INT NOT NULL,
  UNIQUE(employee_id, step_key)
);

-- ============================================================
-- PERFORMANCE
-- ============================================================

CREATE TABLE performance_reviews (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id         UUID REFERENCES employees(id),
  period              TEXT NOT NULL, -- e.g. 'Q2 2024'
  period_start        DATE,
  period_end          DATE,
  self_assessment     JSONB DEFAULT '{}',
  manager_scores      JSONB DEFAULT '{}',
  overall_score       NUMERIC(5,2),
  status              review_status DEFAULT 'draft',
  comments            TEXT,
  submitted_at        TIMESTAMPTZ,
  finalized_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE performance_goals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_id           UUID REFERENCES performance_reviews(id),
  title               TEXT NOT NULL,
  description         TEXT,
  target_date         DATE,
  status              TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started','in_progress','completed','cancelled')),
  progress_pct        INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRAINING & ASSETS
-- ============================================================

CREATE TABLE training_courses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id),
  title_en            TEXT NOT NULL,
  title_ar            TEXT NOT NULL,
  provider            TEXT,
  category            TEXT,
  description         TEXT,
  duration_hours      NUMERIC(5,2),
  module_count        INT DEFAULT 1,
  is_required         BOOLEAN DEFAULT FALSE,
  due_date            DATE,
  thumbnail_url       TEXT,
  content_url         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_enrollments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES training_courses(id),
  progress_pct        INT DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  status              training_status DEFAULT 'not_started',
  enrolled_at         TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  certificate_url     TEXT,
  score               INT,
  UNIQUE(employee_id, course_id)
);

CREATE TABLE assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id),
  asset_type          asset_type NOT NULL,
  asset_number        TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  brand               TEXT,
  model               TEXT,
  serial_number       TEXT,
  purchase_date       DATE,
  purchase_value      NUMERIC(12,2),
  assigned_to         UUID REFERENCES employees(id),
  assigned_date       DATE,
  condition           asset_condition DEFAULT 'good',
  status              asset_status DEFAULT 'available',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asset_history (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id            UUID NOT NULL REFERENCES assets(id),
  employee_id         UUID REFERENCES employees(id),
  action              TEXT NOT NULL, -- 'assigned','returned','repaired','reported_lost'
  notes               TEXT,
  actioned_by         UUID REFERENCES employees(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENGAGEMENT
-- ============================================================

CREATE TABLE recognitions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_employee_id    UUID NOT NULL REFERENCES employees(id),
  to_employee_id      UUID NOT NULL REFERENCES employees(id),
  badge_type          TEXT NOT NULL, -- 'above_beyond','team_player','innovator','goal_crusher','leadership'
  message             TEXT NOT NULL,
  points_awarded      INT DEFAULT 10,
  is_manager_award    BOOLEAN DEFAULT FALSE,
  is_public           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recognition_points (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) UNIQUE,
  total_points        INT DEFAULT 0,
  this_month_points   INT DEFAULT 0,
  this_quarter_points INT DEFAULT 0,
  last_updated        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suggestions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- NO employee_id — fully anonymous
  category            TEXT NOT NULL,
  content             TEXT NOT NULL,
  status              suggestion_status DEFAULT 'pending',
  management_response TEXT,
  responded_by        UUID REFERENCES employees(id),
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HELP DESK
-- ============================================================

CREATE TABLE help_desk_tickets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  ticket_number       TEXT UNIQUE NOT NULL,
  category            ticket_category NOT NULL,
  priority            ticket_priority DEFAULT 'normal',
  subject             TEXT NOT NULL,
  description         TEXT NOT NULL,
  attachment_url      TEXT,
  status              ticket_status DEFAULT 'open',
  assigned_to         UUID REFERENCES employees(id),
  resolution_notes    TEXT,
  resolved_at         TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_comments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id           UUID NOT NULL REFERENCES help_desk_tickets(id) ON DELETE CASCADE,
  author_id           UUID NOT NULL REFERENCES employees(id),
  content             TEXT NOT NULL,
  is_internal         BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate ticket number
CREATE SEQUENCE ticket_number_seq START 1000;
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON help_desk_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- ============================================================
-- COMMUNICATION
-- ============================================================

CREATE TABLE announcements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id),
  title_en            TEXT NOT NULL,
  title_ar            TEXT NOT NULL,
  body_en             TEXT NOT NULL,
  body_ar             TEXT NOT NULL,
  tag                 announcement_tag DEFAULT 'general',
  target_roles        user_role[],       -- NULL = all roles
  target_divisions    UUID[],            -- NULL = all divisions
  is_pinned           BOOLEAN DEFAULT FALSE,
  published_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,
  posted_by           UUID REFERENCES employees(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE company_policies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id),
  title_en            TEXT NOT NULL,
  title_ar            TEXT NOT NULL,
  category            TEXT NOT NULL,
  version             TEXT DEFAULT '1.0',
  file_url            TEXT,
  requires_ack        BOOLEAN DEFAULT FALSE,
  ack_deadline        DATE,
  published_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES employees(id)
);

CREATE TABLE policy_acknowledgements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id           UUID NOT NULL REFERENCES company_policies(id),
  employee_id         UUID NOT NULL REFERENCES employees(id),
  acknowledged_at     TIMESTAMPTZ DEFAULT NOW(),
  ip_address          TEXT,
  device_info         TEXT,
  UNIQUE(policy_id, employee_id)
);

CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  data                JSONB DEFAULT '{}', -- deep link params
  is_read             BOOLEAN DEFAULT FALSE,
  sent_via_push       BOOLEAN DEFAULT FALSE,
  sent_via_sms        BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (IMMUTABLE)
-- ============================================================

CREATE TABLE audit_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id),
  employee_id         UUID REFERENCES employees(id),
  action              TEXT NOT NULL,
  table_name          TEXT NOT NULL,
  record_id           UUID,
  old_values          JSONB,
  new_values          JSONB,
  ip_address          TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Make audit_logs append-only
CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ============================================================
-- INDEXES (performance)
-- ============================================================

CREATE INDEX idx_employees_company     ON employees(company_id, status);
CREATE INDEX idx_employees_manager     ON employees(manager_id);
CREATE INDEX idx_employees_division    ON employees(division_id);
CREATE INDEX idx_employees_email       ON employees(work_email);
CREATE INDEX idx_att_employee_date     ON attendance_logs(employee_id, date DESC);
CREATE INDEX idx_leave_req_employee    ON leave_requests(employee_id, status);
CREATE INDEX idx_leave_req_status      ON leave_requests(status, created_at DESC);
CREATE INDEX idx_doc_expiry            ON employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_payslip_employee      ON payslips(employee_id);
CREATE INDEX idx_payslip_run           ON payslips(payroll_run_id);
CREATE INDEX idx_loans_employee        ON loans(employee_id, status);
CREATE INDEX idx_audit_user_time       ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_table           ON audit_logs(table_name, created_at DESC);
CREATE INDEX idx_notif_user_unread     ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_tickets_employee      ON help_desk_tickets(employee_id, status);
CREATE INDEX idx_announcements_company ON announcements(company_id, published_at DESC);
CREATE INDEX idx_recog_to_employee     ON recognitions(to_employee_id, created_at DESC);
CREATE INDEX idx_training_employee     ON training_enrollments(employee_id, status);

-- ============================================================
-- AUDIT TRIGGER FUNCTION
-- Automatically logs INSERT/UPDATE/DELETE on sensitive tables
-- ============================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    action, table_name, record_id,
    old_values, new_values
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to all sensitive tables
DO $$
DECLARE
  tbl TEXT;
  sensitive_tables TEXT[] := ARRAY[
    'employees','employee_salaries','payroll_runs','payslips',
    'loans','end_of_service','leave_requests','user_profiles',
    'hr_requests','exit_reentry','expense_claims'
  ];
BEGIN
  FOREACH tbl IN ARRAY sensitive_tables LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION audit_trigger_func()', tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- EOS CALCULATION FUNCTION (Saudi Labor Law Article 84)
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_eos(
  p_join_date         DATE,
  p_last_day          DATE,
  p_basic_salary      NUMERIC,
  p_termination_reason termination_reason,
  p_unused_leave_days  INT DEFAULT 0,
  p_outstanding_salary NUMERIC DEFAULT 0,
  p_loan_deductions   NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_years       NUMERIC;
  v_months      NUMERIC;
  v_gratuity    NUMERIC := 0;
  v_daily_rate  NUMERIC;
  v_leave_pay   NUMERIC;
  v_total       NUMERIC;
BEGIN
  v_years  := EXTRACT(YEAR FROM AGE(p_last_day, p_join_date));
  v_months := EXTRACT(MONTH FROM AGE(p_last_day, p_join_date));
  v_daily_rate := p_basic_salary / 30;

  -- Saudi Labor Law: 1/3 salary per year for first 5 years
  -- 2/3 salary per year for years beyond 5
  -- Only if NOT terminated for cause
  IF p_termination_reason != 'employer_termination' OR
     (p_termination_reason = 'employer_termination') THEN

    IF v_years >= 5 THEN
      v_gratuity := (p_basic_salary / 3 * 5) +
                    ((p_basic_salary * 2 / 3) * (v_years - 5 + v_months / 12));
    ELSE
      v_gratuity := p_basic_salary / 3 * (v_years + v_months / 12);
    END IF;

    -- Resignation < 2 years = 0 gratuity
    IF p_termination_reason = 'resignation' AND
       (v_years < 2) THEN
      v_gratuity := 0;
    END IF;
    -- Resignation 2-5 years = 1/3 gratuity
    IF p_termination_reason = 'resignation' AND
       v_years >= 2 AND v_years < 5 THEN
      v_gratuity := v_gratuity / 3;
    END IF;
    -- Resignation 5-10 years = 2/3 gratuity
    IF p_termination_reason = 'resignation' AND
       v_years >= 5 AND v_years < 10 THEN
      v_gratuity := v_gratuity * 2 / 3;
    END IF;
  END IF;

  v_leave_pay := v_daily_rate * p_unused_leave_days;
  v_total     := v_gratuity + v_leave_pay + p_outstanding_salary - p_loan_deductions;

  RETURN jsonb_build_object(
    'years_of_service',    ROUND(v_years + v_months/12, 2),
    'gratuity_amount',     ROUND(v_gratuity, 2),
    'unused_leave_amount', ROUND(v_leave_pay, 2),
    'outstanding_salary',  ROUND(p_outstanding_salary, 2),
    'loan_deductions',     ROUND(p_loan_deductions, 2),
    'total_payable',       ROUND(v_total, 2),
    'daily_rate',          ROUND(v_daily_rate, 2)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE companies                ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees                ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salaries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_of_service           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_reentry             ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists    ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_checklists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognitions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_points       ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_desk_tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_policies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_acknowledgements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get current user's employee id
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID AS $$
  SELECT employee_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get current user's manager id
CREATE OR REPLACE FUNCTION current_manager_id()
RETURNS UUID AS $$
  SELECT manager_id FROM employees WHERE id = (
    SELECT employee_id FROM user_profiles WHERE id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: is current user in elevated role
CREATE OR REPLACE FUNCTION is_elevated()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('hr_officer','finance','admin','director','manager');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── COMPANIES ──
CREATE POLICY "company_select" ON companies FOR SELECT
  TO authenticated USING (TRUE);
CREATE POLICY "company_update" ON companies FOR UPDATE
  TO authenticated USING (current_user_role() = 'admin');

-- ── DIVISIONS & DEPARTMENTS ──
CREATE POLICY "divisions_select" ON divisions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "divisions_write" ON divisions FOR ALL TO authenticated
  USING (current_user_role() = 'admin');
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "departments_write" ON departments FOR ALL TO authenticated
  USING (current_user_role() = 'admin');

-- ── EMPLOYEES ──
-- Employees see own record; managers see their team; HR/Finance/Admin see all
CREATE POLICY "employees_select_own" ON employees FOR SELECT TO authenticated
  USING (
    id = current_employee_id()
    OR manager_id = current_employee_id()
    OR current_user_role() IN ('hr_officer','finance','admin','director')
  );
CREATE POLICY "employees_insert" ON employees FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('hr_officer','admin'));
CREATE POLICY "employees_update" ON employees FOR UPDATE TO authenticated
  USING (
    id = current_employee_id()
    OR current_user_role() IN ('hr_officer','admin')
  );

-- ── EMPLOYEE SALARIES (Finance + Admin only) ──
CREATE POLICY "salaries_select" ON employee_salaries FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR current_user_role() IN ('finance','admin')
  );
CREATE POLICY "salaries_write" ON employee_salaries FOR ALL TO authenticated
  USING (current_user_role() IN ('finance','admin'));

-- ── EMPLOYEE DOCUMENTS ──
CREATE POLICY "docs_select" ON employee_documents FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR current_user_role() IN ('hr_officer','admin')
  );
CREATE POLICY "docs_write" ON employee_documents FOR ALL TO authenticated
  USING (current_user_role() IN ('hr_officer','admin'));

-- ── USER PROFILES ──
CREATE POLICY "profiles_select_own" ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR current_user_role() = 'admin');
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR current_user_role() = 'admin');
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'admin' OR id = auth.uid());

-- ── LEAVE BALANCES ──
CREATE POLICY "leave_bal_select" ON leave_balances FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = leave_balances.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','admin','director')
  );

-- ── LEAVE REQUESTS ──
CREATE POLICY "leave_req_select" ON leave_requests FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = leave_requests.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','admin','director')
  );
CREATE POLICY "leave_req_insert" ON leave_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id() OR current_user_role() = 'hr_officer');
CREATE POLICY "leave_req_update" ON leave_requests FOR UPDATE TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = leave_requests.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','admin')
  );

-- ── ATTENDANCE ──
CREATE POLICY "att_select" ON attendance_logs FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = attendance_logs.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','admin','director')
  );
CREATE POLICY "att_insert" ON attendance_logs FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id() OR current_user_role() = 'hr_officer');

-- ── PAYROLL (Finance + Admin) ──
CREATE POLICY "payroll_runs_select" ON payroll_runs FOR SELECT TO authenticated
  USING (current_user_role() IN ('finance','admin','director'));
CREATE POLICY "payroll_runs_write" ON payroll_runs FOR ALL TO authenticated
  USING (current_user_role() IN ('finance','admin'));

-- ── PAYSLIPS ──
CREATE POLICY "payslips_select" ON payslips FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR current_user_role() IN ('finance','admin')
  );

-- ── LOANS ──
CREATE POLICY "loans_select" ON loans FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = loans.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('finance','admin','director')
  );
CREATE POLICY "loans_insert" ON loans FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id());
CREATE POLICY "loans_update" ON loans FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees WHERE id = loans.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('finance','admin')
  );

-- ── END OF SERVICE ──
CREATE POLICY "eos_select" ON end_of_service FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR current_user_role() IN ('finance','hr_officer','admin')
  );
CREATE POLICY "eos_write" ON end_of_service FOR ALL TO authenticated
  USING (current_user_role() IN ('finance','hr_officer','admin'));

-- ── EXPENSE CLAIMS ──
CREATE POLICY "expense_select" ON expense_claims FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = expense_claims.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('finance','admin')
  );
CREATE POLICY "expense_insert" ON expense_claims FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id());
CREATE POLICY "expense_update" ON expense_claims FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees WHERE id = expense_claims.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('finance','admin')
  );

-- ── HR REQUESTS ──
CREATE POLICY "hr_req_select" ON hr_requests FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR current_user_role() IN ('hr_officer','admin')
  );
CREATE POLICY "hr_req_insert" ON hr_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id());
CREATE POLICY "hr_req_update" ON hr_requests FOR UPDATE TO authenticated
  USING (current_user_role() IN ('hr_officer','admin'));

-- ── EXIT RE-ENTRY ──
CREATE POLICY "exit_select" ON exit_reentry FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM employees WHERE id = exit_reentry.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','admin')
  );
CREATE POLICY "exit_insert" ON exit_reentry FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id());
CREATE POLICY "exit_update" ON exit_reentry FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees WHERE id = exit_reentry.employee_id AND manager_id = current_employee_id())
    OR current_user_role() IN ('hr_officer','admin')
  );

-- ── PERFORMANCE ──
CREATE POLICY "perf_select" ON performance_reviews FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR reviewer_id = current_employee_id()
    OR current_user_role() IN ('hr_officer','admin','director')
  );

-- ── TRAINING ──
CREATE POLICY "courses_select" ON training_courses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "enrollment_select" ON training_enrollments FOR SELECT TO authenticated
  USING (employee_id = current_employee_id() OR current_user_role() IN ('hr_officer','admin'));

-- ── ASSETS ──
CREATE POLICY "assets_select" ON assets FOR SELECT TO authenticated
  USING (
    assigned_to = current_employee_id()
    OR current_user_role() IN ('hr_officer','admin')
  );

-- ── RECOGNITIONS ──
CREATE POLICY "recog_select" ON recognitions FOR SELECT TO authenticated
  USING (is_public = TRUE OR to_employee_id = current_employee_id() OR from_employee_id = current_employee_id());
CREATE POLICY "recog_insert" ON recognitions FOR INSERT TO authenticated
  WITH CHECK (from_employee_id = current_employee_id());

-- ── SUGGESTIONS (truly anonymous — no employee link) ──
CREATE POLICY "suggestions_insert" ON suggestions FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "suggestions_select" ON suggestions FOR SELECT TO authenticated
  USING (current_user_role() IN ('hr_officer','admin') OR status IN ('implemented','in_review'));

-- ── HELP DESK ──
CREATE POLICY "tickets_select" ON help_desk_tickets FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR current_user_role() IN ('hr_officer','admin')
  );
CREATE POLICY "tickets_insert" ON help_desk_tickets FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id());

-- ── ANNOUNCEMENTS ──
CREATE POLICY "ann_select" ON announcements FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "ann_write" ON announcements FOR ALL TO authenticated
  USING (current_user_role() IN ('hr_officer','admin'));

-- ── POLICIES ──
CREATE POLICY "policies_select" ON company_policies FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "policies_write" ON company_policies FOR ALL TO authenticated
  USING (current_user_role() IN ('hr_officer','admin'));

-- ── POLICY ACKNOWLEDGEMENTS ──
CREATE POLICY "ack_select" ON policy_acknowledgements FOR SELECT TO authenticated
  USING (employee_id = current_employee_id() OR current_user_role() IN ('hr_officer','admin'));
CREATE POLICY "ack_insert" ON policy_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id());

-- ── NOTIFICATIONS ──
CREATE POLICY "notif_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── AUDIT LOGS ──
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO authenticated
  USING (current_user_role() = 'admin');

-- ── PUBLIC (read-only) ──
CREATE POLICY "holidays_select" ON public_holidays FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "leave_pol_select" ON leave_policies FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "work_sched_select" ON work_schedules FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- DEFAULT SEED DATA
-- ============================================================

-- Insert SA'DA Group company
INSERT INTO companies (id, name_en, name_ar, cr_number, hq_city)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SA''DA Group',
  'مجموعة سعادة',
  '2000000000',
  'Al Khobar'
);

-- Default work schedule (Sun-Thu, 8am-5pm)
INSERT INTO work_schedules (company_id, name, working_days, start_time, end_time)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Standard Schedule',
  '{0,1,2,3,4}',
  '08:00', '17:00'
);

-- Leave policies per Saudi Labor Law
INSERT INTO leave_policies (company_id, leave_type, days_per_year, carries_over, requires_approval)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'annual',    30, TRUE,  TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'sick',      14, FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'emergency',  3, FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'maternity', 70, FALSE, TRUE), -- 10 weeks
  ('a0000000-0000-0000-0000-000000000001', 'paternity',  3, FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'hajj',      15, FALSE, TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'unpaid',     0, FALSE, TRUE);

-- Saudi public holidays 2024
INSERT INTO public_holidays (company_id, name_en, name_ar, date, year, type) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Founding Day',   'يوم التأسيس',     '2024-02-22', 2024, 'national'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Fitr 1',  'عيد الفطر 1',    '2024-04-09', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Fitr 2',  'عيد الفطر 2',    '2024-04-10', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Fitr 3',  'عيد الفطر 3',    '2024-04-11', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Fitr 4',  'عيد الفطر 4',    '2024-04-12', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Fitr 5',  'عيد الفطر 5',    '2024-04-13', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Adha 1',  'عيد الأضحى 1',   '2024-06-16', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Adha 2',  'عيد الأضحى 2',   '2024-06-17', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Adha 3',  'عيد الأضحى 3',   '2024-06-18', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'Eid Al Adha 4',  'عيد الأضحى 4',   '2024-06-19', 2024, 'religious'),
  ('a0000000-0000-0000-0000-000000000001', 'National Day',   'اليوم الوطني',    '2024-09-23', 2024, 'national');

-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
