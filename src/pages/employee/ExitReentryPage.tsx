import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBar, PageContent, BottomSheet, StatusBadge, EmptyState, formatDate, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'

export function ExitReentryPage() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ permit_type:'single', destination_country:'', departure_date:'', return_date:'', travel_reason:'annual' })

  const { data: permits, isLoading } = useQuery({
    queryKey: ['exit-reentry', profile?.employee_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('exit_reentry').select('*').eq('employee_id', profile?.employee_id).order('created_at',{ascending:false})
      if (error) throw error
      return data
    },
    enabled: !!profile?.employee_id
  })

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!form.destination_country || !form.departure_date || !form.return_date) throw new Error('Fill all fields')
      const { error } = await supabase.from('exit_reentry').insert({ ...form, employee_id: profile?.employee_id, status: 'pending' /* flat hierarchy: always stage-1 (any manager), then HR/Finance */ })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Exit/Re-entry request submitted'); setOpen(false); qc.invalidateQueries({queryKey:['exit-reentry']}) },
    onError: (e:any) => toast.error(e.message)
  })

  // Mirrors the trimmed leave types: annual, emergency, Hajj/Umrah.
  const REASONS = ['annual','emergency','hajj','other']

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Exit Re-Entry</h1>
          <button onClick={()=>setOpen(true)} style={{background:'#C8A96E',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-plus" /> Apply
          </button>
        </div>
      </div>
      <PageContent>
        <div style={{background:'#EBF8FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#17B8D0',lineHeight:1.6}}>
          <i className="ti ti-info-circle" style={{marginRight:6}} />
          Exit/Re-Entry permits are required for non-Saudi employees leaving and returning to the Kingdom.
        </div>
        {isLoading && <SkeletonList />}
        {!isLoading && !permits?.length && <EmptyState icon="plane-off" title="No permits yet" subtitle="Your exit/re-entry permit requests will appear here." />}
        {permits?.map((p:any) => (
          <div key={p.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{p.destination_country}</div>
                <div style={{fontSize:11,color:'#718096',marginTop:2,textTransform:'capitalize'}}>{p.permit_type} entry permit</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[{label:'Departure',val:formatDate(p.departure_date,true)},{label:'Return',val:formatDate(p.return_date,true)}].map((x,i)=>(
                <div key={i} style={{background:'#F4F6F9',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'#718096'}}>{x.label}</div>
                  <div style={{fontSize:13,fontWeight:500,color:'#1A202C',marginTop:2}}>{x.val}</div>
                </div>
              ))}
            </div>
            {p.rejection_reason && <div style={{fontSize:11,color:'#E24B4A',marginTop:8,background:'#FFF0F0',borderRadius:8,padding:'6px 10px'}}>Rejected: {p.rejection_reason}</div>}
          </div>
        ))}
      </PageContent>
      <BottomSheet open={open} onClose={()=>setOpen(false)} title="Apply for Exit Re-Entry Permit">
        <div>
          <div className="form-row" style={{marginBottom:12}}>
            <div>
              <div className="form-label">Permit Type</div>
              <select className="input" value={form.permit_type} onChange={e=>setForm(p=>({...p,permit_type:e.target.value}))}>
                <option value="single">Single Entry</option>
                <option value="multiple">Multiple Entry</option>
              </select>
            </div>
            <div>
              <div className="form-label">Destination Country</div>
              <input className="input" placeholder="e.g. India" value={form.destination_country} onChange={e=>setForm(p=>({...p,destination_country:e.target.value}))} />
            </div>
          </div>
          <div className="form-row" style={{marginBottom:12}}>
            <div><div className="form-label">Departure Date</div><input className="input" type="date" value={form.departure_date} onChange={e=>setForm(p=>({...p,departure_date:e.target.value}))} /></div>
            <div><div className="form-label">Return Date</div><input className="input" type="date" value={form.return_date} min={form.departure_date} onChange={e=>setForm(p=>({...p,return_date:e.target.value}))} /></div>
          </div>
          <div className="form-label">Travel Reason</div>
          <select className="input" value={form.travel_reason} onChange={e=>setForm(p=>({...p,travel_reason:e.target.value}))} style={{marginBottom:16,textTransform:'capitalize'}}>
            {REASONS.map(r=><option key={r} value={r} style={{textTransform:'capitalize'}}>{r}</option>)}
          </select>
          <button onClick={()=>submitMut.mutate()} disabled={submitMut.isPending}
            style={{width:'100%',background:'#C8A96E',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:submitMut.isPending?.7:1}}>
            {submitMut.isPending?'Submitting…':'Submit Request'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
