import { useAuthStore } from '@/store/auth.store'
import { useMyTeam, useLeaveRequests } from '@/hooks/useData'
import { StatusBar, PageContent, Avatar, StatStrip } from '@/components/ui'

export function ManagerReportsPage() {
  const { data: team } = useMyTeam()
  const { data: leaveReqs } = useLeaveRequests()

  const teamIds = team?.map((m:any) => m.id) ?? []
  const teamLeave = leaveReqs?.filter((r:any) => teamIds.includes(r.employee_id)) ?? []
  const pending   = teamLeave.filter((r:any) => r.status==='pending').length
  const approved  = teamLeave.filter((r:any) => r.status==='approved').length
  const present   = team?.filter((m:any) => m.today_attendance?.[0]?.check_in).length ?? 0
  const onLeave   = team?.filter((m:any) => m.status==='on_leave').length ?? 0

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Team Reports</h1></div>
      </div>
      <PageContent>
        <StatStrip stats={[
          {label:'Team Size', value:team?.length??0, color:'#17B8D0'},
          {label:'Present',   value:present,         color:'#1D9E75'},
          {label:'On Leave',  value:onLeave,          color:'#7F77DD'},
        ]} />

        {/* Leave Summary */}
        <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Leave Summary</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          {[{label:'Pending Requests',value:pending,color:'#E67E22',bg:'#FFF3E0'},{label:'Approved This Month',value:approved,color:'#1D9E75',bg:'#E6FAF0'}].map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:12,padding:12,textAlign:'center'}}>
              <div style={{fontSize:24,fontWeight:700,color:s.color}}>{s.value}</div>
              <div style={{fontSize:11,color:s.color,marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Team Attendance Today */}
        <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Today's Attendance</div>
        {team?.map((m:any)=>{
          const att = m.today_attendance?.[0]
          const isPresent = !!att?.check_in
          const isOnLeave = m.status==='on_leave'
          const statusColor = isOnLeave?'#7F77DD':isPresent?'#1D9E75':'#E24B4A'
          const statusLabel = isOnLeave?'On Leave':isPresent?`In ${att.check_in?new Date(att.check_in).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}):''}`:' Absent'
          const hours = att?.hours_worked ? `${att.hours_worked}h` : att?.check_in && !att?.check_out ? 'Active' : '—'
          return (
            <div key={m.id} style={{background:'white',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:6,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <Avatar name={m.full_name_en} size={36} />
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{m.full_name_en}</div>
                <div style={{fontSize:11,color:statusColor,marginTop:2}}>{statusLabel}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12,fontWeight:500,color:'#718096'}}>{hours}</div>
              </div>
            </div>
          )
        })}

        {/* Leave history */}
        {teamLeave.length > 0 && (
          <>
            <div style={{fontSize:13,fontWeight:600,color:'#1A202C',margin:'16px 0 8px'}}>Recent Leave Requests</div>
            {teamLeave.slice(0,10).map((r:any)=>(
              <div key={r.id} style={{background:'white',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:'#1A202C'}}>{r.employee?.full_name_en}</div>
                  <div style={{fontSize:11,color:'#718096',marginTop:1,textTransform:'capitalize'}}>{r.leave_type} · {r.days_count} day{r.days_count!==1?'s':''}</div>
                </div>
                <span className={`badge badge-${r.status==='approved'?'success':r.status==='rejected'?'danger':'warning'}`}>{r.status}</span>
              </div>
            ))}
          </>
        )}
      </PageContent>
    </div>
  )
}
