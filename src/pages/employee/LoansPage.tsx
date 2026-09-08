import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useLoans, useApplyLoan } from '@/hooks/useData'
import { StatusBar, PageContent, BottomSheet, StatusBadge, formatSAR, QueryState } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDateShort } from '@/lib/dates'

const LOAN_TYPES = [{key:'salary_advance',label:'Salary Advance'},{key:'emergency_loan',label:'Emergency Loan'},{key:'personal_loan',label:'Personal Loan'}]

export function LoansPage() {
  const { profile } = useAuthStore()
  const { data: loans, isLoading, isError, refetch } = useLoans(profile?.employee_id)
  const applyMut = useApplyLoan()
  const [applyOpen, setApplyOpen] = useState(false)
  const [form, setForm] = useState({loan_type:'salary_advance',amount_requested:'',repayment_months:'6',reason:''})

  const monthlyPayment = () => {
    const amt = parseFloat(form.amount_requested)||0
    const months = parseInt(form.repayment_months)||1
    return amt/months
  }

  const handleApply = async () => {
    const amt = parseFloat(form.amount_requested)
    if (!amt || amt<=0) return toast.error('Enter a valid amount')
    try {
      await applyMut.mutateAsync({loan_type:form.loan_type,amount_requested:amt,repayment_months:parseInt(form.repayment_months),reason:form.reason})
      toast.success('Loan request submitted')
      setApplyOpen(false)
      setForm({loan_type:'salary_advance',amount_requested:'',repayment_months:'6',reason:''})
    } catch { toast.error('Failed to submit request') }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Loans & Advances</h1>
          <button onClick={()=>setApplyOpen(true)} style={{background:'#C8A96E',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-plus" /> Apply
          </button>
        </div>
      </div>
      <PageContent>
        <QueryState isLoading={isLoading} isError={isError} isEmpty={!loans?.length} onRetry={() => refetch()} emptyIcon="cash-off" emptyTitle="No loan requests" emptySubtitle="Your loan and advance requests will appear here.">
        {loans?.map(loan => {
          const progress = loan.amount_approved ? Math.round((((loan.total_repaid as number) ?? 0) / loan.amount_approved) * 100) : 0
          return (
            <div key={loan.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#1A202C',textTransform:'capitalize'}}>{loan.loan_type.replace(/_/g,' ')}</div>
                  <div style={{fontSize:11,color:'#718096',marginTop:2}}>{formatDateShort(loan.created_at)}</div>
                </div>
                <StatusBadge status={loan.status} />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                <div style={{background:'#F4F6F9',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'#718096'}}>Requested</div>
                  <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{formatSAR(loan.amount_requested ?? 0)}</div>
                </div>
                {loan.amount_approved && (
                  <div style={{background:'#E6FAF0',borderRadius:8,padding:'8px 10px'}}>
                    <div style={{fontSize:10,color:'#718096'}}>Approved</div>
                    <div style={{fontSize:14,fontWeight:600,color:'#1D9E75'}}>{formatSAR(loan.amount_approved ?? 0)}</div>
                  </div>
                )}
              </div>
              {loan.status==='approved' && loan.amount_approved && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#718096',marginBottom:4}}>
                    <span>Repaid: {formatSAR((loan.total_repaid as number) ?? 0)}</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{background:'#F0F0F0',borderRadius:6,height:7,overflow:'hidden'}}>
                    <div style={{width:`${progress}%`,height:'100%',background:'#1D9E75',borderRadius:6,transition:'width .5s'}} />
                  </div>
                  <div style={{fontSize:11,color:'#718096',marginTop:4}}>Monthly: {formatSAR(loan.monthly_deduction??0)} × {loan.repayment_months} months</div>
                </div>
              )}
              {loan.rejection_reason && <div style={{fontSize:11,color:'#E24B4A',marginTop:6,background:'#FFF0F0',borderRadius:8,padding:'6px 10px'}}>Rejected: {loan.rejection_reason}</div>}
            </div>
          )
        })}
        </QueryState>
      </PageContent>

      <BottomSheet open={applyOpen} onClose={()=>setApplyOpen(false)} title="Apply for Loan/Advance">
        <div>
          <div className="form-label">Loan Type</div>
          <select value={form.loan_type} onChange={e=>setForm(p=>({...p,loan_type:e.target.value}))}
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:14,background:'#FAFBFC',color:'#1A202C'}}>
            {LOAN_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <div className="form-row" style={{marginBottom:14}}>
            <div>
              <div className="form-label">Amount (SAR)</div>
              <input className="input" type="number" placeholder="0" value={form.amount_requested} onChange={e=>setForm(p=>({...p,amount_requested:e.target.value}))} />
            </div>
            <div>
              <div className="form-label">Repay Over (months)</div>
              <select value={form.repayment_months} onChange={e=>setForm(p=>({...p,repayment_months:e.target.value}))}
                style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',background:'#FAFBFC',color:'#1A202C'}}>
                {[1,2,3,6,9,12,18,24].map(m=><option key={m} value={m}>{m} month{m>1?'s':''}</option>)}
              </select>
            </div>
          </div>
          {form.amount_requested && (
            <div style={{background:'#EBF8FF',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#17B8D0',fontWeight:500}}>
              Monthly deduction: {formatSAR(monthlyPayment())} / month
            </div>
          )}
          <div className="form-label">Reason</div>
          <textarea value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} rows={3} placeholder="Brief reason for the loan..."
            style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:16,resize:'none',background:'#FAFBFC',color:'#1A202C'}} />
          <button onClick={handleApply} disabled={applyMut.isPending}
            style={{width:'100%',background:'#C8A96E',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:applyMut.isPending?.7:1}}>
            {applyMut.isPending?'Submitting…':'Submit Request'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
