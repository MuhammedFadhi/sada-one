import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useHRRequests, useSubmitHRRequest } from '@/hooks/useData'
import { StatusBar, PageContent, BottomSheet, StatusBadge, EmptyState } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDayMonth } from '@/lib/dates'

const REQUEST_TYPES = [
  {key:'experience_letter',label:'Experience Letter',icon:'file-certificate',color:'#17B8D0',desc:'Proof of employment & experience'},
  {key:'salary_certificate',label:'Salary Certificate',icon:'file-dollar',color:'#1D9E75',desc:'For bank & visa purposes'},
  {key:'noc_letter',label:'NOC Letter',icon:'file-check',color:'#7F77DD',desc:'No objection certificate'},
  {key:'salary_advance_letter',label:'Salary Advance Letter',icon:'file-invoice',color:'#C8A96E',desc:'Official advance request'},
  {key:'employment_letter',label:'Employment Letter',icon:'briefcase',color:'#E67E22',desc:'Confirmation of employment'},
  {key:'other',label:'Other',icon:'file-plus',color:'#718096',desc:'Other HR document'},
]

export function HRRequestsPage() {
  const { profile } = useAuthStore()
  const { data: requests } = useHRRequests(profile?.employee_id)
  const submitMut = useSubmitHRRequest()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({request_type:'experience_letter',purpose:'',urgency:'normal'})

  const handleSubmit = async () => {
    try {
      await submitMut.mutateAsync(form)
      toast.success('Request submitted — HR will process within 2 working days')
      setOpen(false)
      setForm({request_type:'experience_letter',purpose:'',urgency:'normal'})
    } catch { toast.error('Failed to submit request') }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>HR Requests</h1>
          <button onClick={()=>setOpen(true)} style={{background:'#17B8D0',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-plus" /> New
          </button>
        </div>
      </div>
      <PageContent>
        {/* Quick select */}
        <div style={{fontSize:11,fontWeight:600,color:'#718096',letterSpacing:'.5px',marginBottom:8}}>QUICK REQUEST</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
          {REQUEST_TYPES.slice(0,4).map(rt=>(
            <button key={rt.key} onClick={()=>{setForm(p=>({...p,request_type:rt.key}));setOpen(true)}}
              style={{background:'white',borderRadius:12,padding:12,border:'none',cursor:'pointer',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{width:32,height:32,borderRadius:9,background:rt.color+'18',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                <i className={`ti ti-${rt.icon}`} style={{color:rt.color,fontSize:16}} />
              </div>
              <div style={{fontSize:11,fontWeight:600,color:'#1A202C',lineHeight:1.3}}>{rt.label}</div>
            </button>
          ))}
        </div>
        <div style={{fontSize:11,fontWeight:600,color:'#718096',letterSpacing:'.5px',marginBottom:8}}>MY REQUESTS</div>
        {!requests?.length && <EmptyState icon="file-off" title="No requests yet" subtitle="Your HR document requests will appear here." />}
        {requests?.map(req => (
          <div key={req.id} style={{background:'white',borderRadius:12,padding:'12px 14px',marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:'#EBF8FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className="ti ti-file-text" style={{color:'#17B8D0',fontSize:18}} />
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:'#1A202C',textTransform:'capitalize'}}>{req.request_type.replace(/_/g,' ')}</div>
              <div style={{fontSize:11,color:'#718096'}}>{formatDayMonth(req.created_at)}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
              <StatusBadge status={req.status} />
              {req.output_file_url && (
                <a href={req.output_file_url} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:'#17B8D0',textDecoration:'none'}}>
                  <i className="ti ti-download" /> Download
                </a>
              )}
            </div>
          </div>
        ))}
      </PageContent>
      <BottomSheet open={open} onClose={()=>setOpen(false)} title="Request HR Document">
        <div>
          <div className="form-label">Document Type</div>
          <select value={form.request_type} onChange={e=>setForm(p=>({...p,request_type:e.target.value}))}
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:14,background:'#FAFBFC',color:'#1A202C'}}>
            {REQUEST_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <div className="form-label">Urgency</div>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            {['normal','high','urgent'].map(u=>(
              <button key={u} onClick={()=>setForm(p=>({...p,urgency:u}))}
                style={{flex:1,padding:'8px 0',borderRadius:8,border:`1.5px solid ${form.urgency===u?'#17B8D0':'#E2E8F0'}`,background:form.urgency===u?'#EBF8FF':'white',color:form.urgency===u?'#17B8D0':'#718096',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize'}}>
                {u}
              </button>
            ))}
          </div>
          <div className="form-label">Purpose (optional)</div>
          <textarea value={form.purpose} onChange={e=>setForm(p=>({...p,purpose:e.target.value}))} rows={3} placeholder="e.g. For bank loan application..."
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:16,resize:'none',background:'#FAFBFC',color:'#1A202C'}} />
          <div style={{background:'#FFF8EC',borderRadius:8,padding:'8px 12px',marginBottom:16,fontSize:12,color:'#C8A96E'}}>
            ⏱ Standard processing: 2 working days. Urgent: same day.
          </div>
          <button onClick={handleSubmit} disabled={submitMut.isPending}
            style={{width:'100%',background:'#17B8D0',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:submitMut.isPending?.7:1}}>
            {submitMut.isPending?'Submitting…':'Submit Request'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
