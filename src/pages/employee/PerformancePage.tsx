import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { StatusBar, PageContent, EmptyState, ProgressBar } from '@/components/ui'
import { formatDateShort, formatMonthYear } from '@/lib/dates'

export function PerformancePage() {
  const { profile } = useAuthStore()

  const { data: reviews } = useQuery({
    queryKey: ['performance', profile?.employee_id],
    queryFn: async () => {
      const { data } = await supabase.from('performance_reviews').select('*').eq('employee_id', profile?.employee_id).order('created_at',{ascending:false})
      return data ?? []
    }, enabled: !!profile?.employee_id
  })

  const { data: goals } = useQuery({
    queryKey: ['goals', profile?.employee_id],
    queryFn: async () => {
      const { data } = await supabase.from('performance_goals').select('*').eq('employee_id', profile?.employee_id).neq('status','cancelled').order('created_at',{ascending:false})
      return data ?? []
    }, enabled: !!profile?.employee_id
  })

  const STATUS_COLORS: Record<string,string> = { not_started:'#CBD5E0', in_progress:'#17B8D0', completed:'#1D9E75', cancelled:'#E24B4A' }
  const REVIEW_STATUS: Record<string,{color:string;label:string}> = {
    draft:{color:'#CBD5E0',label:'Draft'}, submitted:{color:'#17B8D0',label:'Submitted'},
    manager_review:{color:'#E67E22',label:'Under Review'}, final:{color:'#1D9E75',label:'Finalized'}
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Performance</h1></div>
      </div>
      <PageContent>
        {/* Goals */}
        <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>My Goals</div>
        {!goals?.length && <EmptyState icon="target-off" title="No goals set" subtitle="Your manager will assign performance goals here." />}
        {goals?.map((g:any)=>(
          <div key={g.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{flex:1,paddingRight:8}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{g.title}</div>
                {g.description && <div style={{fontSize:11,color:'#718096',marginTop:2,lineHeight:1.5}}>{g.description}</div>}
              </div>
              <span className="badge" style={{background:(STATUS_COLORS[g.status]??'#CBD5E0')+'18',color:STATUS_COLORS[g.status]??'#CBD5E0',fontSize:9,whiteSpace:'nowrap',textTransform:'capitalize'}}>
                {g.status.replace(/_/g,' ')}
              </span>
            </div>
            <ProgressBar value={g.progress_pct??0} color={STATUS_COLORS[g.status]??'#17B8D0'} label={`Progress: ${g.progress_pct??0}%`} />
            {g.target_date && <div style={{fontSize:10,color:'#718096',marginTop:6}}>Target: {formatDateShort(g.target_date+'T00:00')}</div>}
          </div>
        ))}

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <>
            <div style={{fontSize:13,fontWeight:600,color:'#1A202C',margin:'16px 0 8px'}}>Performance Reviews</div>
            {reviews.map((r:any)=>{
              const rs = REVIEW_STATUS[r.status] ?? REVIEW_STATUS.draft
              return (
                <div key={r.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{r.period}</div>
                      {r.period_start && <div style={{fontSize:11,color:'#718096'}}>{formatMonthYear(r.period_start)} – {formatMonthYear(r.period_end)}</div>}
                    </div>
                    <span className="badge" style={{background:rs.color+'18',color:rs.color}}>{rs.label}</span>
                  </div>
                  {r.overall_score && (
                    <div style={{background:'#F4F6F9',borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:12,color:'#718096'}}>Overall Score</span>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{fontSize:20,fontWeight:700,color:'#17B8D0'}}>{r.overall_score}</div>
                        <div style={{fontSize:11,color:'#718096'}}>/5.0</div>
                      </div>
                    </div>
                  )}
                  {r.comments && <div style={{fontSize:12,color:'#718096',marginTop:8,lineHeight:1.5}}>"{r.comments}"</div>}
                </div>
              )
            })}
          </>
        )}

        {!goals?.length && !reviews?.length && (
          <EmptyState icon="chart-bar" title="No performance data yet" subtitle="Your goals and reviews will appear here." />
        )}
      </PageContent>
    </div>
  )
}
