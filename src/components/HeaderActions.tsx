import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications, useMarkNotificationRead } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { BottomSheet } from '@/components/ui'
import { formatDayMonthTime } from '@/lib/dates'

/**
 * Notification bell + sign-out, for the dark role dashboard headers.
 * Gives every role (admin/HR/finance/manager/employee) a reliable way to
 * log out and see notifications from any home screen.
 */
export function HeaderActions() {
  const navigate = useNavigate()
  const { signOut } = useAuthStore()
  const { data: notifications } = useNotifications()
  const markRead = useMarkNotificationRead()
  const [open, setOpen] = useState(false)

  const unread = notifications?.filter(n => !n.is_read).length ?? 0

  const handleLogout = async () => {
    await signOut()
    navigate('/auth/login', { replace: true })
  }

  const openNotif = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id)
    if (n.data?.link) { setOpen(false); navigate(n.data.link) }
  }

  const btn: React.CSSProperties = {
    position: 'relative', background: 'rgba(255,255,255,.1)', border: 'none',
    borderRadius: 10, width: 38, height: 38, display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button aria-label="Notifications" onClick={() => navigate('/notifications')} style={btn}>
        <i className="ti ti-bell" style={{ color: 'white', fontSize: 19 }} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8, background: '#E24B4A', color: 'white', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      <button aria-label="Sign out" onClick={handleLogout} style={btn}>
        <i className="ti ti-logout" style={{ color: 'white', fontSize: 19 }} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Notifications">
        {!notifications?.length && (
          <div style={{ textAlign: 'center', padding: 24, color: '#718096', fontSize: 13 }}>
            <i className="ti ti-bell-off" style={{ fontSize: 32, color: '#CBD5E0', display: 'block', marginBottom: 8 }} />
            You're all caught up
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications?.map(n => (
            <button key={n.id} onClick={() => openNotif(n)}
              style={{
                textAlign: 'left', width: '100%', background: n.is_read ? '#F7FAFC' : '#EBF8FF',
                border: 'none', borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: 'inherit',
              }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : '#17B8D0', marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{n.body}</div>}
                <div style={{ fontSize: 10, color: '#A0AEC0', marginTop: 4 }}>
                  {formatDayMonthTime(n.created_at)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
