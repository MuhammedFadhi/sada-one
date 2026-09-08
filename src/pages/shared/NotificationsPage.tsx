// ============================================================
// SA'DA ONE — Notifications Center (/notifications, all roles)
// ============================================================
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useData'
import { StatusBar, SkeletonList } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { isPushConfigured, getPushState, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import toast from 'react-hot-toast'
import { formatDayMonth } from '@/lib/dates'

// Web Push opt-in. Renders nothing until VAPID is configured (VITE_VAPID_PUBLIC_KEY),
// so there is no broken control before push is set up.
function PushBell() {
  const { user } = useAuthStore()
  const [state, setState] = useState<'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('unsupported')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (isPushConfigured()) getPushState().then(setState) }, [])
  if (state === 'unsupported') return null
  const toggle = async () => {
    if (busy || !user?.id) return
    setBusy(true)
    try {
      if (state === 'subscribed') { await unsubscribeFromPush(); setState('unsubscribed'); toast('Push notifications off') }
      else {
        const ok = await subscribeToPush(user.id)
        if (ok) { setState('subscribed'); toast.success('Push notifications on') }
        else { setState(Notification.permission === 'denied' ? 'denied' : 'unsubscribed'); toast.error('Could not enable push') }
      }
    } finally { setBusy(false) }
  }
  const on = state === 'subscribed'
  return (
    <button onClick={toggle} disabled={busy || state === 'denied'} title={state === 'denied' ? 'Blocked in browser settings' : on ? 'Disable push' : 'Enable push'}
      style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: state === 'denied' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: state === 'denied' ? 0.5 : 1 }}>
      <i className={`ti ti-bell${on ? '-ringing' : state === 'denied' ? '-off' : ''}`} style={{ color: on ? '#17B8D0' : 'white', fontSize: 19 }} />
    </button>
  )
}

const TYPE_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  approval:     { icon: 'clipboard-check', color: '#E67E22', bg: '#FEF5EC' },
  status:       { icon: 'circle-check',    color: '#1D9E75', bg: '#EAF7F1' },
  task:         { icon: 'checkbox',        color: '#17B8D0', bg: '#EBF8FF' },
  chat_message: { icon: 'message-circle',  color: '#8B5CF6', bg: '#F3EFFE' },
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll  = useMarkAllNotificationsRead()

  const unread = notifications?.filter(n => !n.is_read).length ?? 0

  const open = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id)
    const link = n.data?.link
    if (link) navigate(link)
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7)  return `${d}d ago`
    return formatDayMonth(iso)
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#F4F6F9', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: '#0D1B2A', flexShrink: 0 }}>
        <StatusBar />
        <div style={{ padding: '6px 12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button aria-label="Back" onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-chevron-left" style={{ color: 'white', fontSize: 20 }} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Notifications</h1>
            {unread > 0 && <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 11 }}>{unread} unread</p>}
          </div>
          <PushBell />
          {unread > 0 && (
            <button onClick={() => markAll.mutate()}
              style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: '#17B8D0', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, WebkitOverflowScrolling: 'touch' }}>
        {isLoading && <div style={{ padding: '4px 0' }}><SkeletonList rows={5} /></div>}

        {!isLoading && !notifications?.length && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <i className="ti ti-bell-off" style={{ fontSize: 44, color: '#CBD5E0', display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>You're all caught up</div>
            <div style={{ fontSize: 12, color: '#A0AEC0' }}>Request updates, task assignments and messages will appear here.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications?.map(n => {
            const t = TYPE_ICON[n.type] ?? { icon: 'bell', color: '#718096', bg: '#F4F6F9' }
            return (
              <button key={n.id} onClick={() => open(n)}
                style={{
                  textAlign: 'left', width: '100%', background: 'white',
                  border: n.is_read ? '1px solid transparent' : '1px solid rgba(23,184,208,.25)',
                  borderRadius: 14, padding: '13px 14px', cursor: 'pointer',
                  display: 'flex', gap: 12, alignItems: 'flex-start', fontFamily: 'inherit',
                  boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ti-${t.icon}`} style={{ color: t.color, fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: '#1A202C', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                    {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#17B8D0', flexShrink: 0 }} />}
                  </div>
                  {n.body && <div style={{ fontSize: 12, color: '#718096', marginTop: 2, lineHeight: 1.45 }}>{n.body}</div>}
                  <div style={{ fontSize: 10, color: '#A0AEC0', marginTop: 5 }}>{timeAgo(n.created_at)}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
