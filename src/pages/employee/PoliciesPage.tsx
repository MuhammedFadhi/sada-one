import { useCompanyPolicies, useAcknowledgePolicy } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { StatusBar, PageContent, EmptyState, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDateLong } from '@/lib/dates'

const CAT_COLORS: Record<string,string> = { HR:'#17B8D0', General:'#7F77DD', IT:'#1D9E75', Operations:'#E67E22', Finance:'#C8A96E', Safety:'#E24B4A' }

export function PoliciesPage() {
  const { profile } = useAuthStore()
  const { data: policies, isLoading } = useCompanyPolicies()
  const ackMut = useAcknowledgePolicy()

  const { data: myAcks } = useQuery({
    queryKey: ['my-acks', profile?.employee_id],
    queryFn: async () => {
      const { data } = await supabase.from('policy_acknowledgements').select('policy_id').eq('employee_id', profile?.employee_id)
      return new Set(data?.map((a:any) => a.policy_id) ?? [])
    },
    enabled: !!profile?.employee_id
  })

  const handleAck = async (policyId: string) => {
    try {
      await ackMut.mutateAsync(policyId)
      toast.success('Policy acknowledged ✓')
    } catch { toast.error('Failed to acknowledge') }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Company Policies</h1></div>
      </div>
      <PageContent>
        {isLoading && <SkeletonList />}
        {!isLoading && !policies?.length && <EmptyState icon="file-off" title="No policies yet" subtitle="Company policies will appear here once published by HR." />}
        {policies?.map((p:any) => {
          const acknowledged = myAcks?.has(p.id)
          const color = CAT_COLORS[p.category] ?? '#718096'
          const needsAck = p.requires_ack && !acknowledged
          return (
            <div key={p.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)',borderLeft: needsAck?'3px solid #E67E22':'none'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
                <div style={{width:38,height:38,borderRadius:10,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="ti ti-book-2" style={{color,fontSize:18}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{p.title_en}</div>
                  <div style={{fontSize:11,color:'#718096',marginTop:2}}>{p.title_ar}</div>
                  <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                    <span className="badge" style={{background:color+'18',color,fontSize:9}}>{p.category}</span>
                    <span className="badge badge-dark" style={{fontSize:9}}>v{p.version}</span>
                    {acknowledged && <span className="badge badge-success" style={{fontSize:9}}>✓ Acknowledged</span>}
                    {needsAck && <span className="badge badge-warning" style={{fontSize:9}}>Acknowledgement Required</span>}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                {p.file_url && (
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer"
                    style={{flex:1,background:'#F4F6F9',color:'#17294A',borderRadius:10,padding:'9px 0',fontSize:12,fontWeight:500,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                    <i className="ti ti-download" style={{fontSize:14}} /> Download PDF
                  </a>
                )}
                {needsAck && (
                  <button onClick={()=>handleAck(p.id)} disabled={ackMut.isPending}
                    style={{flex:1,background:'#17B8D0',color:'white',border:'none',borderRadius:10,padding:9,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                    <i className="ti ti-check" style={{fontSize:14}} /> I Acknowledge
                  </button>
                )}
              </div>
              {p.ack_deadline && needsAck && (
                <div style={{fontSize:10,color:'#E67E22',marginTop:8}}>⚠ Acknowledgement deadline: {formatDateLong(p.ack_deadline)}</div>
              )}
            </div>
          )
        })}
      </PageContent>
    </div>
  )
}
