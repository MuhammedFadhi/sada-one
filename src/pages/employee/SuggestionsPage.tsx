import { useState } from 'react'
import { useSuggestions, useSubmitSuggestion } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, PageContent, BottomSheet, EmptyState } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDateShort } from '@/lib/dates'

const CATEGORIES = ['Work Environment','Benefits & Perks','Communication','Management','Process Improvement','Training','Other']
const STATUS_STYLE: Record<string,{bg:string;color:string;label:string}> = {
  in_review:   {bg:'#FFF3E0',color:'#E67E22',label:'Under Review'},
  implemented: {bg:'#E6FAF0',color:'#1D9E75',label:'Implemented'},
  declined:    {bg:'#FFF0F0',color:'#E24B4A',label:'Declined'},
}

export function SuggestionsPage() {
  const { role } = useAuthStore()
  const isManagement = role === 'admin' || role === 'hr_officer'   // mirrors the RLS policy
  const { data: suggestions } = useSuggestions()
  const submitMut = useSubmitSuggestion()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({category:'Work Environment',content:''})

  const handleSubmit = async () => {
    if (!form.content.trim()||form.content.trim().length<20) return toast.error('Suggestion must be at least 20 characters')
    try {
      await submitMut.mutateAsync(form)
      toast.success('Suggestion submitted')
      setOpen(false); setForm({category:'Work Environment',content:''})
    } catch { toast.error('Failed to submit') }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Suggestions</h1>
          <button onClick={()=>setOpen(true)} style={{background:'#7F77DD',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-bulb" /> Submit
          </button>
        </div>
      </div>
      <PageContent>
        <div style={{background:'rgba(127,119,221,.1)',border:'1px solid rgba(127,119,221,.2)',borderRadius:12,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'flex-start',gap:10}}>
          <i className="ti ti-info-circle" style={{color:'#7F77DD',flexShrink:0}} />
          <div style={{fontSize:12,color:'#7F77DD',lineHeight:1.5}}>
            {isManagement
              ? 'Suggestions show who submitted them. Older entries submitted before this change stay unattributed.'
              : 'Your name is shared with management along with your suggestion, so they can follow up with you.'}
          </div>
        </div>
        {!suggestions?.length && <EmptyState icon="bulb" title="No public updates yet" subtitle="Be the first to share an idea. Management regularly reviews all suggestions." />}
        {suggestions?.map((s:any)=>{
          const style = STATUS_STYLE[s.status]
          const author = s.employee?.full_name_en
          return (
            <div key={s.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              {isManagement && (
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,paddingBottom:8,borderBottom:'0.5px solid #F0F0F0'}}>
                  <i className="ti ti-user" style={{fontSize:13,color:'#718096'}} />
                  <span style={{fontSize:11.5,fontWeight:600,color:author?'#1A202C':'#A0AEC0'}}>
                    {author ?? 'Anonymous (before tracking)'}
                  </span>
                  {s.employee?.job_title_en && <span style={{fontSize:10.5,color:'#A0AEC0'}}>· {s.employee.job_title_en}</span>}
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span className="badge badge-purple" style={{fontSize:10}}>{s.category}</span>
                {style && <span className="badge" style={{background:style.bg,color:style.color,fontSize:10}}>{style.label}</span>}
              </div>
              <div style={{fontSize:13,color:'#1A202C',lineHeight:1.6,marginBottom:8}}>{s.content}</div>
              {s.management_response && (
                <div style={{background:'#F4F6F9',borderRadius:8,padding:'8px 12px',marginTop:8}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#718096',marginBottom:4}}>MANAGEMENT RESPONSE</div>
                  <div style={{fontSize:12,color:'#4A5568',lineHeight:1.5}}>{s.management_response}</div>
                </div>
              )}
              <div style={{fontSize:10,color:'#CBD5E0',marginTop:8}}>{formatDateShort(s.created_at)}</div>
            </div>
          )
        })}
      </PageContent>
      <BottomSheet open={open} onClose={()=>setOpen(false)} title="Share a Suggestion">
        <div>
          <div className="form-label">Category</div>
          <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:14,background:'#FAFBFC',color:'#1A202C'}}>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <div className="form-label">Your Suggestion</div>
          <textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} rows={5} placeholder="Share your idea, feedback, or concern..."
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:6,resize:'none',background:'#FAFBFC',color:'#1A202C'}} />
          <div style={{fontSize:10,color:'#CBD5E0',textAlign:'right',marginBottom:14}}>{form.content.length} chars (min 20)</div>
          <button onClick={handleSubmit} disabled={submitMut.isPending}
            style={{width:'100%',background:'#7F77DD',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:submitMut.isPending?.7:1}}>
            {submitMut.isPending?'Submitting…':'Submit'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
