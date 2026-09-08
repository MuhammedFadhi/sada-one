import { useNavigate } from 'react-router-dom'
import { useEmployees, useHRRequests, useExpiringDocuments, useOnboardingChecklist } from '@/hooks/useData'
import { StatusBar, PageContent, StatStrip, SectionHeader, Avatar, DocExpiryCard, MiniBarChart } from '@/components/ui'
import { DashHeader } from '@/components/DashHeader'
import { useAuthStore } from '@/store/auth.store'

export function HRHomePage() {
  const navigate = useNavigate()
  const { } = useAuthStore()
  const { data: employees } = useEmployees()
  const { data: requests } = useHRRequests()
  const { data: expDocs } = useExpiringDocuments(90)

  const active = employees?.filter(e=>e.status==='active').length??0
  const pending = requests?.filter((r:any)=>r.status==='pending').length??0
  const expiring30 = expDocs?.filter(d=>{const days=Math.ceil((new Date(d.expiry_date!).getTime()-Date.now())/86400000);return days<=30}).length??0

  const byDept = Object.entries((employees ?? []).reduce((acc: Record<string, number>, e: any) => { const d = e.division?.name_en ?? 'Unassigned'; acc[d] = (acc[d] ?? 0) + 1; return acc }, {})).map(([label, value]) => ({ label, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 6)

  const QUICK = [
    {icon:'user-plus',color:'#17B8D0',bg:'#EBF8FF',label:'Add Employee',path:'/hr/employees/new'},
    {icon:'users',color:'#1D9E75',bg:'#E6FAF0',label:'All Employees',path:'/hr/employees'},
    {icon:'file-text',color:'#C8A96E',bg:'#FFF8EC',label:'Requests',path:'/hr/requests'},
    {icon:'id-badge',color:'#E67E22',bg:'#FFF3E0',label:'Documents',path:'/hr/documents'},
    {icon:'user-check',color:'#7F77DD',bg:'#F5F0FF',label:'Onboarding',path:'/hr/onboarding'},
    {icon:'chart-bar',color:'#E24B4A',bg:'#FFF0F0',label:'Reports',path:'/hr/reports'},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:20}}>
        <DashHeader label={"HR & Finance"} title={"People & Finance"} />
        <div style={{padding:'0 12px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
          {QUICK.map(q=>(
            <button key={q.path} onClick={()=>navigate(q.path)}
              style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:14,boxShadow:'inset 0 1px 0 rgba(255,255,255,.06)',padding:'10px 6px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
              <div style={{width:34,height:34,borderRadius:10,background:q.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className={`ti ti-${q.icon}`} style={{color:q.color,fontSize:17}} />
              </div>
              <span style={{color:'rgba(255,255,255,.72)',fontSize:10}}>{q.label}</span>
            </button>
          ))}
        </div>
      </div>
      <PageContent>
        <StatStrip stats={[
          {label:'Active Emp.',  value:active,    color:'#17B8D0'},
          {label:'Pending Req', value:pending,   color:'#E67E22'},
          {label:'Doc Expiry',  value:expiring30,color:'#E24B4A', sub:'30 days'},
        ]} />
        {byDept.length > 0 && <MiniBarChart title="Headcount by Department" data={byDept} action="All Employees" onAction={()=>navigate('/hr/employees')} />}
        {pending>0 && (
          <button onClick={()=>navigate('/hr/requests')}
            style={{width:'100%',background:'#E67E22',color:'white',border:'none',borderRadius:12,padding:'12px 16px',marginBottom:14,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:500}}>
            <i className="ti ti-file-text" style={{fontSize:20}} />
            <span style={{flex:1,textAlign:'left'}}>{pending} pending HR request{pending!==1?'s':''}</span>
            <i className="ti ti-chevron-right" />
          </button>
        )}
        {expDocs && expDocs.length>0 && (
          <>
            <SectionHeader title="Expiring Documents" action="View All" onAction={()=>navigate('/hr/documents')} />
            {expDocs.slice(0,4).map((d:any)=>(
              <div key={d.id} style={{background:'white',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:6,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <Avatar name={d.employee?.full_name_en??'?'} size={34} />
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:'#1A202C'}}>{d.employee?.full_name_en}</div>
                  <div style={{fontSize:11,color:'#718096'}}>{d.doc_name}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  {(() => {
                    const days = Math.ceil((new Date(d.expiry_date).getTime()-Date.now())/86400000)
                    const color = days<30?'#E24B4A':days<60?'#E67E22':'#CBD5E0'
                    return <span style={{fontSize:11,fontWeight:600,color}}>{days}d</span>
                  })()}
                </div>
              </div>
            ))}
          </>
        )}
      </PageContent>
    </div>
  )
}
