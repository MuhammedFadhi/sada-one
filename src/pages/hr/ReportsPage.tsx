import { useEmployees, useLeaveRequests, useExpiringDocuments } from '@/hooks/useData'
import { StatusBar, PageContent, StatStrip, ProgressBar } from '@/components/ui'

// Percentage of the largest entry, safe when the data is empty or all zero.
function pctOfMax(value: unknown, entries: [string, unknown][]): number {
  const v = Number(value) || 0
  const max = Number(entries[0]?.[1]) || 0
  if (max <= 0) return 0
  return Math.min(100, Math.round((v / max) * 100))
}

export function HRReportsPage() {
  const { data: employees } = useEmployees()
  const { data: leaveReqs } = useLeaveRequests()
  const { data: expDocs }   = useExpiringDocuments(90)

  const active     = employees?.filter(e=>e.status==='active').length??0
  const onLeave    = employees?.filter(e=>e.status==='on_leave').length??0
  const offboarding= employees?.filter(e=>e.status==='offboarding').length??0
  const total      = employees?.length??0
  const saudi      = employees?.filter(e=>e.nationality==='Saudi').length??0
  const expat      = total-saudi

  const byDivision = Object.entries(
    employees?.reduce((acc:any,e)=>{const d=e.division?.name_en??'Unassigned';acc[d]=(acc[d]??0)+1;return acc},{})??{}
  ).sort((a:any,b:any)=>b[1]-a[1])

  const leaveByType = Object.entries(
    leaveReqs?.filter(r=>r.status==='approved').reduce((acc:any,r)=>{acc[r.leave_type]=(acc[r.leave_type]??0)+r.days_count;return acc},{})??{}
  ).sort((a:any,b:any)=>(b[1] as number) - (a[1] as number))

  const COLORS = ['#17B8D0','#C8A96E','#1D9E75','#7F77DD','#E67E22','#E24B4A','#17294A','#718096']

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>HR Reports</h1></div>
      </div>
      <PageContent>
        <StatStrip stats={[{label:'Total',value:total,color:'#17B8D0'},{label:'Active',value:active,color:'#1D9E75'},{label:'On Leave',value:onLeave,color:'#7F77DD'},{label:'Offboarding',value:offboarding,color:'#E67E22'}]} />

        {/* Workforce Composition */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:12}}>Workforce Composition</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[{label:'Saudi Nationals',val:saudi,pct:total?Math.round(saudi/total*100):0,color:'#17B8D0'},{label:'Expats',val:expat,pct:total?Math.round(expat/total*100):0,color:'#C8A96E'}].map((x,i)=>(
              <div key={i} style={{background:'#F4F6F9',borderRadius:10,padding:12,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:x.color}}>{x.val}</div>
                <div style={{fontSize:11,color:'#718096'}}>{x.label}</div>
                <div style={{fontSize:11,color:x.color,fontWeight:600}}>{x.pct}%</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,fontWeight:500,color:'#4A5568',marginBottom:8}}>By Division</div>
          {byDivision.map(([div,count]:any,i)=>(
            <div key={div} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#4A5568',marginBottom:3}}>
                <span>{div}</span><span style={{color:COLORS[i%COLORS.length],fontWeight:600}}>{count}</span>
              </div>
              <ProgressBar value={total?Math.round(count/total*100):0} color={COLORS[i%COLORS.length]} />
            </div>
          ))}
        </div>

        {/* Document Expiry Summary */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:10}}>Document Expiry (Next 90 Days)</div>
          {[{label:'Critical (< 30 days)',days:30,color:'#E24B4A'},{label:'Warning (31-60 days)',days:60,color:'#E67E22'},{label:'Notice (61-90 days)',days:90,color:'#C8A96E'}].map((tier,i)=>{
            const count = expDocs?.filter((d:any)=>{const days=Math.ceil((new Date(d.expiry_date).getTime()-Date.now())/86400000);return days>=0&&days<tier.days&&(i===0||days>=([0,30,60][i]))}).length??0
            return (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<2?'0.5px solid #F0F0F0':'none'}}>
                <span style={{fontSize:12,color:'#4A5568'}}>{tier.label}</span>
                <span style={{fontSize:14,fontWeight:700,color:tier.color}}>{count}</span>
              </div>
            )
          })}
        </div>

        {/* Leave Summary */}
        {leaveByType.length > 0 && (
          <div style={{background:'white',borderRadius:14,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:10}}>Leave Taken (Days) — By Type</div>
            {leaveByType.map(([type,days]:any,i)=>(
              <div key={type} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#4A5568',marginBottom:3,textTransform:'capitalize'}}>
                  <span>{type} leave</span><span style={{color:COLORS[i%COLORS.length],fontWeight:600}}>{days} days</span>
                </div>
                {/* Bars are scaled against the largest value. Guard the divisor:
                    a zero top value produced Infinity and a broken bar. */}
                <ProgressBar value={pctOfMax(days, leaveByType)} color={COLORS[i%COLORS.length]} />
              </div>
            ))}
          </div>
        )}
      </PageContent>
    </div>
  )
}
