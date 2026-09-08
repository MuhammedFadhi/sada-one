import { useParams } from 'react-router-dom'
import { useEmployee, useLeaveBalances, useAttendance, useLoans } from '@/hooks/useData'
import { StatusBar, PageContent, TopBar, Avatar, InfoCard, formatDate, formatSAR, Tabs } from '@/components/ui'
import { useState } from 'react'

export function TeamMemberPage() {
  const { id } = useParams<{id:string}>()
  const { data: emp } = useEmployee(id!)
  const { data: balances } = useLeaveBalances(id!, new Date().getFullYear())
  const { data: loans } = useLoans(id)
  const [tab, setTab] = useState('info')

  if (!emp) return <div style={{background:'#0D1B2A',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-loader-2" style={{color:'#17B8D0',fontSize:32,animation:'spin 1s linear infinite'}} /></div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:20}}>
        <StatusBar />
        <TopBar title={emp.full_name_en} />
        <div style={{padding:'8px 16px 0',display:'flex',alignItems:'center',gap:14}}>
          <Avatar name={emp.full_name_en} size={52} />
          <div>
            <div style={{color:'white',fontSize:15,fontWeight:600}}>{emp.full_name_en}</div>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:12,marginTop:2}}>{emp.job_title_en}</div>
            <div style={{color:'#17B8D0',fontSize:11,marginTop:3}}>{emp.division?.name_en} · {emp.employee_number}</div>
          </div>
        </div>
      </div>
      <PageContent>
        <Tabs tabs={[{key:'info',label:'Info'},{key:'leave',label:'Leave'},{key:'loans',label:'Loans'}]} active={tab} onChange={setTab} />
        {tab==='info' && (
          <>
            <InfoCard title="Employee Details" rows={[
              {label:'Email',        value:emp.work_email},
              {label:'Mobile',       value:emp.mobile??'—'},
              {label:'Nationality',  value:emp.nationality},
              {label:'Join Date',    value:formatDate(emp.join_date)},
              {label:'Contract',     value:emp.contract_type?.replace(/_/g,' ')},
              {label:'Status',       value:<span className={`badge badge-${emp.status==='active'?'success':'warning'}`}>{emp.status}</span>},
            ]} />
          </>
        )}
        {tab==='leave' && (
          <div>
            {balances?.map(b=>(
              <div key={b.id} style={{background:'white',borderRadius:12,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1A202C',textTransform:'capitalize'}}>{b.leave_type} leave</div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#17B8D0'}}>{b.entitled_days-b.taken_days-b.pending_days} days</div>
                  <div style={{fontSize:10,color:'#718096'}}>{b.taken_days} taken</div>
                </div>
              </div>
            ))}
            {!balances?.length && <div style={{textAlign:'center',padding:24,color:'#718096',fontSize:12}}>No leave data</div>}
          </div>
        )}
        {tab==='loans' && (
          <div>
            {loans?.map(loan=>(
              <div key={loan.id} style={{background:'white',borderRadius:12,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:'#1A202C',textTransform:'capitalize'}}>{loan.loan_type.replace(/_/g,' ')}</div>
                  <div style={{fontSize:10,color:'#718096',marginTop:2}}>{loan.repayment_months} months</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#17294A'}}>{formatSAR(loan.amount_requested)}</div>
                  <span className={`badge badge-${loan.status==='approved'?'success':loan.status==='rejected'?'danger':'warning'}`}>{loan.status}</span>
                </div>
              </div>
            ))}
            {!loans?.length && <div style={{textAlign:'center',padding:24,color:'#718096',fontSize:12}}>No loans</div>}
          </div>
        )}
      </PageContent>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
