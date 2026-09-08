import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useEmployees } from '@/hooks/useData'
import { StatusBar, PageContent, MiniBarChart } from '@/components/ui'
import { DashHeader } from '@/components/DashHeader'
import { NumberTicker } from '@/components/magicui/number-ticker'

const CARDS = [
  { path:'/admin/users',     icon:'users',          color:'#17B8D0', bg:'#EBF8FF', label:'User Management'    },
  { path:'/admin/roles',     icon:'shield-lock',    color:'#7F77DD', bg:'#F5F0FF', label:'Roles & Permissions' },
  { path:'/admin/divisions', icon:'building',       color:'#1D9E75', bg:'#E6FAF0', label:'Divisions & Depts'   },
  { path:'/admin/settings',  icon:'settings',       color:'#C8A96E', bg:'#FFF8EC', label:'Settings'            },
  { path:'/admin/audit',     icon:'history',        color:'#E67E22', bg:'#FFF3E0', label:'Audit Log'           },
]

export function AdminHomePage() {
  const navigate = useNavigate()
  const { initialized } = useAuthStore()
  const { data: employees } = useEmployees()

  const active   = employees?.filter(e => e.status === 'active').length ?? 0
  const inactive = employees?.filter(e => e.status !== 'active').length ?? 0

  const byDept = Object.entries((employees ?? []).reduce((acc: Record<string, number>, e: any) => { const d = e.division?.name_en ?? 'Unassigned'; acc[d] = (acc[d] ?? 0) + 1; return acc }, {})).map(([label, value]) => ({ label, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 6)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ background:'linear-gradient(135deg, #0D1B2A 0%, #17294A 100%)', paddingBottom:16 }}>
        <DashHeader label="Administrator" title="Admin Dashboard" variant="admin" />
      </div>
      <PageContent>
        {/* Nav cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
          {CARDS.map(c => (
            <button key={c.path} onClick={() => navigate(c.path)}
              style={{ background:'white', border:'none', borderRadius:16, padding:'14px 8px', cursor:'pointer',
                display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                boxShadow:'0 1px 2px rgba(13,27,42,.04), 0 6px 20px rgba(13,27,42,.05)',
                transition:'transform .2s, box-shadow .2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 20px rgba(0,0,0,.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 12px rgba(0,0,0,.07)' }}
            >
              <div style={{ width:44, height:44, borderRadius:12, background:c.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className={`ti ti-${c.icon}`} style={{ color:c.color, fontSize:22 }} />
              </div>
              <span style={{ fontSize:10, fontWeight:600, color:'#4A5568', textAlign:'center', lineHeight:1.3 }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ background:'white', borderRadius:14, padding:16, boxShadow:'0 1px 2px rgba(13,27,42,.04), 0 6px 20px rgba(13,27,42,.05)', position:'relative', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            {[
              { label:'Total Employees', value:employees?.length ?? 0, color:'#17B8D0' },
              { label:'Active',          value:active,                  color:'#1D9E75' },
              { label:'Inactive',        value:inactive,                color:'#E67E22' },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontSize:26, fontWeight:700, color:s.color }}><NumberTicker value={s.value} /></div>
                <div style={{ fontSize:10, color:'#718096', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop:'0.5px solid #F0F0F0', paddingTop:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#1A202C', marginBottom:10 }}>Quick Actions</div>
            {[
              { label:'Add New Employee', icon:'user-plus',  color:'#17B8D0', path:'/hr/employees/new' },
              { label:'Post Announcement', icon:'speakerphone', color:'#7F77DD', path:'/employee/announcements' },
              { label:'View Audit Trail', icon:'history',    color:'#E67E22', path:'/admin/audit' },
            ].map((a,i) => (
              <button key={i} onClick={() => navigate(a.path)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 12px',
                  background:'#F4F6F9', border:'none', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                  marginBottom:6, transition:'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#EBF8FF'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='#F4F6F9'}
              >
                <div style={{ width:32, height:32, borderRadius:9, background:`${a.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={`ti ti-${a.icon}`} style={{ color:a.color, fontSize:17 }} />
                </div>
                <span style={{ fontSize:13, color:'#1A202C', fontWeight:500 }}>{a.label}</span>
                <i className="ti ti-chevron-right" style={{ color:'#CBD5E0', fontSize:16, marginLeft:'auto' }} />
              </button>
            ))}
          </div>
        </div>

        {byDept.length > 0 && <div style={{ marginTop: 12 }}><MiniBarChart title="Workforce by Department" data={byDept} action="Manage" onAction={()=>navigate('/admin/divisions')} /></div>}
      </PageContent>
    </div>
  )
}
