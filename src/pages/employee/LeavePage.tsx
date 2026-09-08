import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useLeaveBalances, useLeaveRequests, useSubmitLeave, useSubmitHRRequest, useSettings } from '@/hooks/useData'
import { StatusBar, PageContent, BottomSheet, StatusBadge, EmptyState, Tabs, formatSAR } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDateShort, formatDayMonth } from '@/lib/dates'

const LEAVE_TYPES = [
  {key:'annual',label:'Annual',color:'#17B8D0',icon:'beach'},
  {key:'sick',label:'Sick',color:'#E24B4A',icon:'heart-rate-monitor'},
  {key:'emergency',label:'Emergency',color:'#E67E22',icon:'alert-triangle'},
  {key:'hajj',label:'Hajj/Umrah',color:'#C8A96E',icon:'building-mosque'},
]

export function LeavePage() {
  const { profile } = useAuthStore()
  const empId = profile?.employee_id ?? ''
  const year = new Date().getFullYear()
  const { data: balances } = useLeaveBalances(empId, year)
  const { data: requests } = useLeaveRequests(empId)
  const submitMut = useSubmitLeave()
  const submitHR = useSubmitHRRequest()
  const { data: settings } = useSettings()

  const encashEnabled = settings?.map?.['leave.encashment_enabled'] ?? true
  const encashBasis   = settings?.map?.['leave.encashment_basis'] ?? 'basic_salary'
  const encashDivisor = Number(settings?.map?.['leave.encashment_divisor'] ?? 30)

  const [tab, setTab] = useState('balance')
  const [applyOpen, setApplyOpen] = useState(false)
  const [encashOpen, setEncashOpen] = useState(false)
  const [encashForm, setEncashForm] = useState({ days: '', custom_amount: '' })
  const [form, setForm] = useState({ leave_type:'annual', start_date:'', end_date:'', reason:'' })

  const daysDiff = (a:string,b:string) => {
    if (!a||!b) return 0
    return Math.max(1, Math.ceil((new Date(b).getTime()-new Date(a).getTime())/86400000)+1)
  }

  const handleApply = async () => {
    if (!form.start_date||!form.end_date) return toast.error('Please select dates')
    if (form.end_date < form.start_date) return toast.error('End date must be after start date')
    try {
      await submitMut.mutateAsync({ ...form, days_count: daysDiff(form.start_date,form.end_date) })
      toast.success('Leave request submitted')
      setApplyOpen(false)
      setForm({leave_type:'annual',start_date:'',end_date:'',reason:''})
    } catch { toast.error('Failed to submit request') }
  }

  const balanceMap = Object.fromEntries((balances??[]).map(b=>[b.leave_type, b]))
  const annualBal = balanceMap['annual']
  const annualRemaining = annualBal ? (annualBal.entitled_days + annualBal.carried_over - annualBal.taken_days - annualBal.pending_days) : 0

  const handleEncash = async () => {
    const days = Number(encashForm.days)
    if (!days || days < 1) return toast.error('Enter how many days to cash out')
    if (days > annualRemaining) return toast.error(`You only have ${annualRemaining} annual days available`)
    const customAmt = Number(encashForm.custom_amount)
    if (encashBasis === 'custom' && (!customAmt || customAmt < 1)) return toast.error('Enter the requested amount')

    const purpose = encashBasis === 'custom'
      ? `Leave encashment request: ${days} day(s) of annual leave. Requested amount: SAR ${customAmt.toLocaleString()}.`
      : `Leave encashment request: ${days} day(s) of annual leave. Amount to be calculated by Finance (basic salary ÷ ${encashDivisor} × ${days}).`
    try {
      await submitHR.mutateAsync({ request_type: 'leave_encashment', purpose, urgency: 'normal' })
      toast.success('Encashment request sent to Finance')
      setEncashOpen(false)
      setEncashForm({ days: '', custom_amount: '' })
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to submit request')
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Leave Management</h1>
          <div style={{display:'flex',gap:8}}>
            {encashEnabled && (
              <button onClick={()=>setEncashOpen(true)} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:8,padding:'6px 12px',color:'#C8A96E',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
                <i className="ti ti-cash" /> Cash Out
              </button>
            )}
            <button onClick={()=>setApplyOpen(true)} style={{background:'#C8A96E',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
              <i className="ti ti-plus" /> Apply
            </button>
          </div>
        </div>
      </div>

      <PageContent>
        <Tabs tabs={[{key:'balance',label:'Balance'},{key:'history',label:'History',count:requests?.length}]} active={tab} onChange={setTab} />

        {tab==='balance' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {LEAVE_TYPES.map(lt => {
              const bal = balanceMap[lt.key]
              const remaining = bal ? (bal.entitled_days+bal.carried_over-bal.taken_days-bal.pending_days) : null
              return (
                <div key={lt.key} style={{background:'white',borderRadius:14,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                  <div style={{width:32,height:32,borderRadius:9,background:lt.color+'18',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                    <i className={`ti ti-${lt.icon}`} style={{color:lt.color,fontSize:17}} />
                  </div>
                  <div style={{fontSize:10,color:'#718096',marginBottom:3}}>{lt.label} Leave</div>
                  <div style={{fontSize:22,fontWeight:700,color:lt.color}}>{remaining??'—'}</div>
                  <div style={{fontSize:10,color:'#CBD5E0'}}>
                    {bal ? `${bal.taken_days} taken / ${bal.entitled_days} total` : 'Not configured'}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab==='history' && (
          <>
            {!requests?.length && <EmptyState icon="calendar-off" title="No requests yet" subtitle="Your leave requests will appear here." />}
            {requests?.map(req => (
              <div key={req.id} style={{background:'white',borderRadius:12,padding:'12px 14px',marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:600,color:'#1A202C',textTransform:'capitalize'}}>{req.leave_type} Leave</span>
                    <div style={{fontSize:11,color:'#718096',marginTop:2}}>
                      {formatDayMonth(req.start_date+'T00:00')} — {formatDateShort(req.end_date+'T00:00')}
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'#718096'}}>{req.days_count} day{req.days_count!==1?'s':''}</span>
                  {req.rejection_reason && <span style={{fontSize:10,color:'#E24B4A'}}>Reason: {req.rejection_reason}</span>}
                </div>
              </div>
            ))}
          </>
        )}
      </PageContent>

      <BottomSheet open={applyOpen} onClose={()=>setApplyOpen(false)} title="Apply for Leave">
        <div>
          <div className="form-label">Leave Type</div>
          <select value={form.leave_type} onChange={e=>setForm(p=>({...p,leave_type:e.target.value}))}
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:14,background:'#FAFBFC',color:'#1A202C'}}>
            {LEAVE_TYPES.map(lt=><option key={lt.key} value={lt.key}>{lt.label} Leave</option>)}
          </select>
          <div className="form-row" style={{marginBottom:14}}>
            <div><div className="form-label">Start Date</div><input className="input" type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} /></div>
            <div><div className="form-label">End Date</div><input className="input" type="date" value={form.end_date} min={form.start_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} /></div>
          </div>
          {form.start_date&&form.end_date&&(
            <div style={{background:'#EBF8FF',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#17B8D0',fontWeight:500}}>
              📅 {daysDiff(form.start_date,form.end_date)} day{daysDiff(form.start_date,form.end_date)!==1?'s':''}
            </div>
          )}
          <div className="form-label">Reason (optional)</div>
          <textarea value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} rows={3}
            placeholder="Brief reason for leave..."
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:16,resize:'none',background:'#FAFBFC',color:'#1A202C'}} />
          <button onClick={handleApply} disabled={submitMut.isPending}
            style={{width:'100%',background:'#17B8D0',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:submitMut.isPending?.7:1}}>
            {submitMut.isPending?'Submitting…':'Submit Request'}
          </button>
        </div>
      </BottomSheet>
      <BottomSheet open={encashOpen} onClose={()=>setEncashOpen(false)} title="Cash Out Annual Leave">
        <div>
          <div style={{background:'#FFF8EC',borderRadius:10,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#A8894E',lineHeight:1.6,display:'flex',gap:8}}>
            <i className="ti ti-info-circle" style={{flexShrink:0,marginTop:1}} />
            Convert unused annual leave to a cash payment instead of taking time off. Finance reviews and processes the payout.
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#F4F6F9',borderRadius:10,padding:'10px 12px',marginBottom:14}}>
            <span style={{fontSize:12,color:'#718096'}}>Available annual days</span>
            <span style={{fontSize:16,fontWeight:700,color:'#17B8D0'}}>{annualRemaining}</span>
          </div>

          <div className="form-label">Days to cash out</div>
          <input className="input" type="number" min={1} max={annualRemaining} value={encashForm.days}
            onChange={e=>setEncashForm(p=>({...p,days:e.target.value}))}
            placeholder={`1 – ${annualRemaining}`} style={{marginBottom:14}} />

          {encashBasis === 'custom' ? (
            <>
              <div className="form-label">Requested amount (SAR)</div>
              <input className="input" type="number" min={1} value={encashForm.custom_amount}
                onChange={e=>setEncashForm(p=>({...p,custom_amount:e.target.value}))}
                placeholder="e.g. 5000" style={{marginBottom:14}} />
            </>
          ) : (
            <div style={{background:'#EBF8FF',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#17B8D0',lineHeight:1.5}}>
              Payout is calculated by Finance as <b>basic salary ÷ {encashDivisor} × days</b>.
              {encashForm.days && Number(encashForm.days) > 0 &&
                ` For ${encashForm.days} day(s), that's about ${encashForm.days} × your daily basic rate.`}
            </div>
          )}

          <button onClick={handleEncash} disabled={submitHR.isPending}
            style={{width:'100%',background:'#C8A96E',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:submitHR.isPending?.7:1}}>
            {submitHR.isPending?'Submitting…':'Request Cash Out'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
