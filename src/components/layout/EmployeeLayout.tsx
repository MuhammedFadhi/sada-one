import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useNotifications, useFeatureFlags } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'

const NAV = [
  { path: '/employee',  icon: 'home',           label: 'Home'    },
  { path: '/tasks',     icon: 'checkbox',        label: 'Tasks',   feature: 'tasks' },
  { path: '/chat',      icon: 'message-circle',  label: 'Chat',    feature: 'chat' },
  { path: '/employee/services', icon: 'grid-dots', label: 'Services' },
  { path: '/employee/profile',  icon: 'user',      label: 'Me'     },
]

export function EmployeeLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: notifs } = useNotifications()
  const { data: flags } = useFeatureFlags()
  const { profile } = useAuthStore()
  const unread = notifs?.filter(n => !n.is_read).length ?? 0

  // Non-employees (managers/HR/etc.) reach this self-service portal via "My Portal".
  // Their Home tab returns to their own role dashboard, not the employee home.
  const ROLE_HOME: Record<string,string> = { admin:'/admin', manager:'/manager', finance:'/hr', hr_officer:'/hr', employee:'/employee' }
  const homePath = ROLE_HOME[profile?.role ?? 'employee'] ?? '/employee'

  const featureOn = (key?: string) => {
    if (!key) return true
    const row = flags?.find(f => f.role === profile?.role && f.feature_key === key)
    return row ? row.enabled : true
  }
  const nav = NAV.filter(n => featureOn(n.feature))

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', height: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: '#0D1B2A', overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#F4F6F9' }}>
        <Outlet />
      </div>
      <div style={{
        background: '#0D1B2A',
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0',
        paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
        flexShrink: 0,
        borderTop: '0.5px solid rgba(255,255,255,.06)',
      }}>
        {nav.map(item => {
          const dest = item.path === '/employee' ? homePath : item.path
          const active = dest === homePath ? location.pathname === homePath : location.pathname.startsWith(item.path)
          const showDot = item.path === '/chat' && unread > 0
          return (
            <button key={item.path} onClick={() => navigate(dest)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                cursor: 'pointer', opacity: active ? 1 : 0.4, background: 'none', border: 'none',
                transition: 'opacity .2s', position: 'relative', minWidth: 44,
              }}>
              <div style={{ position: 'relative' }}>
                <i className={`ti ti-${item.icon}`} style={{ color: active ? '#C8A96E' : 'white', fontSize: 22 }} />
                {showDot && (
                  <div style={{ position: 'absolute', top: -2, right: -3, width: 8, height: 8, background: '#E24B4A', borderRadius: '50%', border: '1.5px solid #0D1B2A' }} />
                )}
              </div>
              <span style={{ color: active ? '#C8A96E' : 'white', fontSize: 9, fontWeight: active ? 600 : 400 }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
