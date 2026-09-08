// ============================================================
// SA'DA ONE — date formatting
// ------------------------------------------------------------
// WHY THIS EXISTS
// The app used toLocaleDateString('en-SA', …) in 39 places. The `SA`
// region's default calendar is islamic-umalqura, so on real devices
// (full-ICU browsers, phones) every date rendered as a HIJRI date —
// "١٤٤٨/٠٢/١١" style values where staff expected 25/08/2026.
//
// Locale defaults are not dependable for this: the same call resolves to
// `gregory` in some JS runtimes and `islamic-umalqura` in others, so the
// bug appears on phones but not necessarily on a developer's machine.
//
// Everything here is therefore built from getDate()/getMonth()/
// getFullYear(), which are Gregorian by definition and involve no locale
// resolution at all. Month names come from a fixed table rather than Intl.
// Same output on every device, guaranteed.
//
// House format: dd/mm/yyyy.
// ============================================================

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG  = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_LONG    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

type DateInput = string | number | Date | null | undefined

function toDate(v: DateInput): Date | null {
  if (v === null || v === undefined || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime()) ? null : d
}
const p2 = (n: number) => String(n).padStart(2, '0')

/** 25/08/2026 — the app-wide default. */
export function formatDate(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** 25 Aug 2026 — for lists where a month name reads better. */
export function formatDateShort(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** 25 Aug — same year implied. */
export function formatDayMonth(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** 25 August 2026 */
export function formatDateLong(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

/** Aug 2026 — payroll periods and similar. */
export function formatMonthYear(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** Aug 26 */
export function formatMonthYearShort(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
}

/** 14:30 — 24-hour, avoids AM/PM localisation surprises. */
export function formatTime(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`
}

/** 25/08/2026 14:30 */
export function formatDateTime(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${formatDate(d)} ${formatTime(d)}`
}

/** 25 Aug, 14:30 */
export function formatDayMonthTime(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${formatDayMonth(d)}, ${formatTime(d)}`
}

/** Mon, 25 Aug */
export function formatDayName(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** Monday, 25 August */
export function formatDayNameLong(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`
}

/**
 * "just now" · "5m ago" · "3h ago" · "yesterday" · then a real date.
 * Used for last-seen and message timestamps.
 */
export function formatRelative(v: DateInput): string {
  const d = toDate(v); if (!d) return '—'
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 0)     return formatDate(d)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 172800) return 'yesterday'
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return formatDate(d)
}

/** Chat list style: time today, "Yesterday", else 25/08/2026. */
export function formatChatStamp(v: DateInput): string {
  const d = toDate(v); if (!d) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return formatTime(d)
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return formatDate(d)
}
