import { useNavigate } from 'react-router-dom'
import { usePayrollRuns, useLoans, useEmployees } from '@/hooks/useData'
import { StatusBar, PageContent, StatStrip, MiniBarChart, formatSAR } from '@/components/ui'
import { DashHeader } from '@/components/DashHeader'

export function FinanceHomePage() {
  const navigate = useNavigate()
  const { data: runs } = usePayrollRuns()
  const { data: loans } = useLoans()

  const latestRun = runs?.[0]
  const pendingLoans = loans?.filter((l:any)=>l.status==='pending').length??0
  const activeLoans  = loans?.filter((l:any)=>l.status==='approved').length??0
  const { data: employees } = useEmployees()
  const salByDept = Object.entries((employees ?? []).reduce((acc: Record<string, number>, e: any) => { const d = e.division?.name_en ?? 'Unassigned'; acc[d] = (acc[d] ?? 0) + (Number(e.salary) || 0); return acc }, {})).map(([label, value]) => ({ label, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 6)
  const empByDept = Object.entries((employees ?? []).reduce((acc: Record<string, number>, e: any) => { const d = e.division?.name_en ?? 'Unassigned'; acc[d] = (acc[d] ?? 0) + 1; return acc }, {})).map(([label, value]) => ({ label, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 6)
  const totalSal = salByDept.reduce((s, d) => s + d.value, 0)
  const hasSal = totalSal > 0
  const deptData = hasSal ? salByDept : empByDept

  const QUICK = [
    {icon:'cash-register',color:'#1D9E75',bg:'#E6FAF0',label:'Payroll',path:'/finance/payroll'},
    {icon:'cash',color:'#C8A96E',bg:'#FFF8EC',label:'Loans',path:'/finance/loans'},
    {icon:'file-invoice',color:'#7F77DD',bg:'#F5F0FF',label:'EOS Calc',path:'/finance/eos'},
    {icon:'chart-pie',color:'#17B8D0',bg:'#EBF8FF',label:'Reports',path:'/finance/reports'},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:20}}>
        <DashHeader label="Finance Portal" title="Finance Dashboard" />
        <div style={{padding:'0 12px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
          {QUICK.map(q=>(
            <button key={q.path} onClick={()=>navigate(q.path)}
              style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:14,boxShadow:'inset 0 1px 0 rgba(255,255,255,.06)',padding:'10px 6px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
              <div style={{width:34,height:34,borderRadius:10,background:q.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className={`ti ti-${q.icon}`} style={{color:q.color,fontSize:17}} />
              </div>
              <span style={{color:'rgba(255,255,255,.72)',fontSize:9,textAlign:'center'}}>{q.label}</span>
            </button>
          ))}
        </div>
      </div>
      <PageContent>
        <StatStrip stats={[
          {label:'Active Loans',  value:activeLoans,  color:'#C8A96E'},
          {label:'Pending Loans', value:pendingLoans, color:'#E67E22'},
          {label:'Payroll Status',value:latestRun?.status?.replace(/_/g,' ')??'—', color:'#17B8D0'},
        ]} />
        {deptData.length > 0 && <MiniBarChart title={hasSal ? 'Monthly Salary by Dept' : 'Headcount by Department'} data={deptData} fmt={hasSal ? formatSAR : undefined} action="Payroll" onAction={()=>navigate('/finance/payroll')} />}
        {latestRun && (
          <>
            <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Latest Payroll Run</div>
            <div style={{background:'#17294A',borderRadius:14,padding:16,marginBottom:14,cursor:'pointer'}} onClick={()=>navigate('/finance/payroll')}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{color:'white',fontSize:15,fontWeight:700}}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(latestRun.month ?? 0)-1]} {(latestRun.year ?? 0)}
                </div>
                <span className="badge" style={{background:latestRun.status==='released'?'rgba(29,158,117,.2)':'rgba(230,126,34,.2)',color:latestRun.status==='released'?'#1D9E75':'#E67E22'}}>
                  {latestRun.status.replace(/_/g,' ')}
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                {[{label:'Net Payroll',val:latestRun.total_net,color:'#1D9E75'},{label:'Gross',val:(latestRun.total_gross ?? 0),color:'rgba(255,255,255,.7)'},{label:'Employees',val:latestRun.employee_count,color:'#17B8D0',isCnt:true}].map((x,i)=>(
                  <div key={i} style={{textAlign:'center'}}>
                    <div style={{color:x.color,fontSize:x.isCnt?18:13,fontWeight:700}}>{x.isCnt?x.val:formatSAR(x.val as number)}</div>
                    <div style={{color:'rgba(255,255,255,.4)',fontSize:9,marginTop:2}}>{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </PageContent>
    </div>
  )
}
