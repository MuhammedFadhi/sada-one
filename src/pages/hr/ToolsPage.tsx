import { useNavigate } from 'react-router-dom'
import { StatusBar, PageContent } from '@/components/ui'

const TOOLS = [
  { icon:'user-plus',     color:'#17B8D0', label:'Add Employee',       desc:'Onboard a new hire',        path:'/hr/employees/new' },
  { icon:'activity',      color:'#0EA5E9', label:'Users & Activity',   desc:'Who is online, last seen',  path:'/hr/activity' },
  { icon:'file-text',     color:'#7F77DD', label:'HR Requests',        desc:'Process document requests', path:'/hr/requests' },
  { icon:'user-check',    color:'#1D9E75', label:'Onboarding',         desc:'Track new hire progress',   path:'/hr/onboarding' },
  { icon:'user-x',        color:'#E67E22', label:'Offboarding',        desc:'Manage exits & clearance',  path:'/hr/offboarding' },
  { icon:'calendar-stats',color:'#C8A96E', label:'Document Tracking',  desc:'Iqama & passport expiry',   path:'/hr/documents' },
  { icon:'chart-bar',     color:'#E24B4A', label:'HR Reports',         desc:'Workforce analytics',        path:'/hr/reports' },
]

export function HRToolsPage() {
  const navigate = useNavigate()
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>HR Tools</h1></div>
      </div>
      <PageContent>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {TOOLS.map(t=>(
            <button key={t.path} onClick={()=>navigate(t.path)}
              style={{background:'white',borderRadius:16,padding:16,border:'none',cursor:'pointer',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',flexDirection:'column',gap:10}}>
              <div style={{width:46,height:46,borderRadius:13,background:t.color+'18',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className={`ti ti-${t.icon}`} style={{color:t.color,fontSize:24}} />
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{t.label}</div>
                <div style={{fontSize:11,color:'#718096',marginTop:3,lineHeight:1.4}}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </PageContent>
    </div>
  )
}
