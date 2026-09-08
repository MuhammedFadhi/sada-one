import { useState } from 'react'
import { useHRRequests } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBar, PageContent, Avatar, StatusBadge, EmptyState, Tabs, BottomSheet, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'
import { ApprovalsQueue } from '@/components/ApprovalsQueue'
import { usePendingApprovals } from '@/hooks/useData'
import { formatDateShort } from '@/lib/dates'

export function HRRequestsAllPage() {
  const { profile } = useAuthStore()
  const { data: requests, isLoading } = useHRRequests()
  const qc = useQueryClient()
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState<any>(null)
  const [segment, setSegment] = useState<'approvals' | 'letters'>('approvals')
  const { data: approvals } = usePendingApprovals()
  const approvalsCount = (approvals?.leave?.length ?? 0) + (approvals?.loans?.length ?? 0)
    + (approvals?.exit?.length ?? 0) + (approvals?.expenses?.length ?? 0)

  const processMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('hr_requests').update({ status, processed_by: profile?.employee_id, processed_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Request updated'); setSelected(null); qc.invalidateQueries({queryKey:['hr-requests']}) },
    onError: () => toast.error('Failed to update')
  })

  const filtered = requests?.filter((r:any) => tab==='all' ? true : r.status===tab) ?? []
  const pendingCount = requests?.filter((r:any)=>r.status==='pending').length ?? 0

  const URGENCY_COLORS: Record<string,string> = { normal:'#17B8D0', high:'#E67E22', urgent:'#E24B4A' }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Requests & Approvals</h1>
          {(approvalsCount + pendingCount)>0 && <span style={{background:'#E24B4A',color:'white',borderRadius:10,fontSize:11,fontWeight:700,padding:'3px 9px'}}>{approvalsCount + pendingCount}</span>}
        </div>
        <div style={{margin:'12px 16px 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,background:'rgba(255,255,255,.08)',borderRadius:12,padding:4}}>
          {([['approvals',`Approvals${approvalsCount ? ` (${approvalsCount})` : ''}`],['letters',`Letters${pendingCount ? ` (${pendingCount})` : ''}`]] as const).map(([key,label])=>(
            <button key={key} onClick={()=>setSegment(key)}
              style={{background:segment===key?'white':'transparent',color:segment===key?'#0D1B2A':'rgba(255,255,255,.6)',border:'none',borderRadius:9,padding:'8px 0',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <PageContent>
        {segment === 'approvals' && (
          <>
            <p style={{fontSize:11,color:'#718096',marginBottom:10}}>Stage 2 of 2 — these were approved by the employee's manager (or the employee has no manager).</p>
            <ApprovalsQueue />
          </>
        )}
        {segment === 'letters' && (<>
        <Tabs tabs={[{key:'pending',label:'Pending',count:pendingCount},{key:'processing',label:'Processing'},{key:'completed',label:'Done'},{key:'all',label:'All'}]} active={tab} onChange={setTab} />
        {isLoading && <SkeletonList />}
        {!isLoading && !filtered.length && <EmptyState icon="file-off" title={`No ${tab} requests`} subtitle="HR document requests will appear here." />}
        {filtered.map((req:any)=>(
          <div key={req.id} onClick={()=>setSelected(req)}
            style={{background:'white',borderRadius:14,padding:14,marginBottom:8,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <Avatar name={req.employee?.full_name_en??'?'} size={38} />
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{req.employee?.full_name_en}</div>
                <div style={{fontSize:11,color:'#718096'}}>{req.employee?.job_title_en}</div>
              </div>
              <StatusBadge status={req.status} />
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'#4A5568',textTransform:'capitalize'}}>{req.request_type.replace(/_/g,' ')}</span>
              <span className="badge" style={{background:(URGENCY_COLORS[req.urgency]??'#17B8D0')+'18',color:URGENCY_COLORS[req.urgency]??'#17B8D0',fontSize:9,textTransform:'capitalize'}}>{req.urgency}</span>
            </div>
            {req.purpose && <div style={{fontSize:11,color:'#718096',marginTop:4}}>"{req.purpose}"</div>}
            <div style={{fontSize:10,color:'#CBD5E0',marginTop:4}}>{formatDateShort(req.created_at)}</div>
          </div>
        ))}
        </>)}
      </PageContent>

      <BottomSheet open={!!selected} onClose={()=>setSelected(null)} title="Process Request">
        {selected && (
          <div>
            <div style={{background:'#F4F6F9',borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1A202C',marginBottom:4}}>{selected.employee?.full_name_en}</div>
              <div style={{fontSize:13,color:'#4A5568',textTransform:'capitalize',marginBottom:4}}>{selected.request_type.replace(/_/g,' ')}</div>
              {selected.purpose && <div style={{fontSize:12,color:'#718096'}}>Purpose: {selected.purpose}</div>}
              <div style={{fontSize:12,color:'#718096',marginTop:4}}>Urgency: <span style={{color:URGENCY_COLORS[selected.urgency]??'#17B8D0',textTransform:'capitalize'}}>{selected.urgency}</span></div>
            </div>
            {selected.status==='pending' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                <button onClick={()=>processMut.mutate({id:selected.id,status:'processing'})}
                  style={{background:'#EBF8FF',color:'#17B8D0',border:'1px solid #17B8D0',borderRadius:10,padding:11,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                  Start Processing
                </button>
                <button onClick={()=>processMut.mutate({id:selected.id,status:'completed'})}
                  style={{background:'#1D9E75',color:'white',border:'none',borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  Mark Complete
                </button>
              </div>
            )}
            {selected.status==='processing' && (
              <button onClick={()=>processMut.mutate({id:selected.id,status:'completed'})}
                style={{width:'100%',background:'#1D9E75',color:'white',border:'none',borderRadius:10,padding:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:10}}>
                Mark as Completed
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
