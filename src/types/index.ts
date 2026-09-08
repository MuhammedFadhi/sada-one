export type UserRole = 'employee' | 'manager' | 'hr_officer' | 'finance' | 'admin'

export interface UserProfile {
  id: string
  employee_id: string
  role: UserRole
  is_active: boolean
  language_pref: string
  must_change_password: boolean
  last_login_at?: string
  last_login_device?: string
  failed_attempts: number
  locked_until?: string
  push_token?: string
  created_at: string
  updated_at: string
  employee?: Employee
}

export interface Employee {
  id: string
  company_id: string
  division_id?: string
  department_id?: string
  manager_id?: string
  employee_number: string
  full_name_en: string
  full_name_ar?: string
  job_title_en: string
  job_title_ar?: string
  nationality: string
  gender?: string
  date_of_birth?: string
  work_email: string
  mobile?: string
  join_date: string
  contract_type: string
  status: string
  avatar_url?: string
  division?: { id?: string; name_en: string; name_ar?: string }
  manager?: { full_name_en: string; full_name_ar?: string; job_title_en?: string }
}

export interface LeaveBalance {
  id: string
  employee_id: string
  year: number
  leave_type: string
  entitled_days: number
  taken_days: number
  pending_days: number
  carried_over: number
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  days_count: number
  reason?: string
  status: string
  approver_id?: string
  rejection_reason?: string
  created_at: string
  employee?: Employee
}

export interface AttendanceLog {
  id: string
  employee_id: string
  date: string
  check_in?: string
  check_out?: string
  hours_worked?: number
  status: string
  location_in?: string
  location_out?: string
  break_in?: string
  break_out?: string
  overtime_in?: string
  overtime_out?: string
  break_minutes?: number
  overtime_hours?: number
}

export interface Payslip {
  id: string
  employee_id: string
  payroll_run_id: string
  period: string
  basic_salary: number
  housing_allowance: number
  transport_allowance: number
  other_allowances: number
  gross_salary: number
  deductions: number
  net_salary: number
  loan_deductions?: number
  payment_status?: string
  status: string
  payroll_run?: PayrollRun
}

export interface PayrollRun {
  id: string
  company_id: string
  period: string
  total_amount: number
  total_net?: number
  total_gross?: number
  total_deductions?: number
  month?: number
  year?: number
  transfer_date?: string
  employee_count: number
  status: string
  run_by?: string
  run_at?: string
}

export interface Loan {
  id: string
  employee_id: string
  loan_type: string
  amount: number
  amount_requested?: number
  amount_approved?: number
  installments: number
  repayment_months?: number
  monthly_deduction: number
  remaining_amount?: number
  total_repaid?: number
  reason?: string
  rejection_reason?: string
  status: string
  approved_by?: string
  approved_at?: string
  created_at: string
}

export interface Announcement {
  id: string
  company_id: string
  title_en: string
  title_ar?: string
  body_en: string
  body_ar?: string
  tag: string
  is_pinned: boolean
  published_at: string
  posted_by: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  data?: { link?: string; [k: string]: any }
  is_read: boolean
  created_at: string
}

export interface HelpDeskTicket {
  id: string
  employee_id: string
  ticket_number?: string
  category: string
  priority: string
  subject: string
  description: string
  status: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  company_id: string
  name: string
  asset_number: string
  asset_type: string
  brand?: string
  model?: string
  serial_number?: string
  condition: string
  assigned_date?: string
}

export interface Recognition {
  id: string
  giver_id: string
  receiver_id: string
  type: string
  message: string
  points: number
  is_public: boolean
  created_at: string
  badge_type?: string
  from_employee?: Employee
  to_employee?: Employee
  giver?: Employee
  receiver?: Employee
}

export interface TrainingEnrollment {
  id: string
  employee_id: string
  course_id: string
  status: string
  progress_pct: number
  completed_at?: string
  enrolled_at: string
  certificate_url?: string
  course?: {
    id: string
    title_en: string
    provider?: string
    category?: string
    duration_hours?: number
    is_required?: boolean
  }
}
