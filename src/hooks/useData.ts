// ============================================================
// SA'DA ONE — Data Hooks
// All Supabase queries used across the app
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { enqueue as offlineEnqueue, isNetworkError } from '@/lib/offlineQueue'
import type {
  Employee, LeaveRequest, LeaveBalance, AttendanceLog,
  Payslip, Loan, Announcement, Notification, HelpDeskTicket,
  Asset, Recognition, TrainingEnrollment, PayrollRun,
} from '@/types/index'

// ── KEYS ──────────────────────────────────────────────────
export const KEYS = {
  employees:        ['employees'],
  employee:         (id: string) => ['employee', id],
  myProfile:        ['my-profile'],
  leaveBalances:    (empId: string) => ['leave-balances', empId],
  leaveRequests:    (empId?: string) => ['leave-requests', empId],
  attendance:       (empId: string, month?: string) => ['attendance', empId, month],
  payslips:         (empId: string) => ['payslips', empId],
  payrollRuns:      ['payroll-runs'],
  loans:            (empId?: string) => ['loans', empId],
  announcements:    ['announcements'],
  notifications:    ['notifications'],
  tickets:          (empId?: string) => ['tickets', empId],
  assets:           (empId?: string) => ['assets', empId],
  recognitions:     (empId?: string) => ['recognitions', empId],
  training:         (empId: string) => ['training', empId],
  hrRequests:       (empId?: string) => ['hr-requests', empId],
  onboarding:       (empId: string) => ['onboarding', empId],
  teamAttendance:   (mgrid: string) => ['team-attendance', mgrid],
  pendingApprovals: ['pending-approvals'],
  documents:        (empId: string) => ['documents', empId],
  policies:         ['policies'],
  suggestions:      ['suggestions'],
}

// ── EMPLOYEES ─────────────────────────────────────────────

export function useEmployees(filters?: { division_id?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: [...KEYS.employees, filters],
    queryFn: async () => {
      let q = supabase
        .from('employees')
        .select(`*, division:divisions!division_id(name_en, name_ar), manager:employees!manager_id(full_name_en)`)
        .order('full_name_en')

      if (filters?.division_id) q = q.eq('division_id', filters.division_id)
      if (filters?.status)      q = q.eq('status', filters.status)
      if (filters?.search)      q = q.ilike('full_name_en', `%${filters.search}%`)

      const { data, error } = await q
      if (error) throw error
      return data as Employee[]
    }
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: KEYS.employee(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          division:divisions!division_id(*),
          department:departments!department_id(*),
          manager:employees!manager_id(id, full_name_en, full_name_ar, job_title_en),
          salary:employee_salaries!employee_id(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Employee> & Record<string, any>) => {
      // Identifying PII lives in the locked employee_private table, not employees.
      const { national_id, iqama_number, passport_number, emergency_contact, ...empData } = data as any
      const { data: emp, error } = await supabase
        .from('employees')
        .insert(empData)
        .select()
        .single()
      if (error) throw error
      const hasPii = national_id || iqama_number || passport_number ||
        (emergency_contact && Object.keys(emergency_contact || {}).length > 0)
      if (hasPii) {
        // best-effort: never block employee creation on the private write
        await supabase.from('employee_private').upsert({
          employee_id: emp.id, national_id, iqama_number, passport_number, emergency_contact,
        }).then(() => {}, () => {})
      }
      return emp
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.employees })
  })
}

export function useEmployeePrivate(employeeId?: string) {
  return useQuery({
    queryKey: ['employee-private', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_private')
        .select('national_id, iqama_number, passport_number, emergency_contact')
        .eq('employee_id', employeeId)
        .maybeSingle()
      return data
    },
  })
}

export function useTasksRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const ch = supabase
      .channel('tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        qc.invalidateQueries({ queryKey: ['my-tasks'] })
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['project-tasks'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])
}

// Keeps the chat channel LIST live (new messages, unread state, new channels).
// The open chat room has its own subscription; this covers everything else.
export function useChatChannelsRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const inval = () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    }
    const ch = supabase
      .channel('chat-list-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, inval)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_channel_members' }, inval)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const { error } = await supabase.from('employees').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.employees })
      qc.invalidateQueries({ queryKey: KEYS.employee(id) })
    }
  })
}

// ── LEAVE ─────────────────────────────────────────────────

export function useLeaveBalances(employeeId: string, year = new Date().getFullYear()) {
  return useQuery({
    queryKey: [...KEYS.leaveBalances(employeeId), year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', year)
      if (error) throw error
      return data as LeaveBalance[]
    },
    enabled: !!employeeId
  })
}

export function useLeaveRequests(employeeId?: string) {
  return useQuery({
    queryKey: KEYS.leaveRequests(employeeId),
    queryFn: async () => {
      let q = supabase
        .from('leave_requests')
        .select(`*, employee:employees!employee_id(full_name_en, full_name_ar, job_title_en, division:divisions!division_id(name_en))`)
        .order('created_at', { ascending: false })

      if (employeeId) q = q.eq('employee_id', employeeId)

      const { data, error } = await q
      if (error) throw error
      return data as LeaveRequest[]
    }
  })
}

export function useSubmitLeave() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (data: {
      leave_type: string
      start_date: string
      end_date: string
      days_count: number
      reason?: string
    }) => {
      const payload = {
        ...data,
        employee_id: profile?.employee_id,
        // Two-stage flow: manager first, then HR & Finance.
        // No manager assigned -> goes straight to HR & Finance stage.
        status: 'pending', // 035 flat hierarchy: always stage-1 (any manager), then HR/Finance
      }
      try {
        const { error } = await supabase.from('leave_requests').insert(payload)
        if (error) throw error
      } catch (err) {
        if (isNetworkError(err)) { offlineEnqueue('leave_request', payload); return }
        throw err
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.leaveRequests(profile?.employee_id) })
  })
}

export function useApproveLeave() {
  const generic = useApproveRequest()
  return {
    ...generic,
    mutate:      (v: { id: string; action: 'approved' | 'rejected'; rejection_reason?: string; currentStatus?: string }) =>
      generic.mutate({ table: 'leave_requests', id: v.id, action: v.action === 'approved' ? 'approve' : 'reject', currentStatus: v.currentStatus ?? 'pending', rejection_reason: v.rejection_reason }),
    mutateAsync: (v: { id: string; action: 'approved' | 'rejected'; rejection_reason?: string; currentStatus?: string }) =>
      generic.mutateAsync({ table: 'leave_requests', id: v.id, action: v.action === 'approved' ? 'approve' : 'reject', currentStatus: v.currentStatus ?? 'pending', rejection_reason: v.rejection_reason }),
  }
}

// ── ATTENDANCE ────────────────────────────────────────────

export function useAttendance(employeeId: string, month?: string) {
  return useQuery({
    queryKey: KEYS.attendance(employeeId, month),
    queryFn: async () => {
      let q = supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false })

      if (month) {
        const [y, m] = month.split('-').map(Number)
        const start = `${month}-01`
        // real last day of the month — avoids "2026-06-31" → 22008 out-of-range
        const end = new Date(y, m, 0).toISOString().split('T')[0]
        q = q.gte('date', start).lte('date', end)
      }

      const { data, error } = await q
      if (error) throw error
      return data as AttendanceLog[]
    },
    enabled: !!employeeId
  })
}

export function useCheckIn() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async ({ lat, lng }: { lat?: number; lng?: number }) => {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()
      const payload = {
        employee_id:  profile?.employee_id,
        date:         today,
        check_in:     now,
        check_in_lat: lat,
        check_in_lng: lng,
        status:       'present',
      }
      try {
        const { error } = await supabase.from('attendance_logs').upsert(payload, { onConflict: 'employee_id,date' })
        if (error) throw error
      } catch (err) {
        if (isNetworkError(err)) { offlineEnqueue('check_in', payload); return }
        throw err
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] })
  })
}

export function useCheckOut() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()
      // If offline, skip the read and queue the checkout (hours computed on replay).
      if (!navigator.onLine) { offlineEnqueue('check_out', { employee_id: profile?.employee_id, date: today, check_out: now.toISOString() }); return }
      try {
        const { data: log } = await supabase
          .from('attendance_logs')
          .select('check_in')
          .eq('employee_id', profile?.employee_id)
          .eq('date', today)
          .single()
        const checkIn = log?.check_in ? new Date(log.check_in) : now
        const hours = (now.getTime() - checkIn.getTime()) / 1000 / 3600
        const { error } = await supabase
          .from('attendance_logs')
          .update({ check_out: now.toISOString(), hours_worked: Math.round(hours * 100) / 100 })
          .eq('employee_id', profile?.employee_id)
          .eq('date', today)
        if (error) throw error
      } catch (err) {
        if (isNetworkError(err)) { offlineEnqueue('check_out', { employee_id: profile?.employee_id, date: today, check_out: now.toISOString() }); return }
        throw err
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] })
  })
}

// ── WORK SITES (geofencing) ───────────────────────────────
export function useWorkSites() {
  return useQuery({
    queryKey: ['work-sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_sites')
        .select('id,name,city,latitude,longitude,radius_m,is_active').order('name')
      if (error) throw error
      return (data ?? []).map(s => ({ ...s, latitude: Number(s.latitude), longitude: Number(s.longitude), radius_m: Number(s.radius_m) }))
    }
  })
}

export function useSaveWorkSite() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (site: { id?: string; name: string; city?: string; latitude: number; longitude: number; radius_m: number; is_active: boolean }) => {
      if (site.id) {
        const { id, ...patch } = site
        const { error } = await supabase.from('work_sites').update(patch).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('work_sites').insert({ ...site, company_id: profile?.employee?.company_id })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-sites'] })
  })
}

export function useDeleteWorkSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('work_sites').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-sites'] })
  })
}

// Break + overtime punches (geo-aware). type: 'break_in'|'break_out'|'overtime_in'|'overtime_out'
export function usePunch() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async ({ type, lat, lng }: { type: 'break_in' | 'break_out' | 'overtime_in' | 'overtime_out'; lat?: number; lng?: number }) => {
      const today = new Date().toISOString().split('T')[0]
      const nowIso = new Date().toISOString()
      // read current row to compute derived durations
      const { data: log } = await supabase.from('attendance_logs')
        .select('break_in, break_out, overtime_in, overtime_out, break_minutes, overtime_hours')
        .eq('employee_id', profile?.employee_id).eq('date', today).maybeSingle()

      const patch: Record<string, any> = { [type]: nowIso }

      if (type === 'break_out' && log?.break_in) {
        const mins = (Date.now() - new Date(log.break_in).getTime()) / 60000
        patch.break_minutes = Math.round(((log.break_minutes ?? 0) + mins) * 100) / 100
      }
      if (type === 'overtime_out' && log?.overtime_in) {
        const hrs = (Date.now() - new Date(log.overtime_in).getTime()) / 3600000
        patch.overtime_hours = Math.round(((log.overtime_hours ?? 0) + hrs) * 100) / 100
      }
      if ((type === 'break_in' || type === 'overtime_in') && lat != null) {
        patch.check_in_lat = lat; patch.check_in_lng = lng
      }

      const { error } = await supabase.from('attendance_logs')
        .upsert({ employee_id: profile?.employee_id, date: today, status: 'present', ...patch },
          { onConflict: 'employee_id,date' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] })
  })
}

// ── PAYSLIPS ──────────────────────────────────────────────

export function usePayslips(employeeId: string) {
  return useQuery({
    queryKey: KEYS.payslips(employeeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*, payroll_run:payroll_runs(month, year, transfer_date)')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Payslip[]
    },
    enabled: !!employeeId
  })
}

export function usePayrollRuns() {
  return useQuery({
    queryKey: KEYS.payrollRuns,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      if (error) throw error
      return data as PayrollRun[]
    }
  })
}

// ── LOANS ─────────────────────────────────────────────────

export function useLoans(employeeId?: string) {
  return useQuery({
    queryKey: KEYS.loans(employeeId),
    queryFn: async () => {
      let q = supabase
        .from('loans')
        .select(`*, employee:employees!employee_id(full_name_en, job_title_en, division:divisions!division_id(name_en))`)
        .order('created_at', { ascending: false })
      if (employeeId) q = q.eq('employee_id', employeeId)
      const { data, error } = await q
      if (error) throw error
      return data as Loan[]
    }
  })
}

export function useApplyLoan() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (data: {
      loan_type: string
      amount_requested: number
      repayment_months: number
      reason?: string
    }) => {
      const { error } = await supabase.from('loans').insert({
        ...data,
        employee_id: profile?.employee_id,
        status: 'pending', // 035 flat hierarchy: always stage-1 (any manager), then HR/Finance
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.loans(profile?.employee_id) })
  })
}

export function useApproveLoan() {
  const generic = useApproveRequest()
  return {
    ...generic,
    mutate:      (v: { id: string; action: 'approved' | 'rejected'; currentStatus?: string }) =>
      generic.mutate({ table: 'loans', id: v.id, action: v.action === 'approved' ? 'approve' : 'reject', currentStatus: v.currentStatus ?? 'pending' }),
    mutateAsync: (v: { id: string; action: 'approved' | 'rejected'; currentStatus?: string }) =>
      generic.mutateAsync({ table: 'loans', id: v.id, action: v.action === 'approved' ? 'approve' : 'reject', currentStatus: v.currentStatus ?? 'pending' }),
  }
}

// ── NOTIFICATIONS ─────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: KEYS.notifications,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!user,
    refetchInterval: 30000, // poll every 30s
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notifications })
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async () => {
      await supabase.from('notifications').update({ is_read: true })
        .eq('user_id', user?.id).eq('is_read', false)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notifications })
  })
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────

export function useAnnouncements() {
  return useQuery({
    queryKey: KEYS.announcements,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .lte('published_at', new Date().toISOString())
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false })
      if (error) throw error
      return data as Announcement[]
    }
  })
}

// ── HELP DESK ─────────────────────────────────────────────

export function useTickets(employeeId?: string) {
  return useQuery({
    queryKey: KEYS.tickets(employeeId),
    queryFn: async () => {
      let q = supabase
        .from('help_desk_tickets')
        .select(`*, employee:employees!employee_id(full_name_en, job_title_en)`)
        .order('created_at', { ascending: false })
      if (employeeId) q = q.eq('employee_id', employeeId)
      const { data, error } = await q
      if (error) throw error
      return data as HelpDeskTicket[]
    }
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (data: {
      category: string
      priority: string
      subject: string
      description: string
    }) => {
      const { error } = await supabase.from('help_desk_tickets').insert({
        ...data,
        employee_id: profile?.employee_id,
        status: 'open',
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tickets(profile?.employee_id) })
  })
}

// ── ASSETS ────────────────────────────────────────────────

export function useMyAssets() {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: KEYS.assets(profile?.employee_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('assigned_to', profile?.employee_id)
        .eq('status', 'assigned')
      if (error) throw error
      return data as Asset[]
    },
    enabled: !!profile?.employee_id
  })
}

export function useAllAssets() {
  return useQuery({
    queryKey: KEYS.assets(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select(`*, assigned_employee:employees!assigned_to(full_name_en, job_title_en)`)
        .order('asset_number')
      if (error) throw error
      return data
    }
  })
}

// ── RECOGNITIONS ──────────────────────────────────────────

export function useRecognitions() {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: KEYS.recognitions(profile?.employee_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recognitions')
        .select(`
          *,
          from_employee:employees!from_employee_id(full_name_en, avatar_url),
          to_employee:employees!to_employee_id(full_name_en, avatar_url)
        `)
        .or(`to_employee_id.eq.${profile?.employee_id},is_public.eq.true`)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as Recognition[]
    },
    enabled: !!profile?.employee_id
  })
}

export function useGiveRecognition() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (data: {
      to_employee_id: string
      badge_type: string
      message: string
    }) => {
      const { error } = await supabase.from('recognitions').insert({
        ...data,
        from_employee_id: profile?.employee_id,
        points_awarded: 10,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.recognitions() })
  })
}

// ── TRAINING ─────────────────────────────────────────────

export function useMyTraining() {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: KEYS.training(profile?.employee_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .select('*, course:training_courses(*)')
        .eq('employee_id', profile?.employee_id)
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      return data as TrainingEnrollment[]
    },
    enabled: !!profile?.employee_id
  })
}

// ── HR REQUESTS ───────────────────────────────────────────

export function useHRRequests(employeeId?: string) {
  return useQuery({
    queryKey: KEYS.hrRequests(employeeId),
    queryFn: async () => {
      let q = supabase
        .from('hr_requests')
        .select(`*, employee:employees!employee_id(full_name_en, job_title_en)`)
        .order('created_at', { ascending: false })
      if (employeeId) q = q.eq('employee_id', employeeId)
      const { data, error } = await q
      if (error) throw error
      return data
    }
  })
}

export function useSubmitHRRequest() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (data: { request_type: string; purpose?: string; urgency?: string }) => {
      const { error } = await supabase.from('hr_requests').insert({
        ...data,
        employee_id: profile?.employee_id,
        status: 'pending',
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.hrRequests(profile?.employee_id) })
  })
}

// ── TEAM (Manager) ────────────────────────────────────────

export function useMyTeam() {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: ['team', profile?.employee_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          division:divisions!division_id(name_en),
          today_attendance:attendance_logs(status, check_in, check_out)
        `)
        .eq('manager_id', profile?.employee_id)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
    enabled: !!profile?.employee_id
  })
}

export function usePendingApprovals() {
  const { profile, role } = useAuthStore()
  return useQuery({
    queryKey: KEYS.pendingApprovals,
    queryFn: async () => {
      // Two-stage approvals:
      //   managers act on status='pending' (their team only)
      //   HR & Finance act on status='processing' (manager already approved,
      //   or employee has no manager)
      const stage = role === 'manager' ? 'pending' : 'processing'
      // 035 flat hierarchy: ANY manager handles stage 1 company-wide.
      // No direct-manager scoping — RLS (*_mgr_stage1_*) enforces the same rule server-side.
      const scoped = (q: any) => q
      const emp = 'employee:employees!employee_id(full_name_en, job_title_en, division:divisions!division_id(name_en))'

      const [leave, loans, exit, expenses] = await Promise.all([
        scoped(supabase.from('leave_requests').select(`*, ${emp}`).eq('status', stage)).order('created_at'),
        scoped(supabase.from('loans').select(`*, ${emp}`).eq('status', stage)).order('created_at'),
        scoped(supabase.from('exit_reentry').select(`*, ${emp}`).eq('status', stage)).order('created_at'),
        scoped(supabase.from('expense_claims').select(`*, ${emp}`).eq('status', stage)).order('created_at'),
      ])
      return {
        leave:    leave.data ?? [],
        loans:    loans.data ?? [],
        exit:     exit.data ?? [],
        expenses: expenses.data ?? [],
      }
    },
    enabled: !!profile
  })
}

// ── Generic two-stage approve/reject ──────────────────────
// Stage 1 (manager):        pending    -> processing (+ manager_approved_*)
// Stage 2 (HR & Finance):   processing -> approved   (+ final approver cols)
// Reject: any stage -> rejected (+ rejection_reason)
const FINAL_COLS: Record<string, [string, string]> = {
  leave_requests: ['approved_by', 'approved_at'],
  loans:          ['finance_approved_by', 'finance_approved_at'],
  exit_reentry:   ['hr_approved_by', 'hr_approved_at'],
  expense_claims: ['approved_by', 'approved_at'],
}

export function useApproveRequest() {
  const qc = useQueryClient()
  const { profile, role } = useAuthStore()
  return useMutation({
    mutationFn: async ({ table, id, action, currentStatus, rejection_reason }: {
      table: keyof typeof FINAL_COLS
      id: string
      action: 'approve' | 'reject'
      currentStatus: string
      rejection_reason?: string
    }) => {
      const now = new Date().toISOString()
      const upd: any = {}
      if (action === 'reject') {
        upd.status = 'rejected'
        if (rejection_reason) upd.rejection_reason = rejection_reason
      } else if (role === 'manager' && currentStatus === 'pending') {
        upd.status = 'processing'
        upd.manager_approved_by = profile?.employee_id
        upd.manager_approved_at = now
      } else {
        // HR & Finance (or admin) final approval
        const [byCol, atCol] = FINAL_COLS[table]
        upd.status = 'approved'
        upd[byCol] = profile?.employee_id
        upd[atCol] = now
      }
      const { error } = await supabase.from(table).update(upd).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: KEYS.pendingApprovals })
      if (v.table === 'leave_requests') qc.invalidateQueries({ queryKey: KEYS.leaveRequests() })
      if (v.table === 'loans') { qc.invalidateQueries({ queryKey: KEYS.loans() }); qc.invalidateQueries({ queryKey: ['all-loans'] }) }
    }
  })
}

// ── DOCUMENTS ─────────────────────────────────────────────

export function useEmployeeDocuments(employeeId: string) {
  return useQuery({
    queryKey: KEYS.documents(employeeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('expiry_date')
      if (error) throw error
      return data
    },
    enabled: !!employeeId
  })
}

export function useExpiringDocuments(days = 90) {
  return useQuery({
    queryKey: ['expiring-documents', days],
    queryFn: async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      const { data, error } = await supabase
        .from('employee_documents')
        .select(`*, employee:employees!employee_id(full_name_en, job_title_en, division:divisions!division_id(name_en))`)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('expiry_date')
      if (error) throw error
      return data
    }
  })
}

// ── ONBOARDING ────────────────────────────────────────────

export function useOnboardingChecklist(employeeId: string) {
  return useQuery({
    queryKey: KEYS.onboarding(employeeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_checklists')
        .select('*')
        .eq('employee_id', employeeId)
        .order('step_order')
      if (error) throw error
      return data
    },
    enabled: !!employeeId
  })
}

export function useCompleteOnboardingStep() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async ({ employeeId, stepKey }: { employeeId: string; stepKey: string }) => {
      const { error } = await supabase
        .from('onboarding_checklists')
        .update({
          is_completed:  true,
          completed_by:  profile?.employee_id,
          completed_at:  new Date().toISOString(),
        })
        .eq('employee_id', employeeId)
        .eq('step_key', stepKey)
      if (error) throw error
    },
    onSuccess: (_, { employeeId }) => qc.invalidateQueries({ queryKey: KEYS.onboarding(employeeId) })
  })
}

// ── INVITE / ACCOUNT CREATION ─────────────────────────────

export function useCreateUserAccount() {
  return useMutation({
    mutationFn: async ({ employee_id, email, role }: {
      employee_id: string
      email: string
      role: string
    }) => {
      // Call Supabase Edge Function to create auth user + profile + send invite
      const { data, error } = await supabase.functions.invoke('create-employee-account', {
        body: { employee_id, email, role }
      })
      if (error) throw error
      return data
    }
  })
}

// ── POLICIES ─────────────────────────────────────────────

export function useCompanyPolicies() {
  return useQuery({
    queryKey: KEYS.policies,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_policies')
        .select('*')
        .order('published_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (policyId: string) => {
      const { error } = await supabase.from('policy_acknowledgements').insert({
        policy_id:   policyId,
        employee_id: profile?.employee_id,
        ip_address:  'web',
        device_info: navigator.userAgent.substring(0, 100),
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.policies })
  })
}

// ── SUGGESTIONS ───────────────────────────────────────────

export function useSuggestions() {
  const { role } = useAuthStore()
  // Matches the RLS policy on `suggestions` exactly: hr_officer + admin.
  // Managers are deliberately excluded — suggestions often concern them.
  const isManagement = role === 'admin' || role === 'hr_officer'
  return useQuery({
    queryKey: [...KEYS.suggestions, isManagement],
    queryFn: async () => {
      let q = supabase
        .from('suggestions')
        .select('*, employee:employees!employee_id(id,full_name_en,job_title_en)')
      // Employees see only suggestions that have been responded to.
      // Management must see everything, including new/pending ones —
      // otherwise incoming suggestions would be invisible to them.
      if (!isManagement) q = q.neq('status', 'pending')
      const { data, error } = await q
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function useSubmitSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { category: string; content: string }) => {
      // Attributed since 039 — management asked to see who raised what.
      // The employee-facing copy was updated to match; we must not tell
      // staff a channel is anonymous while recording their name.
      const { profile } = useAuthStore.getState()
      const { error } = await supabase.from('suggestions')
        .insert({ ...data, employee_id: profile?.employee_id ?? null })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.suggestions })
  })
}

// ============================================================
// TASKS HOOKS
// ============================================================

export function useTaskProjects() {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: ['task-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_projects')
        .select('*, owner:employees!owner_id(full_name_en,avatar_url), members:task_project_members(employee_id,role)')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!profile
  })
}

export function useTasks(filters?: { project_id?: string; status?: string; assignee_id?: string }) {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!assignee_id(id,full_name_en,avatar_url),
          reporter:employees!reporter_id(id,full_name_en,avatar_url),
          assignees:task_assignees(employee:employees!employee_id(id,full_name_en,avatar_url)),
          project:task_projects(id,name,color,icon),
          comments_count:task_comments(count)
        `)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (filters?.project_id) q = q.eq('project_id', filters.project_id)
      if (filters?.status)     q = q.eq('status', filters.status)
      if (filters?.assignee_id) q = q.eq('assignee_id', filters.assignee_id)

      const { data, error } = await q
      if (error) throw error
      return data
    },
    enabled: !!profile
  })
}

export function useMyTasks() {
  const { profile } = useAuthStore()
  const myId = profile?.employee_id
  return useQuery({
    queryKey: ['my-tasks', myId],
    queryFn: async () => {
      // ids of every task I'm on via the junction table
      const { data: links } = await supabase
        .from('task_assignees').select('task_id').eq('employee_id', myId)
      const ids = (links ?? []).map((l: any) => l.task_id)
      const extraIds = ids.length ? `,id.in.(${ids.join(',')})` : ''

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:task_projects(id,name,color,icon),
          assignee:employees!assignee_id(id,full_name_en,avatar_url),
          reporter:employees!reporter_id(id,full_name_en,avatar_url),
          assignees:task_assignees(employee:employees!employee_id(id,full_name_en,avatar_url)),
          comments_count:task_comments(count)
        `)
        // Tasks I'm assigned (primary OR via the multi-assignee list) OR that I created.
        // Without the junction lookup only the FIRST person picked ever saw the task,
        // which is why assigning a second manager appeared to do nothing.
        .or(`assignee_id.eq.${myId},reporter_id.eq.${myId}${extraIds}`)
        .is('deleted_at', null)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
    enabled: !!myId,
    refetchInterval: 60000,          // safety net if realtime socket drops (mobile backgrounding)
    refetchOnWindowFocus: true,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!assignee_id(id,full_name_en,avatar_url),
          reporter:employees!reporter_id(id,full_name_en,avatar_url),
          assignees:task_assignees(employee:employees!employee_id(id,full_name_en,avatar_url)),
          project:task_projects(id,name,color,icon),
          comments:task_comments(*, author:employees!author_id(id,full_name_en,avatar_url)),
          activity:task_activity(*, actor:employees!actor_id(id,full_name_en))
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (data: {
      title: string
      description?: string
      project_id?: string
      assignee_id?: string
      assignee_ids?: string[]
      priority?: string
      due_date?: string
    }) => {
      const { assignee_ids, ...rest } = data as any
      const payload: Record<string, any> = {
        ...rest,
        reporter_id: profile?.employee_id,
        company_id: profile?.employee?.company_id,
        status: 'todo',
      }
      // Empty strings are invalid for uuid/date columns — coerce to null
      for (const k of ['project_id', 'assignee_id', 'due_date', 'description']) {
        if (payload[k] === '' || payload[k] === undefined) payload[k] = null
      }
      // Primary assignee keeps the legacy column meaningful for older screens
      if (!payload.assignee_id && Array.isArray(assignee_ids) && assignee_ids.length) {
        payload.assignee_id = assignee_ids[0]
      }
      const { data: task, error } = await supabase.from('tasks').insert(payload).select().single()
      if (error) throw error
      // Full assignee list → junction table. The DB trigger already inserted the
      // primary one, so ignore duplicates rather than erroring on the PK.
      const everyone = Array.from(new Set([...(assignee_ids ?? []), payload.assignee_id].filter(Boolean)))
      if (everyone.length) {
        await supabase.from('task_assignees').upsert(
          everyone.map((employee_id: string) => ({ task_id: task.id, employee_id })),
          { onConflict: 'task_id,employee_id', ignoreDuplicates: true },
        )
      }
      // Log creation activity
      await supabase.from('task_activity').insert({
        task_id: task.id,
        actor_id: profile?.employee_id,
        action: 'created',
        new_value: task.title,
      })
      return task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
    }
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<any> }) => {
      const { error } = await supabase.from('tasks').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task', id] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
    }
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: the row stays so it can appear in Task History (item 7).
      // A hard DELETE was also silently failing before 039 — tasks had no
      // DELETE policy, so RLS rejected it while PostgREST reported success.
      const { data: me } = await supabase.auth.getUser()
      let empId: string | null = null
      if (me?.user) {
        const { data: prof } = await supabase.from('user_profiles')
          .select('employee_id').eq('id', me.user.id).maybeSingle()
        empId = prof?.employee_id ?? null
      }
      const { error } = await supabase.from('tasks')
        .update({ deleted_at: new Date().toISOString(), deleted_by: empId })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['task-history'] })
    }
  })
}

// ── Task history: completed, still-open, and deleted ───────
// Anyone sees the tasks they were involved in; managers/admins see all.
export function useTaskHistory(filter: 'all' | 'completed' | 'open' | 'deleted' = 'all') {
  const { profile, role } = useAuthStore()
  const myId = profile?.employee_id
  const elevated = role === 'admin' || role === 'hr_officer' || role === 'manager'
  return useQuery({
    queryKey: ['task-history', filter, myId, elevated],
    queryFn: async () => {
      let q = supabase.from('tasks').select(`
        *,
        project:task_projects(id,name,color,icon),
        assignee:employees!assignee_id(id,full_name_en,avatar_url),
        reporter:employees!reporter_id(id,full_name_en,avatar_url),
        deleter:employees!deleted_by(id,full_name_en),
        assignees:task_assignees(employee:employees!employee_id(id,full_name_en,avatar_url))
      `).order('updated_at', { ascending: false }).limit(200)

      if (filter === 'completed') q = q.eq('status', 'done').is('deleted_at', null)
      else if (filter === 'open')  q = q.not('status', 'in', '("done","cancelled")').is('deleted_at', null)
      else if (filter === 'deleted') q = q.not('deleted_at', 'is', null)

      if (!elevated && myId) {
        const { data: links } = await supabase
          .from('task_assignees').select('task_id').eq('employee_id', myId)
        const ids = (links ?? []).map((l: any) => l.task_id)
        q = q.or(`assignee_id.eq.${myId},reporter_id.eq.${myId}${ids.length ? `,id.in.(${ids.join(',')})` : ''}`)
      }
      const { data, error } = await q
      if (error) throw error
      return data
    },
    enabled: !!myId,
  })
}

// Bring a soft-deleted task back.
export function useRestoreTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks')
        .update({ deleted_at: null, deleted_by: null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['task-history'] })
    },
  })
}

// ══════════════════════════════════════════════════════════
//  PRESENCE  ·  READ RECEIPTS  ·  PRIVACY (migration 043)
// ══════════════════════════════════════════════════════════

/** Heartbeat while the app is open, so "online" stays accurate. */
export function usePresenceHeartbeat() {
  const { user } = useAuthStore()
  useEffect(() => {
    if (!user) return
    const beat = () => { if (document.visibilityState === 'visible') supabase.rpc('touch_presence') }
    beat()
    const id = setInterval(beat, 60_000)
    document.addEventListener('visibilitychange', beat)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', beat) }
  }, [user])
}

/** Online / last-seen for a set of employees. Privacy is applied server-side. */
export function usePresence(employeeIds: string[]) {
  const ids = [...new Set(employeeIds.filter(Boolean))].sort()
  return useQuery({
    queryKey: ['presence', ids.join(',')],
    queryFn: async () => {
      if (!ids.length) return {}
      const { data, error } = await supabase.rpc('get_presence', { p_employee_ids: ids })
      if (error) throw error
      return Object.fromEntries((data ?? []).map((r: any) => [r.employee_id, r]))
    },
    enabled: ids.length > 0,
    refetchInterval: 60_000,
  })
}

/** HR / Finance / Admin only — everyone with presence and login history. */
export function useUserDirectory() {
  const { role } = useAuthStore()
  const allowed = role === 'hr_officer' || role === 'finance' || role === 'admin'
  return useQuery({
    queryKey: ['user-directory'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_directory')
      if (error) throw error
      return data ?? []
    },
    enabled: allowed,
    refetchInterval: 60_000,
  })
}

/** Delivered / read counts for messages I sent in this channel. */
export function useMessageReceipts(channelId?: string) {
  return useQuery({
    queryKey: ['message-receipts', channelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_message_receipts', { p_channel: channelId })
      if (error) throw error
      return Object.fromEntries((data ?? []).map((r: any) => [r.message_id, r]))
    },
    enabled: !!channelId,
    refetchInterval: 15_000,
  })
}

/** The two privacy switches on the profile. */
export function usePrivacySettings() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const update = useMutation({
    mutationFn: async (patch: { read_receipts_enabled?: boolean; show_online_status?: boolean }) => {
      const { error } = await supabase.from('user_profiles').update(patch).eq('id', profile?.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presence'] })
      qc.invalidateQueries({ queryKey: ['message-receipts'] })
      useAuthStore.getState().refreshProfile?.()
    },
  })
  return {
    readReceipts: (profile as any)?.read_receipts_enabled ?? true,
    showOnline:   (profile as any)?.show_online_status ?? true,
    update,
  }
}

export function useAddTaskComment() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async ({ task_id, content }: { task_id: string; content: string }) => {
      const { error } = await supabase.from('task_comments').insert({
        task_id,
        author_id: profile?.employee_id,
        content,
      })
      if (error) throw error
    },
    onSuccess: (_, { task_id }) => qc.invalidateQueries({ queryKey: ['task', task_id] })
  })
}

// ============================================================
// CHAT HOOKS
// ============================================================

export function useChatChannels() {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: ['chat-channels'],
    queryFn: async () => {
      const myId = profile?.employee_id
      if (!myId) return []
      // 1) channels I'm a member of
      const { data: memberships, error: mErr } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .eq('employee_id', myId)
      if (mErr) throw mErr
      const ids = (memberships ?? []).map((m: any) => m.channel_id)
      if (!ids.length) return []
      // 2) those channels WITH all their members (so DM partner resolves)
      const { data, error } = await supabase
        .from('chat_channels')
        .select(`
          *,
          members:chat_channel_members(employee_id, last_read_at, is_muted)
        `)
        .in('id', ids)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data
    },
    enabled: !!profile?.employee_id,
    refetchInterval: 30000,          // safety net for the channel list (mobile socket drops)
    refetchOnWindowFocus: true,
  })
}

export function usePublicChannels() {
  return useQuery({
    queryKey: ['public-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .in('type', ['public', 'announcement'])
        .eq('is_archived', false)
        .order('name')
      if (error) throw error
      return data
    }
  })
}

export function useChatMessages(channelId: string, limit = 50) {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: ['chat-messages', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:employees!sender_id(id, full_name_en, avatar_url),
          reply_to:chat_messages!reply_to_id(id, content, sender:employees!sender_id(full_name_en))
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).reverse() // oldest first for display
    },
    enabled: !!channelId && !!profile
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async ({ channel_id, content, reply_to_id, mentions, attachment_url, attachment_name, attachment_type }: {
      channel_id: string
      content: string
      reply_to_id?: string
      mentions?: string[]
      attachment_url?: string
      attachment_name?: string
      attachment_type?: string
    }) => {
      // Insert and return the real row (with sender) so we can swap the optimistic one
      const { data, error } = await supabase.from('chat_messages').insert({
        channel_id,
        sender_id: profile?.employee_id,
        content,
        reply_to_id,
        mentions,
        type: attachment_url ? (attachment_type?.startsWith('image/') ? 'image' : 'file') : 'text',
        attachment_url,
        attachment_name,
        attachment_type,
      }).select('*, sender:employees!sender_id(id, full_name_en, avatar_url), reply_to:chat_messages!reply_to_id(id, content, sender:employees!sender_id(full_name_en))').single()
      if (error) throw error
      // Mark channel read — fire-and-forget, must not delay the send
      supabase.from('chat_channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channel_id)
        .eq('employee_id', profile?.employee_id)
        .then(() => {}, () => {})
      return data
    },
    // Optimistic: show the message instantly for the sender
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['chat-messages', vars.channel_id] })
      const prev = qc.getQueryData<any[]>(['chat-messages', vars.channel_id])
      const tempId = 'temp-' + Date.now()
      const optimistic = {
        id: tempId,
        channel_id: vars.channel_id,
        sender_id: profile?.employee_id,
        content: vars.content,
        created_at: new Date().toISOString(),
        type: vars.attachment_url ? (vars.attachment_type?.startsWith('image/') ? 'image' : 'file') : 'text',
        attachment_url: vars.attachment_url ?? null,
        attachment_name: vars.attachment_name ?? null,
        attachment_type: vars.attachment_type ?? null,
        reply_to_id: vars.reply_to_id ?? null,
        is_deleted: false,
        _optimistic: true,
        sender: { id: profile?.employee_id, full_name_en: profile?.employee?.full_name_en, avatar_url: profile?.employee?.avatar_url },
      }
      qc.setQueryData<any[]>(['chat-messages', vars.channel_id], (old = []) => [...old, optimistic])
      return { prev, tempId }
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['chat-messages', vars.channel_id], ctx.prev)
    },
    onSuccess: (data, vars, ctx) => {
      // Replace the optimistic row with the real one (dedupe if realtime already added it)
      qc.setQueryData<any[]>(['chat-messages', vars.channel_id], (old = []) => {
        const withoutTemp = old.filter(m => m.id !== ctx?.tempId && m.id !== data.id)
        return [...withoutTemp, data]
      })
      qc.invalidateQueries({ queryKey: ['chat-channels'] })
    }
  })
}

export function useAddReaction() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async ({ message_id, emoji, channel_id }: { message_id: string; emoji: string; channel_id: string }) => {
      // Fetch current reactions
      const { data } = await supabase.from('chat_messages').select('reactions').eq('id', message_id).single()
      const reactions = data?.reactions ?? {}
      const empId = profile?.employee_id!

      if (reactions[emoji]?.includes(empId)) {
        // Toggle off
        reactions[emoji] = reactions[emoji].filter((id: string) => id !== empId)
        if (!reactions[emoji].length) delete reactions[emoji]
      } else {
        // Toggle on
        reactions[emoji] = [...(reactions[emoji] ?? []), empId]
      }
      const { error } = await supabase.from('chat_messages').update({ reactions }).eq('id', message_id)
      if (error) throw error
      return { channel_id }
    },
    onSuccess: (_, { channel_id }) => qc.invalidateQueries({ queryKey: ['chat-messages', channel_id] })
  })
}

export function useJoinChannel() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (channel_id: string) => {
      const { error } = await supabase.from('chat_channel_members').upsert({
        channel_id,
        employee_id: profile?.employee_id,
      }, { onConflict: 'channel_id,employee_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-channels'] })
  })
}

export function useCreateChannel() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; type: string; member_ids: string[] }) => {
      // Create channel
      const { data: channel, error } = await supabase.from('chat_channels').insert({
        company_id: profile?.employee?.company_id,
        name: data.name,
        description: data.description,
        type: data.type,
        created_by: profile?.employee_id,
      }).select().single()
      if (error) throw error

      // ORDER MATTERS. The insert policy authorises adding other people via
      //   EXISTS (SELECT 1 FROM chat_channels WHERE id = channel_id AND created_by = me)
      // and that subquery is itself subject to RLS. A brand-new PRIVATE group is
      // not visible to its own creator until they are a member, so a single batch
      // containing creator + members is rejected outright (403/400) and the group
      // is left with nobody in it.
      // Step 1: join it yourself (always allowed: employee_id = me).
      const { error: selfErr } = await supabase.from('chat_channel_members')
        .insert({ channel_id: channel.id, employee_id: profile?.employee_id, is_admin: true })
      if (selfErr) throw selfErr

      // Step 2: now the group is visible to us, so the others can be added.
      const others = [...new Set(data.member_ids)].filter(id => id && id !== profile?.employee_id)
      if (others.length) {
        const { error: memErr } = await supabase.from('chat_channel_members')
          .insert(others.map(emp_id => ({ channel_id: channel.id, employee_id: emp_id, is_admin: false })))
        // Don't fail the whole creation — the group exists and the creator is in it.
        if (memErr) console.warn('Some members could not be added:', memErr.message)
      }
      return channel
    },
    onSuccess: () => {
      // Both queries render groups. Missing the second key is why creating a
      // second group with the same name looked like "only one appeared" —
      // that list was stale, not deduplicated.
      qc.invalidateQueries({ queryKey: ['chat-channels'] })
      qc.invalidateQueries({ queryKey: ['public-channels'] })
    }
  })
}

export function useCreateDM() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (other_employee_id: string) => {
      // Check if DM already exists
      const myId = profile?.employee_id!
      const { data: existing } = await supabase.rpc('find_dm_channel', {
        emp1: myId, emp2: other_employee_id
      })

      if (existing) return existing

      // Create new DM channel
      const { data: channel, error } = await supabase.from('chat_channels').insert({
        company_id: profile?.employee?.company_id,
        type: 'direct',
        created_by: myId,
      }).select().single()
      if (error) throw error

      await supabase.from('chat_channel_members').insert([
        { channel_id: channel.id, employee_id: myId },
        { channel_id: channel.id, employee_id: other_employee_id },
      ])
      return channel
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-channels'] })
  })
}

export function useMarkChannelRead(channelId: string) {
  const { profile, user } = useAuthStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await supabase.from('chat_channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('employee_id', profile?.employee_id)
      // THE badge fix: opening a conversation must also clear the bell
      // notifications it generated. Without this, chat_message rows stay
      // is_read=false forever and the unread count never drops — which is
      // exactly "I opened the messages but the badge is still there".
      await supabase.from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('type', 'chat_message')
        .eq('is_read', false)
        .eq('data->>channel_id', channelId)
    },
    // BADGE FIX: the unread dot is derived from the CACHED channel list
    // (last_message_at > last_read_at). Without invalidating it here the dot
    // survives opening the chat until some unrelated refetch happens.
    onSuccess: () => {
      qc.invalidateQueries({ predicate: q => {
        const k = String(q.queryKey[0] ?? '')
        return k.includes('chat') || k.toLowerCase().includes('notif')
      } })
    },
  })
}

export function useCreateTaskProject() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string; icon: string }) => {
      const { data: proj, error } = await supabase.from('task_projects').insert({
        ...data,
        company_id: profile?.employee?.company_id,
        owner_id: profile?.employee_id,
      }).select().single()
      if (error) throw error
      await supabase.from('task_project_members').insert({
        project_id: proj.id,
        employee_id: profile?.employee_id,
        role: 'owner',
      })
      return proj
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-projects'] })
  })
}

// ── APP SETTINGS (Admin customization) ────────────────────
export function useSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('key,value,category,label,description')
      if (error) throw error
      const map: Record<string, any> = {}
      ;(data ?? []).forEach((r: any) => { map[r.key] = r.value })
      return { map, rows: data ?? [] }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase.from('app_settings')
        .update({ value, updated_by: user?.id })
        .eq('key', key)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-settings'] }),
  })
}

// Convenience: read a single setting with a fallback
export function useSetting<T = any>(key: string, fallback: T): T {
  const { data } = useSettings()
  return (data?.map?.[key] ?? fallback) as T
}

// ── FEATURE FLAGS (per-role on/off) ───────────────────────
export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_feature_flags').select('role,feature_key,enabled')
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

/** A feature is enabled unless an override row for the current role says enabled=false. */
export function useFeatureEnabled(key: string): boolean {
  const { profile } = useAuthStore()
  const { data: flags } = useFeatureFlags()
  const role = profile?.role
  if (!role) return true
  const row = flags?.find(f => f.role === role && f.feature_key === key)
  return row ? row.enabled : true
}

export function useSetFeatureFlag() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async ({ role, feature_key, enabled }: { role: string; feature_key: string; enabled: boolean }) => {
      const { error } = await supabase.from('role_feature_flags')
        .upsert({ role, feature_key, enabled, updated_by: user?.id, updated_at: new Date().toISOString() }, { onConflict: 'role,feature_key' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-flags'] }),
  })
}

// ── SALES ANALYTICS ───────────────────────────────────────
export function useSalesData() {
  return useQuery({
    queryKey: ['sales-records'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_records')
        .select('branch,date,revenue,units,transactions,category').order('date')
      if (error) throw error
      return (data ?? []).map(r => ({
        branch: r.branch, date: r.date, category: r.category,
        revenue: Number(r.revenue), units: Number(r.units), transactions: Number(r.transactions),
      }))
    },
  })
}

export function useUploadSales() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (rows: { branch: string; date: string; revenue: number; units: number; transactions: number; category?: string | null }[]) => {
      const payload = rows.map(r => ({ ...r, company_id: profile?.employee?.company_id, uploaded_by: profile?.employee_id }))
      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase.from('sales_records').insert(payload.slice(i, i + 500))
        if (error) throw error
      }
      return payload.length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-records'] }),
  })
}

export function useClearSales() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sales_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-records'] }),
  })
}
