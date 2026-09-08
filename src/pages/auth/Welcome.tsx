import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

export function WelcomePage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const firstName = profile?.employee?.full_name_en?.split(' ')[0] ?? 'there'

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(170deg, #0A1628 0%, #0D1B2A 60%, #111F35 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      maxWidth: 480, margin: '0 auto', padding: '32px 28px', textAlign: 'center',
    }}>
      {/* Logo */}
      <div style={{
        width: 88, height: 88, borderRadius: 24, background: 'white',
        overflow: 'hidden', padding: 6, boxShadow: '0 8px 40px rgba(0,0,0,.4)',
        marginBottom: 20,
      }}>
        <img src="/sada-one-logo.jpg" alt="SA'DA ONE" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      <div style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
        SA<span style={{ color: '#C8A96E' }}>'</span>DA ONE
      </div>
      <div style={{ color: 'rgba(255,255,255,.25)', fontSize: 10, letterSpacing: '1px', marginBottom: 32 }}>
        INTEGRATED EMPLOYEE EXPERIENCE PLATFORM
      </div>

      <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 8 }}>
        Welcome, {firstName}!
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 36, lineHeight: 1.7, maxWidth: 300 }}>
        Your all-in-one employee portal is ready. Leave, payslips, tasks, chat, and more — all in one place.
      </p>

      {/* Feature highlights */}
      <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32, textAlign: 'left', border: '1px solid rgba(255,255,255,.06)' }}>
        {[
          { icon: 'calendar-check', color: '#17B8D0', label: 'Leave requests & balance'    },
          { icon: 'wallet',         color: '#C8A96E', label: 'Payslips & salary details'   },
          { icon: 'checkbox',       color: '#1D9E75', label: 'Task manager & projects'      },
          { icon: 'message-circle', color: '#7F77DD', label: 'Team chat & direct messages'  },
          { icon: 'fingerprint',    color: '#E67E22', label: 'Attendance check-in'          },
        ].map((item, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '9px 0',
            borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,.06)' : 'none',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ti-${item.icon}`} style={{ color: item.color, fontSize: 16 }} />
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/tutorial')}
        style={{
          width: '100%', background: 'linear-gradient(135deg, #C8A96E, #A8894E)',
          color: 'white', border: 'none', borderRadius: 14, padding: 15,
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 8px 24px rgba(200,169,110,.25)', marginBottom: 12,
        }}>
        Take a Quick Tour
      </button>
      <button onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
        Skip, take me to Home
      </button>
    </div>
  )
}
