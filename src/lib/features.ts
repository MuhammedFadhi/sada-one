import { formatDayMonth, formatMonthYearShort } from '@/lib/dates'
// Toggleable feature registry + sales time-bucketing helpers.

export interface FeatureDef { key: string; label: string; icon: string }

// Features an admin can switch on/off per role.
export const FEATURES: FeatureDef[] = [
  { key: 'attendance',      label: 'Attendance',       icon: 'clock-check' },
  { key: 'leave',           label: 'Leave',            icon: 'beach' },
  { key: 'tasks',           label: 'Tasks',            icon: 'checkbox' },
  { key: 'chat',            label: 'Chat',             icon: 'message-circle' },
  { key: 'expenses',        label: 'Expenses',         icon: 'receipt' },
  { key: 'loans',           label: 'Loans & Advances', icon: 'cash' },
  { key: 'documents',       label: 'Documents',        icon: 'file-text' },
  { key: 'directory',       label: 'Directory',        icon: 'users' },
  { key: 'payslips',        label: 'Payslips',         icon: 'wallet' },
  { key: 'performance',     label: 'Performance',      icon: 'target' },
  { key: 'helpdesk',        label: 'Help Desk',        icon: 'headset' },
  { key: 'sales_analytics', label: 'Sales Analytics',  icon: 'chart-bar' },
]

export const TOGGLE_ROLES = ['employee', 'manager', 'hr_officer', 'finance', 'admin'] as const
export type ToggleRole = typeof TOGGLE_ROLES[number]
export const ROLE_LABEL: Record<string, string> = {
  employee: 'Employee', manager: 'Manager', hr_officer: 'HR & Finance', finance: 'Finance (legacy)', admin: 'Admin',
}

// ── Sales time bucketing ──────────────────────────────────
export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'half' | 'year'
export const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'day', label: 'Daily' }, { key: 'week', label: 'Weekly' }, { key: 'month', label: 'Monthly' },
  { key: 'quarter', label: 'Quarterly' }, { key: 'half', label: 'Half-Yearly' }, { key: 'year', label: 'Yearly' },
]

function isoWeek(d: Date): [number, number] {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return [date.getUTCFullYear(), week]
}

/** Returns { key, label } for the period a date falls into, at the given granularity. */
export function periodOf(dateStr: string, g: Granularity): { key: string; label: string } {
  const d = new Date(dateStr + 'T00:00:00')
  const y = d.getFullYear(), m = d.getMonth() // 0-based
  switch (g) {
    case 'day':   return { key: dateStr, label: formatDayMonth(d) }
    case 'week':  { const [wy, w] = isoWeek(d); return { key: `${wy}-W${String(w).padStart(2, '0')}`, label: `W${w} ${wy}` } }
    case 'month': return { key: `${y}-${String(m + 1).padStart(2, '0')}`, label: formatMonthYearShort(d) }
    case 'quarter': { const q = Math.floor(m / 3) + 1; return { key: `${y}-Q${q}`, label: `Q${q} ${y}` } }
    case 'half':  { const h = m < 6 ? 1 : 2; return { key: `${y}-H${h}`, label: `H${h} ${y}` } }
    case 'year':  return { key: `${y}`, label: `${y}` }
  }
}

export interface SaleRow { branch: string; date: string; revenue: number; units: number; transactions: number; category?: string | null }
export interface Bucket { key: string; label: string; revenue: number; units: number; transactions: number }

/** Aggregate rows into ordered period buckets (optionally filtered to one branch). */
export function bucketize(rows: SaleRow[], g: Granularity, branch?: string): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const r of rows) {
    if (branch && r.branch !== branch) continue
    const p = periodOf(r.date, g)
    const b = map.get(p.key) ?? { key: p.key, label: p.label, revenue: 0, units: 0, transactions: 0 }
    b.revenue += r.revenue; b.units += r.units; b.transactions += r.transactions
    map.set(p.key, b)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

/** Totals per branch (for comparison). */
export function byBranch(rows: SaleRow[]): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const r of rows) {
    const b = map.get(r.branch) ?? { key: r.branch, label: r.branch, revenue: 0, units: 0, transactions: 0 }
    b.revenue += r.revenue; b.units += r.units; b.transactions += r.transactions
    map.set(r.branch, b)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}
