// Offline write queue for spotty-connection actions (attendance clock-in/out,
// leave requests). If a write is attempted while offline (or the network drops
// mid-request), it is stored in localStorage and replayed automatically when the
// connection returns. The UI treats a queued write as an optimistic success.
import { supabase } from '@/lib/supabase'

const KEY = 'sada.offline.queue.v1'

export type QueueKind = 'check_in' | 'check_out' | 'leave_request'
interface QueueItem { id: string; kind: QueueKind; payload: any; ts: number }

function read(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function write(items: QueueItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* quota */ }
}

export function queueLength() { return read().length }

export function enqueue(kind: QueueKind, payload: any) {
  const items = read()
  items.push({ id: crypto.randomUUID(), kind, payload, ts: Date.now() })
  write(items)
}

/** True if the thrown error is a network/offline failure (safe to queue), not a server rejection. */
export function isNetworkError(err: any): boolean {
  if (!navigator.onLine) return true
  const m = String(err?.message ?? err ?? '').toLowerCase()
  return m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed') || m.includes('fetch')
}

// Per-kind replay. Returns true if the item is done (remove), false to keep (retry later).
async function replay(item: QueueItem): Promise<boolean> {
  try {
    if (item.kind === 'check_in') {
      const { error } = await supabase.from('attendance_logs').upsert(item.payload, { onConflict: 'employee_id,date' })
      return !error
    }
    if (item.kind === 'check_out') {
      const { employee_id, date, check_out } = item.payload
      const { data: log } = await supabase.from('attendance_logs').select('check_in')
        .eq('employee_id', employee_id).eq('date', date).single()
      const checkIn = log?.check_in ? new Date(log.check_in) : new Date(check_out)
      const hours = (new Date(check_out).getTime() - checkIn.getTime()) / 1000 / 3600
      const { error } = await supabase.from('attendance_logs')
        .update({ check_out, hours_worked: Math.round(hours * 100) / 100 })
        .eq('employee_id', employee_id).eq('date', date)
      return !error
    }
    if (item.kind === 'leave_request') {
      const { error } = await supabase.from('leave_requests').insert(item.payload)
      return !error
    }
    return true // unknown kind — drop
  } catch (err) {
    return !isNetworkError(err) // network error -> keep; server error -> drop (won't ever succeed)
  }
}

let flushing = false
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0
  flushing = true
  try {
    let items = read()
    if (!items.length) return 0
    const keep: QueueItem[] = []
    let done = 0
    for (const item of items) {
      const ok = await replay(item)
      if (ok) done++; else keep.push(item)
    }
    write(keep)
    return done
  } finally { flushing = false }
}

/** Call once at app start: flush now + whenever the connection returns. */
export function initOfflineQueue(onFlushed?: (n: number) => void) {
  const run = () => flushQueue().then(n => { if (n > 0) onFlushed?.(n) })
  window.addEventListener('online', run)
  // flush shortly after load (SW + auth settle first)
  setTimeout(run, 3000)
}
