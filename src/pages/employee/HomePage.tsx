import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import {
  useNotifications, useLeaveBalances, useLeaveRequests, useAnnouncements, useMyTasks
} from '@/hooks/useData'
import { StatusBar } from '@/components/ui'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { MagicCard } from '@/components/magicui/magic-card'
import { BlurFade } from '@/components/magicui/blur-fade'
import { Marquee } from '@/components/magicui/marquee'

const SERVICES = [
  { icon: 'calendar-check',  color: '#17B8D0', label: 'Leave',        path: '/employee/leave'        },
  { icon: 'fingerprint',     color: '#1D9E75', label: 'Attendance',   path: '/employee/attendance'   },
  { icon: 'file-text',       color: '#7F77DD', label: 'HR Requests',  path: '/employee/hr-requests'  },
  { icon: 'users',           color: '#E67E22', label: 'Directory',    path: '/employee/directory'    },
  { icon: 'book-2',          color: '#E24B4A', label: 'Policies',     path: '/employee/policies'     },
  { icon: 'chart-bar',       color: '#17B8D0', label: 'Performance',  path: '/employee/performance'  },
  { icon: 'tool',            color: '#C8A96E', label: 'Assets',       path: '/employee/assets'       },
]

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }
const item      = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

export function EmployeeHomePage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { data: notifs }    = useNotifications()
  const { data: leaveData } = useLeaveBalances(profile?.employee_id ?? '')
  const { data: tasks }     = useMyTasks()
  const { data: announcements } = useAnnouncements()

  const unreadNotifs = notifs?.filter((n: any) => !n.is_read).length ?? 0
  const annualBalance = leaveData?.find((b: any) => b.leave_type === 'annual')
  const remainingLeave = (annualBalance?.entitled_days ?? 0) - (annualBalance?.taken_days ?? 0)
  const openTasks = tasks?.length ?? 0
  const firstName = profile?.employee?.full_name_en?.split(' ')[0] ?? 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F4F6F9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #0D1B2A 0%, #17294A 100%)', paddingBottom: 24, flexShrink: 0 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'white', overflow: 'hidden', padding: 2 }}>
              <img src="/sada-one-logo.jpg" alt="SA'DA ONE" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}>
              SA<span style={{ color: '#C8A96E' }}>'</span>DA ONE
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button aria-label="Messages" onClick={() => navigate('/chat')} style={{ position: 'relative', background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-message-circle" style={{ color: 'rgba(255,255,255,.7)', fontSize: 18 }} />
            </button>
            <button aria-label="Notifications" onClick={() => navigate('/notifications')} style={{ position: 'relative', background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-bell" style={{ color: 'rgba(255,255,255,.7)', fontSize: 18 }} />
              {unreadNotifs > 0 && (
                <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#E24B4A', borderRadius: '50%', border: '1.5px solid #17294A' }} />
              )}
            </button>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ padding: '16px 16px 0' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 12 }}>{greeting},</div>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 700, letterSpacing: '-.3px' }}>{firstName} 👋</div>
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '14px 14px 0' }}>
          {[
            { label: 'Leave Days',   value: remainingLeave, color: '#17B8D0', icon: 'calendar' },
            { label: 'Open Tasks',   value: openTasks,       color: '#C8A96E', icon: 'checkbox' },
            { label: 'Notifications', value: unreadNotifs,  color: '#1D9E75', icon: 'bell'    },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 12, padding: '10px 12px', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <i className={`ti ti-${s.icon}`} style={{ color: s.color, fontSize: 13 }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>{s.label.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>
                <NumberTicker value={s.value} className="text-white" />
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 80px' }}>

        {/* Announcements marquee */}
        {announcements && announcements.length > 0 && (
          <BlurFade delay={0.1} className="mb-3">
            <div style={{ background: 'white', borderRadius: 12, padding: '8px 0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <Marquee speed={30} pauseOnHover>
                {announcements.map((a: any) => (
                  <div key={a.id} onClick={() => navigate('/employee/announcements')}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.tag === 'urgent' ? '#E24B4A' : '#17B8D0', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#4A5568', whiteSpace: 'nowrap' }}>{a.title_en}</span>
                  </div>
                ))}
              </Marquee>
            </div>
          </BlurFade>
        )}

        {/* Services grid */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', letterSpacing: '.5px', marginBottom: 10 }}>QUICK ACCESS</div>
        <motion.div
          variants={container} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {SERVICES.map(s => (
            <motion.button key={s.path} variants={item} onClick={() => navigate(s.path)}
              style={{ background: 'white', border: 'none', borderRadius: 14, padding: '12px 6px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, boxShadow: '0 1px 4px rgba(0,0,0,.06)', transition: 'transform .2s, box-shadow .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ti-${s.icon}`} style={{ color: s.color, fontSize: 20 }} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#4A5568', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* My Tasks preview */}
        {openTasks > 0 && (
          <BlurFade delay={0.2}>
            <MagicCard className="mb-3 cursor-pointer" onClick={() => navigate('/tasks')} gradientColor="#17B8D0">
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#17B8D0' + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-checkbox" style={{ color: '#17B8D0', fontSize: 20 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>Open Tasks</div>
                  <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
                    <NumberTicker value={openTasks} /> task{openTasks !== 1 ? 's' : ''} need your attention
                  </div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: '#CBD5E0', fontSize: 18 }} />
              </div>
            </MagicCard>
          </BlurFade>
        )}

        {/* More services */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', letterSpacing: '.5px', marginBottom: 10 }}>MORE</div>
        <motion.div variants={container} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: 'cash',        color: '#C8A96E', label: 'Loan Requests',  sub: 'Apply or track loans',              path: '/employee/loans'        },
            { icon: 'plane',       color: '#17B8D0', label: 'Exit / Re-Entry', sub: 'Permit applications',              path: '/employee/exit'         },
            { icon: 'receipt',     color: '#1D9E75', label: 'Expense Claims', sub: 'Submit reimbursements',             path: '/employee/expenses'     },
            { icon: 'bulb',        color: '#E24B4A', label: 'Suggestions',     sub: 'Share ideas and feedback'  ,         path: '/employee/suggestions'  },
          ].map((s, i) => (
            <motion.button key={s.path} variants={item} onClick={() => navigate(s.path)}
              style={{ width: '100%', background: 'white', border: 'none', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', textAlign: 'left', transition: 'transform .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ti-${s.icon}`} style={{ color: s.color, fontSize: 19 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A202C' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#718096', marginTop: 1 }}>{s.sub}</div>
              </div>
              <i className="ti ti-chevron-right" style={{ color: '#CBD5E0', fontSize: 16 }} />
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
