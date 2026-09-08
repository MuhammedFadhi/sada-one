import { useParams } from 'react-router-dom'
import { useEmployee, useLeaveBalances, useEmployeeDocuments, useLoans, useEmployeePrivate } from '@/hooks/useData'
import { StatusBar, PageContent, TopBar, Avatar, InfoCard, DocExpiryCard, StatusBadge, Tabs, formatDate, formatSAR } from '@/components/ui'
import { useState } from 'react'

export function EmployeeFilePage() {
  const { id } = useParams<{id:string}>()
  const { data: emp } = useEmployee(id!)
  const { data: priv } = useEmployeePrivate(id)
  const { data: docs } = useEmployeeDocuments(id!)
  const { data: balances } = useLeaveBalances(id!, new Date().getFullYear())
  const { data: loans } = useLoans(id)
  const [tab, setTab] = useState('info')

  if (!emp) return <div style={{background:'#0D1B2A',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-loader-2" style={{color:'#17B8D0',fontSize:32,animation:'spin 1s linear infinite'}} /></div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:20}}>
        <StatusBar />
        <TopBar title="Employee File" />
        <div style={{padding:'8px 16px 0',display:'flex',alignItems:'center',gap:12}}>
          <Avatar name={emp.full_name_en} size={50} />
          <div>
            <div style={{color:'white',fontSize:15,fontWeight:600}}>{emp.full_name_en}</div>
            <div style={{color:'rgba(255,255,255,.45)',fontSize:11}}>{emp.full_name_ar}</div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
              <span style={{fontSize:11,color:'#C8A96E'}}>{emp.employee_number}</span>
              <StatusBadge status={emp.status} />
            </div>
          </div>
        </div>
      </div>
      <PageContent>
        <Tabs tabs={[{key:'info',label:'Info'},{key:'docs',label:`Docs (${docs?.length??0})`},{key:'leave',label:'Leave'},{key:'loans',label:'Loans'}]} active={tab} onChange={setTab} />

        {tab==='info' && (
          <>
            <InfoCard title="Personal" rows={[
              {label:'Job Title',     value:emp.job_title_en},
              {label:'Division',      value:emp.division?.name_en??'—'},
              {label:'Manager',       value:emp.manager?.full_name_en??'—'},
              {label:'Join Date',     value:formatDate(emp.join_date)},
              {label:'Contract',      value:emp.contract_type?.replace(/_/g,' ')},
              {label:'Nationality',   value:emp.nationality},
              {label:'Email',         value:emp.work_email},
              {label:'Mobile',        value:emp.mobile??'—'},
            ]} />
            <InfoCard title="Documents" rows={[
              {label:'Iqama #',       value:priv?.iqama_number??'—'},
              {label:'Iqama Expiry',  value:emp.iqama_expiry?formatDate(emp.iqama_expiry):'—'},
              {label:'Passport #',    value:priv?.passport_number??'—'},
              {label:'Passport Exp.', value:emp.passport_expiry?formatDate(emp.passport_expiry):'—'},
            ]} />
          </>
        )}

        {tab==='docs' && (
          <>
            {docs?.length===0 && <div style={{textAlign:'center',padding:32,color:'#718096',fontSize:12}}>No documents uploaded</div>}
            {docs?.map(doc=>(
              <div key={doc.id} style={{background:'white',borderRadius:12,padding:'10px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <div style={{width:36,height:36,borderRadius:10,background:'#EBF8FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="ti ti-file-text" style={{color:'#17B8D0',fontSize:18}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{doc.doc_name}</div>
                  {doc.expiry_date && <div style={{fontSize:11,color:'#718096',marginTop:2}}>Expires: {formatDate(doc.expiry_date,true)}</div>}
                </div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{color:'#17B8D0',fontSize:12,textDecoration:'none'}}>
                    <i className="ti ti-download" />
                  </a>
                )}
              </div>
            ))}
          </>
        )}

        {tab==='leave' && balances?.map(b=>(
          <div key={b.id} style={{background:'white',borderRadius:12,padding:'12px 14px',marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:13,fontWeight:500,color:'#1A202C',textTransform:'capitalize'}}>{b.leave_type} leave</span>
              <span style={{fontSize:15,fontWeight:700,color:'#17B8D0'}}>{b.entitled_days-b.taken_days-b.pending_days} days left</span>
            </div>
            <div style={{display:'flex',gap:12,fontSize:11,color:'#718096'}}>
              <span>Entitled: {b.entitled_days}</span>
              <span>Taken: {b.taken_days}</span>
              <span>Pending: {b.pending_days}</span>
            </div>
          </div>
        ))}

        {tab==='loans' && (
          <>
            {!loans?.length && <div style={{textAlign:'center',padding:32,color:'#718096',fontSize:12}}>No loans</div>}
            {loans?.map(loan=>(
              <div key={loan.id} style={{background:'white',borderRadius:12,padding:'12px 14px',marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:'#1A202C',textTransform:'capitalize'}}>{loan.loan_type.replace(/_/g,' ')}</div>
                  <div style={{fontSize:10,color:'#718096'}}>{formatDate(loan.created_at,true)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#17294A'}}>{formatSAR(loan.amount_requested)}</div>
                  <StatusBadge status={loan.status} />
                </div>
              </div>
            ))}
          </>
        )}
      </PageContent>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
