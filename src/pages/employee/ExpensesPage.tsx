import { useState, useRef } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBar, PageContent, BottomSheet, StatusBadge, EmptyState, formatSAR, formatDate, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'

const CATEGORIES = ['fuel_transport','meals_entertainment','equipment','travel','accommodation','medical','other']
const CAT_ICONS: Record<string,string> = { fuel_transport:'car',meals_entertainment:'utensils',equipment:'device-laptop',travel:'plane',accommodation:'bed',medical:'heart-rate-monitor',other:'receipt' }
const CAT_COLORS: Record<string,string> = { fuel_transport:'#17B8D0',meals_entertainment:'#E67E22',equipment:'#7F77DD',travel:'#C8A96E',accommodation:'#1D9E75',medical:'#E24B4A',other:'#718096' }

export function ExpenseClaimsPage() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ category:'fuel_transport', amount:'', expense_date:'', description:'' })
  const [receipt, setReceipt] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: claims, isLoading } = useQuery({
    queryKey: ['expenses', profile?.employee_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_claims').select('*').eq('employee_id',profile?.employee_id).order('created_at',{ascending:false})
      if (error) throw error; return data
    }, enabled: !!profile?.employee_id
  })

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!form.amount||!form.expense_date||!form.description) throw new Error('Fill all required fields')
      let receipt_url: string | null = null
      if (receipt) {
        if (receipt.size > 10 * 1024 * 1024) throw new Error('Receipt must be under 10MB')
        const ext = receipt.name.split('.').pop() ?? 'jpg'
        const path = `${profile?.employee_id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('receipts').upload(path, receipt, { contentType: receipt.type })
        if (upErr) throw new Error('Receipt upload failed — try again')
        receipt_url = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('expense_claims').insert({ ...form, amount:parseFloat(form.amount), receipt_url, employee_id:profile?.employee_id, status: 'pending' })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Expense claim submitted'); setOpen(false); setForm({category:'fuel_transport',amount:'',expense_date:'',description:''}); setReceipt(null); qc.invalidateQueries({queryKey:['expenses']}) },
    onError: (e:any) => toast.error(e.message)
  })

  const totalPending  = claims?.filter((c:any)=>c.status==='pending').reduce((a:number,c:any)=>a+c.amount,0)??0
  const totalApproved = claims?.filter((c:any)=>c.status==='approved').reduce((a:number,c:any)=>a+c.amount,0)??0

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Expense Claims</h1>
          <button onClick={()=>setOpen(true)} style={{background:'#1D9E75',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-plus" /> New Claim
          </button>
        </div>
      </div>
      <PageContent>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          {[{label:'Pending',val:totalPending,color:'#E67E22',bg:'#FFF3E0'},{label:'Approved',val:totalApproved,color:'#1D9E75',bg:'#E6FAF0'}].map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:12,padding:12,textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:700,color:s.color}}>{formatSAR(s.val)}</div>
              <div style={{fontSize:11,color:s.color,marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>
        {isLoading && <SkeletonList />}
        {!isLoading&&!claims?.length&&<EmptyState icon="receipt-off" title="No claims yet" subtitle="Submit expense claims for reimbursement." />}
        {claims?.map((c:any)=>{
          const color = CAT_COLORS[c.category]??'#718096'
          return (
            <div key={c.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <div style={{width:38,height:38,borderRadius:10,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className={`ti ti-${CAT_ICONS[c.category]??'receipt'}`} style={{color,fontSize:18}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{c.description}</div>
                  <div style={{fontSize:11,color:'#718096',marginTop:1,textTransform:'capitalize'}}>{c.category.replace(/_/g,' ')} · {formatDate(c.expense_date,true)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#17294A'}}>{formatSAR(c.amount)}</div>
                  <StatusBadge status={c.status} />
                </div>
              </div>
              {c.receipt_url&&<a href={c.receipt_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'#17B8D0',textDecoration:'none',fontWeight:600,marginBottom:c.rejection_reason?6:0}}><i className="ti ti-receipt" style={{fontSize:13}} /> View receipt</a>}
              {c.rejection_reason&&<div style={{fontSize:11,color:'#E24B4A',background:'#FFF0F0',borderRadius:8,padding:'6px 10px'}}>Rejected: {c.rejection_reason}</div>}
            </div>
          )
        })}
      </PageContent>
      <BottomSheet open={open} onClose={()=>setOpen(false)} title="New Expense Claim">
        <div>
          <div className="form-row" style={{marginBottom:12}}>
            <div>
              <div className="form-label">Category</div>
              <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c} value={c} style={{textTransform:'capitalize'}}>{c.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <div className="form-label">Amount (SAR)</div>
              <input className="input" type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} />
            </div>
          </div>
          <div className="form-label">Expense Date</div>
          <input className="input" type="date" value={form.expense_date} onChange={e=>setForm(p=>({...p,expense_date:e.target.value}))} style={{marginBottom:12}} />
          <div className="form-label">Description *</div>
          <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} placeholder="What was this expense for?"
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:16,resize:'none',background:'#FAFBFC',color:'#1A202C'}} />
          <div className="form-label">Receipt (photo or PDF)</div>
          <input ref={fileRef} type="file" hidden accept="image/*,application/pdf,.heic"
            onChange={e=>{ setReceipt(e.target.files?.[0] ?? null); e.target.value='' }} />
          {!receipt ? (
            <button onClick={()=>fileRef.current?.click()}
              style={{width:'100%',background:'#FAFBFC',border:'1.5px dashed #CBD5E0',borderRadius:10,padding:14,fontSize:13,color:'#17B8D0',fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:7,marginBottom:16}}>
              <i className="ti ti-camera" style={{fontSize:17}} /> Attach receipt
            </button>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:10,background:'#EBF8FF',border:'1px solid rgba(23,184,208,.3)',borderRadius:10,padding:'10px 12px',marginBottom:16}}>
              <i className={`ti ti-${receipt.type==='application/pdf'?'file-type-pdf':'photo'}`} style={{fontSize:20,color:'#17B8D0',flexShrink:0}} />
              <span style={{flex:1,fontSize:12,color:'#1A202C',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{receipt.name}</span>
              <button aria-label="Remove receipt" onClick={()=>setReceipt(null)} style={{background:'none',border:'none',cursor:'pointer',display:'flex'}}>
                <i className="ti ti-x" style={{fontSize:16,color:'#718096'}} />
              </button>
            </div>
          )}
          <button onClick={()=>submitMut.mutate()} disabled={submitMut.isPending}
            style={{width:'100%',background:'#1D9E75',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:submitMut.isPending?.7:1}}>
            {submitMut.isPending?'Submitting…':'Submit Claim'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
