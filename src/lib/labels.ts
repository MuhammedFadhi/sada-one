// ============================================================
// SA'DA ONE — Human-readable labels for enum / code values
// ------------------------------------------------------------
// Single source of truth for turning raw DB enum strings
// (e.g. "on_leave", "hr_officer", "annual") into UI-ready text
// (e.g. "On Leave", "HR Officer", "Annual Leave").
//
// USAGE
//   import { statusLabel, roleLabel, leaveTypeLabel, label } from '@/lib/labels'
//   <StatusBadge status={r.status} />           // StatusBadge already calls statusLabel
//   {roleLabel(user.role)}                       // "HR Officer"
//   {leaveTypeLabel(req.leave_type)}             // "Annual Leave"
//   {label(anyUnknownEnum)}                       // generic fallback: "Some Value"
//
// DESIGN
//   • Explicit maps below cover every value CONFIRMED present in the
//     codebase as of Phase 1. They are the correct, reviewed wording.
//   • Any value NOT in a map falls back to humanize() — never a raw
//     lowercase/underscored string. So new enum values still render
//     acceptably (e.g. a future "study_leave" -> "Study Leave") until
//     someone adds an explicit entry here.
//   • Acronyms (HR, EOS, IQAMA, ID) are preserved via ACRONYMS.
// ============================================================

// Words that should stay upper-cased when produced by humanize().
const ACRONYMS = new Set(['hr', 'eos', 'id', 'iqama', 'gosi', 'kpi', 'ot', 'vat'])

/**
 * Generic fallback: "in_review" -> "In Review", "hr_officer" -> "HR Officer".
 * Handles snake_case, kebab-case and spaces. Never returns the raw token.
 */
export function humanize(value?: string | null): string {
  if (value == null || value === '') return '—'
  return String(value)
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map(w =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(' ')
}

// Helper to build a lookup that falls back to humanize() for unmapped keys.
function make(map: Record<string, string>) {
  return (value?: string | null): string => {
    if (value == null || value === '') return '—'
    return map[value] ?? humanize(value)
  }
}

// ── Roles ────────────────────────────────────────────────
// Confirmed: employee | manager | hr_officer | finance | admin  (src/types UserRole)
export const roleLabel = make({
  employee:   'Employee',
  manager:    'Manager',
  hr_officer: 'HR Officer',
  finance:    'Finance',
  admin:      'Admin',
})

// ── Employee / account status ────────────────────────────
// Confirmed values seen across modules (attendance, users, requests, tasks).
export const statusLabel = make({
  // lifecycle
  active:       'Active',
  inactive:     'Inactive',
  on_leave:     'On Leave',
  offboarding:  'Offboarding',
  // request / approval workflow
  pending:      'Pending',
  in_review:    'In Review',
  processing:   'In Review',     // treated as review stage in the UI
  approved:     'Approved',
  rejected:     'Rejected',
  cancelled:    'Cancelled',
  released:     'Released',
  paid:         'Paid',
  // tasks / tickets
  todo:         'To Do',
  open:         'Open',
  in_progress:  'In Progress',
  done:         'Done',
  completed:    'Completed',
  // attendance
  present:      'Present',
  absent:       'Absent',
  late:         'Late',
})

// ── Contract type ────────────────────────────────────────
// Confirmed: permanent | fixed_term | probation | contractor
export const contractTypeLabel = make({
  permanent:  'Permanent',
  fixed_term: 'Fixed Term',
  probation:  'Probation',
  contractor: 'Contractor',
})

// ── Leave type ───────────────────────────────────────────
// Confirmed: annual | sick | emergency | hajj | maternity | paternity | unpaid
export const leaveTypeLabel = make({
  annual:    'Annual Leave',
  sick:      'Sick Leave',
  emergency: 'Emergency Leave',
  hajj:      'Hajj Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  unpaid:    'Unpaid Leave',
})

// ── Request type (self-service requests) ─────────────────
// Confirmed: normal | break_in | experience_letter | leave_encashment | salary_advance
export const requestTypeLabel = make({
  normal:            'General Request',
  break_in:          'Break-In',
  experience_letter: 'Experience Letter',
  leave_encashment:  'Leave Encashment',
  salary_advance:    'Salary Advance',
})

// ── Loan type ────────────────────────────────────────────
// NOTE: only `emergency` and `salary_advance` are confirmed in the current
// codebase. Any other loan_type value will render via humanize() until an
// explicit entry is added — intentionally NOT guessing labels we can't verify.
export const loanTypeLabel = make({
  emergency:      'Emergency Loan',
  salary_advance: 'Salary Advance',
})

// ── Urgency ──────────────────────────────────────────────
// Confirmed: low | normal | high | urgent
export const urgencyLabel = make({
  low:    'Low',
  normal: 'Normal',
  high:   'High',
  urgent: 'Urgent',
})

// ── Gender ───────────────────────────────────────────────
export const genderLabel = make({
  male:   'Male',
  female: 'Female',
})

// ── Generic export ───────────────────────────────────────
// Use when the field's enum family is unknown/mixed; identical to humanize().
export const label = humanize
