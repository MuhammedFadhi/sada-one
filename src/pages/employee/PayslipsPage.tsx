import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { usePayslips } from '@/hooks/useData'
import { StatusBar, PageContent, BottomSheet, formatSAR, EmptyState, SkeletonList } from '@/components/ui'
import { formatDayMonth } from '@/lib/dates'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function PayslipsPage() {
  const { profile } = useAuthStore()
  const { data: payslips, isLoading } = usePayslips(profile?.employee_id??'')
  const [selected, setSelected] = useState<any>(null)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Payslips</h1></div>
      </div>
      <PageContent>
        {isLoading && <SkeletonList />}
        {!isLoading && !payslips?.length && <EmptyState icon="wallet-off" title="No payslips yet" subtitle="Your payslips will appear here after your first pay run." />}
        {payslips?.map(slip => {
          const m = slip.payroll_run?.month??1; const y = slip.payroll_run?.year??2024
          return (
            <div key={slip.id} onClick={()=>setSelected(slip)} style={{background:'white',borderRadius:14,padding:'14px 16px',marginBottom:10,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:42,height:42,borderRadius:12,background:'#EBF8FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="ti ti-file-invoice" style={{color:'#17B8D0',fontSize:20}} />
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{MONTHS[m-1]} {y}</div>
                <div style={{fontSize:11,color:'#718096',marginTop:2}}>
                  {slip.payment_status==='paid'?'✓ Paid':'Processing'} · Transfer: {slip.payroll_run?.transfer_date?formatDayMonth(slip.payroll_run.transfer_date):'TBD'}
                </div>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#17294A',textAlign:'right'}}>{formatSAR(slip.net_salary)}</div>
                <div style={{fontSize:10,color:'#CBD5E0',textAlign:'right'}}>Net Salary</div>
              </div>
              <i className="ti ti-chevron-right" style={{color:'#CBD5E0',fontSize:16}} />
            </div>
          )
        })}
      </PageContent>

      {/* Payslip Detail Sheet */}
      <BottomSheet open={!!selected} onClose={()=>setSelected(null)} title={selected ? `${MONTHS[(selected.payroll_run?.month??1)-1]} ${selected.payroll_run?.year} Payslip` : ''}>
        {selected && (
          <div>
            {/* Earnings */}
            <div style={{background:'#F4F6F9',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:'#718096',marginBottom:10,letterSpacing:'.5px'}}>EARNINGS</div>
              {[
                {label:'Basic Salary',val:selected.basic_salary},
                {label:'Housing Allowance',val:selected.housing_allowance},
                {label:'Transport Allowance',val:selected.transport_allowance},
                ...(selected.other_allowances??[]).map((a:any)=>({label:a.name,val:a.amount})),
                ...(selected.overtime_amount>0?[{label:'Overtime',val:selected.overtime_amount}]:[]),
              ].map((row,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid #E8EDF5',fontSize:12}}>
                  <span style={{color:'#4A5568'}}>{row.label}</span>
                  <span style={{fontWeight:500,color:'#1A202C'}}>{formatSAR(row.val)}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0 0',fontSize:13,fontWeight:600}}>
                <span style={{color:'#1A202C'}}>Gross Salary</span>
                <span style={{color:'#1D9E75'}}>{formatSAR(selected.gross_salary)}</span>
              </div>
            </div>
            {/* Deductions */}
            {(selected.loan_deduction>0||selected.absence_deduction>0||(selected.other_deductions??[]).length>0) && (
              <div style={{background:'#FFF0F0',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:'#E24B4A',marginBottom:10,letterSpacing:'.5px'}}>DEDUCTIONS</div>
                {[
                  ...(selected.loan_deduction>0?[{label:'Loan Repayment',val:selected.loan_deduction}]:[]),
                  ...(selected.absence_deduction>0?[{label:'Absence Deduction',val:selected.absence_deduction}]:[]),
                  ...(selected.other_deductions??[]).map((d:any)=>({label:d.name,val:d.amount})),
                ].map((row,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:12}}>
                    <span style={{color:'#4A5568'}}>{row.label}</span>
                    <span style={{fontWeight:500,color:'#E24B4A'}}>-{formatSAR(row.val)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Net */}
            <div style={{background:'#17294A',borderRadius:12,padding:16,textAlign:'center',marginBottom:16}}>
              <div style={{color:'rgba(255,255,255,.5)',fontSize:11,marginBottom:4}}>NET SALARY</div>
              <div style={{color:'white',fontSize:28,fontWeight:800}}>{formatSAR(selected.net_salary)}</div>
            </div>
            {selected.pdf_url && (
              <a href={selected.pdf_url} target="_blank" rel="noopener noreferrer"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'#F4F6F9',color:'#17294A',borderRadius:12,padding:12,fontSize:13,fontWeight:500,textDecoration:'none'}}>
                <i className="ti ti-download" /> Download PDF
              </a>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
