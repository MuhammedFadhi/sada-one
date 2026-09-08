// ============================================================
// SA'DA ONE — Shared UI Components
// ============================================================

import { ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { NumberTicker } from '@/components/magicui/number-ticker'
import * as Dialog from '@radix-ui/react-dialog'
import { statusLabel } from '@/lib/labels'
import { formatDate as fmtDate, formatDateShort as fmtDateShort } from '@/lib/dates'

// NOTE: LoadingScreen lives in ./LoadingScreen.tsx — single source of truth.
// Re-export here so existing `from '@/components/ui'` imports keep working.
export { LoadingScreen } from './LoadingScreen'

// ── Status Bar ────────────────────────────────────────────
export function StatusBar() {
  // Pure safe-area spacer — iOS shows its own time/battery/signal.
  // viewport-fit=cover + this div = content never hides behind Dynamic Island or notch.
  return (
    <div style={{
      height: 'env(safe-area-inset-top, 44px)',
      minHeight: 44,
      flexShrink: 0,
      pointerEvents: 'none',
    }} aria-hidden="true" />
  )
}

// ── Top Bar ───────────────────────────────────────────────
export function TopBar({
  title, onBack, rightIcon, onRight, dark = true
}: {
  title?: ReactNode
  onBack?: () => void
  rightIcon?: string
  onRight?: () => void
  dark?: boolean
}) {
  const navigate = useNavigate()
  const bg = dark ? '#0D1B2A' : 'white'
  const color = dark ? 'white' : '#1A202C'
  return (
    <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0"
         style={{ background: bg }}>
      <button onClick={onBack ?? (() => navigate(-1))} aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,.08)' }}>
        <i className="ti ti-arrow-left" style={{ color, fontSize: 20 }} />
      </button>
      <div style={{ color, fontWeight: 600, fontSize: 15 }}>{title}</div>
      {rightIcon
        ? <button onClick={onRight} aria-label={rightIcon}
                  className="w-9 h-9 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,.08)' }}>
            <i className={`ti ti-${rightIcon}`} style={{ color, fontSize: 20 }} />
          </button>
        : <div className="w-9" />
      }
    </div>
  )
}

// ── Page Container ────────────────────────────────────────
export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx('page-content flex-1 overflow-y-auto bg-[#F4F6F9]', className)}
      style={{
        padding: '16px 16px',
        paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────
export function SectionHeader({ title, action, onAction }: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex justify-between items-center mb-2">
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>{title}</span>
      {action && (
        <button onClick={onAction} style={{ fontSize: 11, color: '#17B8D0', cursor: 'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ── KPI Grid ─────────────────────────────────────────────
export function KPIGrid({ items }: { items: { label: string; value: string | number; color: string }[] }) {
  const cols = items.length <= 3 ? items.length : Math.ceil(items.length / 2)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols > 4 ? 3 : cols}, 1fr)`, gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', marginTop: 3 }}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────
const AVATAR_COLORS = ['#17B8D0','#C8A96E','#1D9E75','#E67E22','#7F77DD','#E24B4A','#17294A']

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div className={clsx('flex items-center justify-center rounded-full flex-shrink-0 font-bold text-white', className)}
         style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────
const badgeStyles: Record<string, string> = {
  pending:   'badge-warning',
  approved:  'badge-success',
  rejected:  'badge-danger',
  active:    'badge-success',
  on_leave:  'badge-warning',
  completed: 'badge-success',
  open:      'badge-info',
  in_progress: 'badge-gold',
  resolved:  'badge-success',
  closed:    'badge-dark',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = badgeStyles[status] ?? 'badge-dark'
  return <span className={clsx('badge', cls)}>{label ?? statusLabel(status)}</span>
}

// ── Bottom Sheet Modal ────────────────────────────────────
export function BottomSheet({
  open, onClose, title, children
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] max-h-[85vh] overflow-y-auto rounded-t-[20px] bg-white px-4 pt-5 pb-[max(env(safe-area-inset-bottom,16px),16px)] shadow-[0_-4px_24px_rgba(0,0,0,0.15)] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:duration-300 data-[state=closed]:duration-200"
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#E2E8F0]" />
          <Dialog.Title className={title ? 'mb-4 text-[15px] font-semibold text-[#1A202C]' : 'sr-only'}>
            {title ?? 'Dialog'}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Info Card ─────────────────────────────────────────────
export function InfoCard({ rows, title }: {
  rows: { label: string; value: ReactNode }[]
  title?: string
}) {
  return (
    <div className="card p-3.5 mb-2.5">
      {title && <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', marginBottom: 10, paddingBottom: 8, borderBottom: '0.5px solid #F0F0F0' }}>{title}</div>}
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < rows.length - 1 ? '0.5px solid #F0F0F0' : 'none', fontSize: 12 }}>
          <span style={{ color: '#718096' }}>{row.label}</span>
          <span style={{ color: '#1A202C', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────
export function ProgressBar({ value, color = '#17B8D0', label }: { value: number; color?: string; label?: string }) {
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#718096', marginBottom: 3 }}>
          <span>{label}</span><span>{value}%</span>
        </div>
      )}
      <div style={{ background: '#F0F0F0', borderRadius: 6, height: 7, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', borderRadius: 6, background: color, transition: 'width .5s' }} />
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
// ── Skeleton loaders ──────────────────────────────────────
export function Skeleton({ h = 12, w = '100%', r = 6, mb = 0 }: { h?: number | string; w?: number | string; r?: number; mb?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, marginBottom: mb }} />
}
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton h={12} w="55%" mb={8} />
            <Skeleton h={10} w="82%" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#718096' }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 40, color: '#CBD5E0', display: 'block', marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: '#4A5568', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#718096' }}>{subtitle}</div>}
    </div>
  )
}

export function ErrorState({ onRetry, title = "Couldn't load", subtitle = "Something went wrong fetching this. Check your connection and try again." }: { onRetry?: () => void; title?: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#718096' }}>
      <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: '#E67E22', display: 'block', marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: '#4A5568', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#718096', marginBottom: onRetry ? 14 : 0 }}>{subtitle}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ background: '#17B8D0', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <i className="ti ti-refresh" style={{ marginRight: 6 }} />Retry
        </button>
      )}
    </div>
  )
}

// Unified loading / error / empty / data states so a failed fetch shows an error+retry
// instead of masquerading as an empty list.
export function QueryState({ isLoading, isError, isEmpty, onRetry, rows, emptyIcon = 'inbox', emptyTitle = 'Nothing here yet', emptySubtitle, children }: { isLoading?: boolean; isError?: boolean; isEmpty?: boolean; onRetry?: () => void; rows?: number; emptyIcon?: string; emptyTitle?: string; emptySubtitle?: string; children?: ReactNode }) {
  if (isLoading) return <SkeletonList rows={rows} />
  if (isError) return <ErrorState onRetry={onRetry} />
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />
  return <>{children}</>
}

// ── Search Bar ────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search...' }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, border: '0.5px solid #E2E8F0' }}>
      <i className="ti ti-search" style={{ color: '#718096', fontSize: 18 }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#1A202C', outline: 'none', flex: 1 }}
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="Clear search" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
          <i className="ti ti-x" style={{ color: '#718096', fontSize: 16 }} />
        </button>
      )}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: {
  tabs: { key: string; label: string; count?: number }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div style={{ display: 'flex', background: 'white', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
                style={{
                  flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: 'none', background: 'none', fontFamily: 'inherit',
                  color: active === tab.key ? '#17B8D0' : '#718096',
                  borderBottom: active === tab.key ? '2px solid #17B8D0' : '2px solid transparent',
                }}>
          {tab.label}{tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  )
}

// ── Toggle Switch ─────────────────────────────────────────
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
      background: on ? '#17B8D0' : '#CBD5E0', transition: 'background .2s', flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3,
        left: on ? 23 : 3, transition: 'left .2s',
        boxShadow: '0 1px 4px rgba(0,0,0,.2)'
      }} />
    </div>
  )
}

// ── Stat Strip ────────────────────────────────────────────
export function StatStrip({ stats }: { stats: { label: string; value: string | number; color: string; sub?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8, marginBottom: 12 }}>
      {stats.map((s, i) => (
        <div key={i} className="card" style={{ padding: '14px 12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }} />
          <div style={{ fontSize: 23, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {typeof s.value === 'number' ? <NumberTicker value={s.value} /> : s.value}
          </div>
          <div style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          {s.sub && <div style={{ fontSize: 10, color: s.color, marginTop: 3, fontWeight: 500 }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Mini Bar Chart (dependency-free, animated) ────────────
export function MiniBarChart({ data, title, action, onAction, fmt }: {
  data: { label: string; value: number; color?: string }[]
  title?: string
  action?: string
  onAction?: () => void
  fmt?: (n: number) => string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const palette = ['#17B8D0', '#1D9E75', '#C8A96E', '#7F77DD', '#E67E22', '#E24B4A', '#3B82F6', '#EC4899']
  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A202C' }}>{title}</span>
          {action && <button onClick={onAction} style={{ fontSize: 11, color: '#17B8D0', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{action}</button>}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {data.map((d, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#4A5568', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>{d.label}</span>
              <span style={{ fontSize: 12, color: '#1A202C', fontWeight: 700 }}>{fmt ? fmt(d.value) : d.value}</span>
            </div>
            <div style={{ height: 8, borderRadius: 5, background: '#EEF2F6', overflow: 'hidden' }}>
              <div className="bar-grow" style={{ width: `${(d.value / max) * 100}%`, height: '100%', borderRadius: 5, background: d.color ?? palette[i % palette.length], animationDelay: `${0.1 + i * 0.07}s` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Alert Banner ──────────────────────────────────────────
export function AlertBanner({ type = 'info', message, onClose }: {
  type?: 'info' | 'warning' | 'danger' | 'success'
  message: string
  onClose?: () => void
}) {
  const styles = {
    info:    { bg: '#EBF8FF', color: '#17B8D0', icon: 'info-circle' },
    warning: { bg: '#FFF3E0', color: '#E67E22', icon: 'alert-triangle' },
    danger:  { bg: '#FFF0F0', color: '#E24B4A', icon: 'alert-circle' },
    success: { bg: '#E6FAF0', color: '#1D9E75', icon: 'circle-check' },
  }[type]
  return (
    <div style={{ background: styles.bg, borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: styles.color }}>
      <i className={`ti ti-${styles.icon}`} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', color: styles.color }}><i className="ti ti-x" /></button>}
    </div>
  )
}

// ── Notification Dot ──────────────────────────────────────
export function NotifDot({ count }: { count?: number }) {
  if (!count) return null
  return (
    <div style={{
      position: 'absolute', top: -3, right: -3,
      background: '#E24B4A', borderRadius: '50%',
      width: count > 9 ? 18 : 14, height: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: 'white',
    }}>
      {count > 9 ? '9+' : count}
    </div>
  )
}

// ── Document Expiry Card ──────────────────────────────────
export function DocExpiryCard({ name, expiry, onClick }: {
  name: string
  expiry?: string
  onClick?: () => void
}) {
  if (!expiry) return null
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
  const status = days < 0 ? 'expired' : days < 60 ? 'critical' : days < 90 ? 'warning' : 'ok'
  const colors = { ok: '#1D9E75', warning: '#E67E22', critical: '#E24B4A', expired: '#E24B4A' }
  const bgs = { ok: '#E6FAF0', warning: '#FFF3E0', critical: '#FFF0F0', expired: '#FFF0F0' }
  const icons: Record<string, string> = {
    'IQAMA': 'id-badge', 'Passport': 'passport',
    'Medical Insurance': 'heart-rate-monitor', default: 'file-text'
  }

  return (
    <div onClick={onClick} className="card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: bgs[status], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ti-${icons[name] ?? icons.default}`} style={{ color: colors[status], fontSize: 16 }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A202C' }}>{name}</div>
        <div style={{ fontSize: 11, color: colors[status] }}>
          {days < 0 ? 'Expired' : `Valid for ${days} days`}
        </div>
      </div>
      <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: '#CBD5E0', fontSize: 16 }} />
    </div>
  )
}

// ── Approval Card ─────────────────────────────────────────
export function ApprovalCard({ name, role, type, detail, onApprove, onReject, typeBg, typeColor }: {
  name: string; role: string; type: string; detail: string
  onApprove: () => void; onReject: () => void
  typeBg?: string; typeColor?: string
}) {
  const [acted, setActed] = useState(false)
  if (acted) return null
  return (
    <div className="card p-3.5 mb-2.5">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar name={name} size={36} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A202C' }}>{name}</div>
          <div style={{ fontSize: 11, color: '#718096' }}>{role}</div>
        </div>
      </div>
      <span className="badge" style={{ background: typeBg ?? '#EBF8FF', color: typeColor ?? '#17B8D0', marginBottom: 8, display: 'inline-flex' }}>{type}</span>
      <div style={{ fontSize: 12, color: '#4A5568', background: '#F4F6F9', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{detail}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => { setActed(true); onApprove() }}
                style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: 8, padding: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'inherit' }}>
          <i className="ti ti-check" /> Approve
        </button>
        <button onClick={() => { setActed(true); onReject() }}
                style={{ background: '#FFF0F0', color: '#E24B4A', border: '1px solid #E24B4A', borderRadius: 8, padding: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'inherit' }}>
          <i className="ti ti-x" /> Reject
        </button>
      </div>
    </div>
  )
}

// ── Utility: format currency ──────────────────────────────
export function formatSAR(amount?: number | null) {
  return `SAR ${(amount ?? 0).toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ── Utility: format date ──────────────────────────────────
// Re-exported from @/lib/dates so every screen shares one Gregorian
// implementation. The previous version used the 'en-SA' locale, whose
// default calendar is islamic-umalqura — that is why dates rendered as
// Hijri on phones. Do not reintroduce a locale-dependent formatter here.
export function formatDate(date: string, short = false) {
  return short ? fmtDateShort(date) : fmtDate(date)
}

// ── Utility: days until expiry ────────────────────────────
export function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

// ── Button (app-standard, accessible) ─────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: '#17B8D0', color: 'white', border: 'none' },
  secondary: { background: '#F4F6F9', color: '#1A202C', border: '1px solid #E2E8F0' },
  danger:    { background: '#E24B4A', color: 'white', border: 'none' },
  ghost:     { background: 'transparent', color: '#17B8D0', border: 'none' },
}
export function Button({
  variant = 'primary', icon, loading, disabled, fullWidth, children, style, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; icon?: string; loading?: boolean; fullWidth?: boolean
}) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '11px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
        fontFamily: 'inherit', cursor: disabled || loading ? 'default' : 'pointer',
        width: fullWidth ? '100%' : undefined, opacity: disabled || loading ? 0.6 : 1,
        transition: 'transform .1s, opacity .15s', WebkitTapHighlightColor: 'transparent',
        ...BTN_STYLES[variant], ...style,
      }}
      onPointerDown={e => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.transform = 'scale(.97)' }}
      onPointerUp={e => (e.currentTarget as HTMLElement).style.transform = ''}
      onPointerLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}
      {...props}
    >
      {loading && <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />}
      {!loading && icon && <i className={`ti ti-${icon}`} style={{ fontSize: 17 }} />}
      {children}
    </button>
  )
}
