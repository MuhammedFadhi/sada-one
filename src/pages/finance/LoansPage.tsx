import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, PageContent, Avatar, StatusBadge, EmptyState, Tabs, BottomSheet, formatSAR, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'

export function AllLoansPage() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('processing')
  const [selected, setSelected] = useState<any>(null)

  const { data: loans, isLoading } = useQuery({
    queryKey: ['all-loans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loans')
        .select('*, employee:employees!employee_id(id,full_name_en,job_title_en,avatar_url,division:divisions!division_id(name_en))')
        .order('created_at',{ascending:false})
      if (error) throw error; return data
    }
  })

  const processMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status }
      if (status==='approved') { updates.finance_approved_by=profile?.employee_id; updates.finance_approved_at=new Date().toISOString() }
      const { error } = await supabase.from('loans').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Loan updated'); setSelected(null); qc.invalidateQueries({queryKey:['all-loans']}) },
    onError: () => toast.error('Failed to update')
  })

  const filtered = loans?.filter((l:any)=>tab==='all'?true:l.status===tab)??[]
  const pendingCount = loans?.filter((l:any)=>l.status==='processing').length??0  // stage 2 queue
  const amt = (l:any)=> l.amount_approved ?? l.amount_requested ?? 0
  const totalActive  = loans?.filter((l:any)=>l.status==='approved'||l.status==='processing').reduce((a:number,l:any)=>a+(amt(l)-(l.total_repaid??0)),0)??0

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Loans & Advances</h1>
          {pendingCount>0 && <span style={{background:'#E24B4A',color:'white',borderRadius:10,fontSize:11,fontWeight:700,padding:'3px 9px'}}>{pendingCount}</span>}
        </div>
      </div>
      <PageContent>
        <div style={{background:'#FFF8EC',borderRadius:12,padding:14,marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:11,color:'#C8A96E',marginBottom:4}}>Total Outstanding (Active Loans)</div>
          <div style={{fontSize:24,fontWeight:700,color:'#C8A96E'}}>{formatSAR(totalActive)}</div>
        </div>
        <Tabs tabs={[{key:'processing',label:'To Approve',count:pendingCount},{key:'pending',label:'With Manager'},{key:'approved',label:'Active'},{key:'completed',label:'Done'},{key:'all',label:'All'}]} active={tab} onChange={setTab} />
        {isLoading && <SkeletonList />}
        {!isLoading && !filtered.length && <EmptyState icon="cash-off" title={`No ${tab} loans`} subtitle="Loan requests will appear here." />}
        {filtered.map((loan:any)=>(
          <div key={loan.id} onClick={()=>setSelected(loan)}
            style={{background:'white',borderRadius:14,padding:14,marginBottom:8,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <Avatar name={loan.employee?.full_name_en??'?'} size={38} />
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{loan.employee?.full_name_en}</div>
                <div style={{fontSize:11,color:'#718096'}}>{loan.employee?.division?.name_en}</div>
              </div>
              <StatusBadge status={loan.status} />
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#F4F6F9',borderRadius:8,padding:'8px 12px'}}>
              <div>
                <div style={{fontSize:10,color:'#718096',textTransform:'capitalize'}}>{loan.loan_type?.replace(/_/g,' ')??'Loan'}</div>
                <div style={{fontSize:16,fontWeight:700,color:'#17294A'}}>{formatSAR(amt(loan))}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:10,color:'#718096'}}>{loan.repayment_months} installments</div>
                <div style={{fontSize:12,color:'#4A5568'}}>{formatSAR(loan.monthly_deduction ?? (amt(loan)/(loan.repayment_months||1)))}/mo</div>
              </div>
            </div>
          </div>
        ))}
      </PageContent>

      <BottomSheet open={!!selected} onClose={()=>setSelected(null)} title="Loan Details">
        {selected && (
          <div>
            <div style={{background:'#F4F6F9',borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1A202C',marginBottom:8}}>{selected.employee?.full_name_en}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[{l:'Amount',v:formatSAR(amt(selected))},{l:'Type',v:selected.loan_type?.replace(/_/g,' ')??'—'},{l:'Installments',v:selected.repayment_months},{l:'Monthly',v:formatSAR(selected.monthly_deduction ?? (amt(selected)/(selected.repayment_months||1)))}].map((x,i)=>(
                  <div key={i}><div style={{fontSize:10,color:'#718096'}}>{x.l}</div><div style={{fontSize:13,fontWeight:500,color:'#1A202C',marginTop:1,textTransform:'capitalize'}}>{x.v}</div></div>
                ))}
              </div>
              {selected.reason && <div style={{fontSize:12,color:'#718096',marginTop:10}}>Reason: {selected.reason}</div>}
            </div>
            {selected.status==='processing' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <button onClick={()=>processMut.mutate({id:selected.id,status:'rejected'})}
                  style={{background:'#FFF0F0',color:'#E24B4A',border:'1px solid #E24B4A',borderRadius:10,padding:12,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Reject</button>
                <button onClick={()=>processMut.mutate({id:selected.id,status:'approved'})}
                  style={{background:'#1D9E75',color:'white',border:'none',borderRadius:10,padding:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Approve</button>
              </div>
            )}
            {selected.status==='approved' && (
              <button onClick={()=>processMut.mutate({id:selected.id,status:'active'})}
                style={{width:'100%',background:'#17B8D0',color:'white',border:'none',borderRadius:10,padding:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Activate Loan (Start Deductions)</button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
