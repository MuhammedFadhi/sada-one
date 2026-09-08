import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { StatusBar, PageContent, StatStrip, ProgressBar, formatSAR } from '@/components/ui'

// Percentage of the largest entry, safe when the data is empty or all zero.
function pctOfMax(value: unknown, entries: [string, unknown][]): number {
  const v = Number(value) || 0
  const max = Number(entries[0]?.[1]) || 0
  if (max <= 0) return 0
  return Math.min(100, Math.round((v / max) * 100))
}

export function FinanceReportsPage() {
  const { data: payrolls } = useQuery({
    queryKey:['payroll-runs'], queryFn:async()=>{ const{data}=await supabase.from('payroll_runs').select('*').order('year',{ascending:false}).order('month',{ascending:false}).limit(6); return data??[] }
  })
  const { data: loans } = useQuery({
    queryKey:['loans-summary'], queryFn:async()=>{ const{data}=await supabase.from('loans').select('*'); return data??[] }
  })
  const { data: salaries } = useQuery({
    queryKey:['salaries'], queryFn:async()=>{ const{data}=await supabase.from('employee_salaries').select('*, employee:employees!employee_id(division:divisions!division_id(name_en))').is('effective_to',null); return data??[] }
  })

  const otherSum = (o:any) => Array.isArray(o) ? o.reduce((a:number,x:any)=>a+(Number(x?.amount)||0),0) : (Number(o)||0)
  const totalMonthly = salaries?.reduce((a:number,s:any)=>a+(s.basic_salary+(s.housing_allowance??0)+(s.transport_allowance??0)+otherSum(s.other_allowances)),0)??0
  const activeLoans  = loans?.filter((l:any)=>l.status==='active').length??0
  const loanOutstanding = loans?.filter((l:any)=>l.status==='active').reduce((a:number,l:any)=>a+(l.remaining_amount??l.amount),0)??0

  const byDivision = Object.entries(
    salaries?.reduce((acc:any,s:any)=>{const d=s.employee?.division?.name_en??'Unassigned';const tot=s.basic_salary+(s.housing_allowance??0)+(s.transport_allowance??0)+otherSum(s.other_allowances);acc[d]=(acc[d]??0)+tot;return acc},{})??{}
  ).sort((a:any,b:any)=>(b[1] as number)-(a[1] as number))

  const COLORS = ['#17B8D0','#C8A96E','#1D9E75','#7F77DD','#E67E22','#E24B4A','#17294A','#718096']

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Finance Reports</h1></div>
      </div>
      <PageContent>
        <div style={{background:'#17294A',borderRadius:14,padding:16,marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginBottom:4}}>Monthly Payroll Cost</div>
          <div style={{fontSize:26,fontWeight:700,color:'white'}}>{formatSAR(totalMonthly)}</div>
          <div style={{fontSize:11,color:'#C8A96E',marginTop:4}}>{salaries?.length??0} employees</div>
        </div>

        <StatStrip stats={[{label:'Active Loans',value:activeLoans,color:'#E67E22'},{label:'Outstanding',value:formatSAR(loanOutstanding).replace('SAR ',''),color:'#E24B4A'},{label:'Headcount',value:salaries?.length??0,color:'#17B8D0'}]} />

        {/* Payroll cost by division */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:12}}>Payroll Cost by Division</div>
          {byDivision.map(([div,cost]:any,i)=>(
            <div key={div} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                <span style={{color:'#4A5568'}}>{div}</span>
                <span style={{color:COLORS[i%COLORS.length],fontWeight:600}}>{formatSAR(cost)}</span>
              </div>
              <ProgressBar value={pctOfMax(cost, byDivision)} color={COLORS[i%COLORS.length]} />
            </div>
          ))}
        </div>

        {/* Recent payroll runs */}
        {payrolls && payrolls.length > 0 && (
          <div style={{background:'white',borderRadius:14,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:10}}>Recent Payroll Runs</div>
            {payrolls.map((p:any)=>(
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'0.5px solid #F0F0F0'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{p.period}</div>
                  <div style={{fontSize:11,color:'#718096'}}>{p.employee_count??0} employees</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#17294A'}}>{formatSAR(p.total_amount??0)}</div>
                  <span className={`badge badge-${p.status==='paid'?'success':p.status==='approved'?'info':'warning'}`} style={{fontSize:9}}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContent>
    </div>
  )
}
