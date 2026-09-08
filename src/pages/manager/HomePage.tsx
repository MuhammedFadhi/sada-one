import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useMyTeam, usePendingApprovals, useLeaveRequests } from '@/hooks/useData'
import { StatusBar, PageContent, Avatar, StatStrip } from '@/components/ui'
import { DashHeader } from '@/components/DashHeader'

const NAV = [
  {path:'/manager/approvals',icon:'circle-check',color:'#1D9E75',label:'Approvals'},
  {path:'/manager/team',icon:'users',color:'#17B8D0',label:'My Team'},
  {path:'/manager/reports',icon:'chart-bar',color:'#C8A96E',label:'Reports'},
  {path:'/employee',icon:'user',color:'#7F77DD',label:'My Portal'},
]

export function ManagerHomePage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { data: team } = useMyTeam()
  const { data: approvals } = usePendingApprovals()

  const totalPending = (approvals?.leave?.length??0) + (approvals?.loans?.length??0)
  const presentToday = team?.filter((m:any) => m.today_attendance?.[0]?.check_in).length ?? 0
  const onLeave = team?.filter((m:any) => m.status==='on_leave').length ?? 0

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:20}}>
        <DashHeader label="Manager Dashboard" title={`${profile?.employee?.full_name_en?.split(' ')[0] ?? ''}'s Team`} />
        {/* Quick nav */}
        <div style={{padding:'0 12px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
          {NAV.map(n=>(
            <button key={n.path} onClick={()=>navigate(n.path)}
              style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:14,boxShadow:'inset 0 1px 0 rgba(255,255,255,.06)',padding:'10px 6px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
              <i className={`ti ti-${n.icon}`} style={{color:n.color,fontSize:20}} />
              <span style={{color:'rgba(255,255,255,.72)',fontSize:10}}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>
      <PageContent>
        <StatStrip stats={[
          {label:'Team Size', value:team?.length??0, color:'#17B8D0'},
          {label:'Present',   value:presentToday,    color:'#1D9E75'},
          {label:'On Leave',  value:onLeave,          color:'#7F77DD'},
          {label:'Pending',   value:totalPending,     color:'#E67E22'},
        ]} />

        {totalPending>0 && (
          <button onClick={()=>navigate('/manager/approvals')}
            style={{width:'100%',background:'#E67E22',color:'white',border:'none',borderRadius:12,padding:'12px 16px',marginBottom:14,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:500}}>
            <i className="ti ti-bell-ringing" style={{fontSize:20}} />
            <span style={{flex:1,textAlign:'left'}}>{totalPending} request{totalPending!==1?'s':''} waiting for your approval</span>
            <i className="ti ti-chevron-right" />
          </button>
        )}

        <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Team Status — Today</div>
        {team?.map((member: any) => {
          const att = member.today_attendance?.[0]
          const isPresent = !!att?.check_in
          const statusColor = member.status==='on_leave'?'#7F77DD':isPresent?'#1D9E75':'#E24B4A'
          const statusLabel = member.status==='on_leave'?'On Leave':isPresent?'Present':'Absent'
          return (
            <div key={member.id} onClick={()=>navigate(`/manager/team/${member.id}`)}
              style={{background:'white',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:6,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{position:'relative'}}>
                <Avatar name={member.full_name_en} size={38} />
                <div style={{position:'absolute',bottom:0,right:0,width:10,height:10,borderRadius:'50%',background:statusColor,border:'1.5px solid white'}} />
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{member.full_name_en}</div>
                <div style={{fontSize:11,color:'#718096'}}>{member.job_title_en}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,fontWeight:500,color:statusColor}}>{statusLabel}</div>
                {att?.check_in && <div style={{fontSize:10,color:'#CBD5E0'}}>{new Date(att.check_in).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false})}</div>}
              </div>
            </div>
          )
        })}
        {!team?.length && <div style={{textAlign:'center',padding:32,color:'#718096',fontSize:13}}>No team members yet</div>}
      </PageContent>
    </div>
  )
}
