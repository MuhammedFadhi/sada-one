// ============================================================
// Auto-prompts for notification permission after sign-in, so people
// don't have to discover the bell icon.
//
// It deliberately shows an in-app card FIRST and calls the browser
// permission API from the button tap. iOS Safari only grants
// permission from a user gesture, and a bare auto-request in Chrome
// is a one-shot — if it's dismissed, the browser blocks it for good.
// One tap costs the user nothing and keeps the second chance.
// ============================================================
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { isPushConfigured, getPushState, subscribeToPush } from '@/lib/push'
import toast from 'react-hot-toast'

const SNOOZE_KEY = 'sada-push-prompt-snoozed'

export function PushPrompt() {
  const { user } = useAuthStore()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user || !isPushConfigured()) return
    if (localStorage.getItem(SNOOZE_KEY)) return
    let cancelled = false
    const t = setTimeout(async () => {
      const state = await getPushState()
      // 'denied' means the browser already refused — asking again does nothing.
      if (!cancelled && state === 'unsubscribed') setShow(true)
    }, 2500)   // let the dashboard paint first
    return () => { cancelled = true; clearTimeout(t) }
  }, [user])

  if (!show) return null

  const enable = async () => {
    setBusy(true)
    try {
      const ok = await subscribeToPush(user!.id)
      if (ok) { toast.success('Notifications on'); setShow(false) }
      else { toast.error('Notifications were blocked in your browser settings'); dismiss() }
    } catch { toast.error('Could not enable notifications'); dismiss() }
    finally { setBusy(false) }
  }
  const dismiss = () => { localStorage.setItem(SNOOZE_KEY, '1'); setShow(false) }

  return (
    <div style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(72px + env(safe-area-inset-bottom))', zIndex: 900 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 14, boxShadow: '0 12px 32px rgba(13,27,42,.20)', border: '1px solid #E2E8F0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: '#EBF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-bell-ringing" style={{ color: '#17B8D0', fontSize: 19 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>Turn on notifications</div>
          <div style={{ fontSize: 11.5, color: '#718096', marginTop: 3, lineHeight: 1.45 }}>
            Get approvals, tasks and messages on your phone as they happen.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={enable} disabled={busy}
              style={{ flex: 1, background: '#17B8D0', color: 'white', border: 'none', borderRadius: 9, padding: '9px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? .7 : 1 }}>
              {busy ? 'Enabling…' : 'Enable'}
            </button>
            <button onClick={dismiss}
              style={{ background: '#F4F6F9', color: '#718096', border: 'none', borderRadius: 9, padding: '9px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
