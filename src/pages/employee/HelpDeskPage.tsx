import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useTickets, useCreateTicket } from '@/hooks/useData'
import { StatusBar, PageContent, BottomSheet, StatusBadge, EmptyState } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDayMonth } from '@/lib/dates'

const PRIORITIES = [{key:'low',color:'#CBD5E0'},{key:'normal',color:'#17B8D0'},{key:'high',color:'#E67E22'},{key:'urgent',color:'#E24B4A'}]
const CATEGORIES = ['it_support','hr_request','payroll_issue','access_permissions','facilities','other']

export function HelpDeskPage() {
  const { profile } = useAuthStore()
  const { data: tickets } = useTickets(profile?.employee_id)
  const createMut = useCreateTicket()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({category:'it_support',priority:'normal',subject:'',description:''})

  const handleSubmit = async () => {
    if (!form.subject.trim()||!form.description.trim()) return toast.error('Fill subject and description')
    try {
      await createMut.mutateAsync(form)
      toast.success('Ticket created — we\'ll respond soon')
      setOpen(false); setForm({category:'it_support',priority:'normal',subject:'',description:''})
    } catch { toast.error('Failed to create ticket') }
  }

  const priorityColor = (p:string) => PRIORITIES.find(x=>x.key===p)?.color??'#CBD5E0'

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Help Desk</h1>
          <button onClick={()=>setOpen(true)} style={{background:'#E67E22',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-plus" /> Ticket
          </button>
        </div>
      </div>
      <PageContent>
        {!tickets?.length && <EmptyState icon="headset" title="No tickets" subtitle="Submit a ticket for IT, HR, or facilities support." />}
        {tickets?.map(t=>(
          <div key={t.id} style={{background:'white',borderRadius:12,padding:'12px 14px',marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'#718096'}}>{t.ticket_number}</div>
                <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{t.subject}</div>
              </div>
              <StatusBadge status={t.status} label={t.status.replace(/_/g,' ')} />
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span className="badge badge-dark" style={{textTransform:'capitalize'}}>{t.category.replace(/_/g,' ')}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,color:priorityColor(t.priority)}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:priorityColor(t.priority),display:'inline-block'}} />
                {t.priority}
              </span>
              <span style={{fontSize:10,color:'#CBD5E0',marginLeft:'auto'}}>{formatDayMonth(t.created_at)}</span>
            </div>
          </div>
        ))}
      </PageContent>
      <BottomSheet open={open} onClose={()=>setOpen(false)} title="Submit Support Ticket">
        <div>
          <div className="form-row" style={{marginBottom:14}}>
            <div>
              <div className="form-label">Category</div>
              <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
                style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:12,fontFamily:'inherit',outline:'none',background:'#FAFBFC',color:'#1A202C'}}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <div className="form-label">Priority</div>
              <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}
                style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:12,fontFamily:'inherit',outline:'none',background:'#FAFBFC',color:'#1A202C'}}>
                {PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.key}</option>)}
              </select>
            </div>
          </div>
          <div className="form-label">Subject</div>
          <input className="input" placeholder="Brief summary" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} style={{marginBottom:12}} />
          <div className="form-label">Description</div>
          <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={4} placeholder="Describe the issue in detail..."
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:16,resize:'none',background:'#FAFBFC',color:'#1A202C'}} />
          <button onClick={handleSubmit} disabled={createMut.isPending}
            style={{width:'100%',background:'#E67E22',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:createMut.isPending?.7:1}}>
            {createMut.isPending?'Submitting…':'Submit Ticket'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
