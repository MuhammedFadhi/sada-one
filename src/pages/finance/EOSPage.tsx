import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatusBar, PageContent, Tabs, formatSAR } from '@/components/ui'
import toast from 'react-hot-toast'

export function EOSPage() {
  const [tab, setTab] = useState('calculator')
  const [form, setForm] = useState({ join_date:'', last_day:'', basic_salary:'', reason:'resignation', unused_leave:'0' })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    if (!form.join_date||!form.last_day||!form.basic_salary) return toast.error('Fill all required fields')
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('calculate_eos', {
        p_join_date: form.join_date,
        p_last_day: form.last_day,
        p_basic_salary: parseFloat(form.basic_salary),
        p_termination_reason: form.reason,
        p_unused_leave_days: parseInt(form.unused_leave)||0,
        p_outstanding_salary: 0,
        p_loan_deductions: 0,
      })
      if (error) throw error
      setResult(data)
    } catch (err:any) { toast.error(err.message||'Calculation failed') }
    setLoading(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>End of Service</h1></div>
      </div>
      <PageContent>
        <Tabs tabs={[{key:'calculator',label:'EOS Calculator'},{key:'records',label:'Records'}]} active={tab} onChange={setTab} />

        {tab==='calculator' && (
          <div>
            <div style={{background:'#EBF8FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#17B8D0',lineHeight:1.6}}>
              📋 Based on Saudi Labor Law Article 84. Gratuity is calculated on basic salary only.
            </div>
            <div style={{background:'white',borderRadius:14,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div className="form-row" style={{marginBottom:12}}>
                <div><div className="form-label">Join Date *</div><input className="input" type="date" value={form.join_date} onChange={e=>setForm(p=>({...p,join_date:e.target.value}))} /></div>
                <div><div className="form-label">Last Working Day *</div><input className="input" type="date" value={form.last_day} onChange={e=>setForm(p=>({...p,last_day:e.target.value}))} /></div>
              </div>
              <div style={{marginBottom:12}}>
                <div className="form-label">Basic Salary (SAR) *</div>
                <input className="input" type="number" placeholder="e.g. 8000" value={form.basic_salary} onChange={e=>setForm(p=>({...p,basic_salary:e.target.value}))} />
              </div>
              <div style={{marginBottom:12}}>
                <div className="form-label">Termination Reason</div>
                <select className="input" value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}>
                  <option value="resignation">Resignation</option>
                  <option value="contract_end">Contract End</option>
                  <option value="employer_termination">Employer Termination</option>
                  <option value="mutual_agreement">Mutual Agreement</option>
                  <option value="retirement">Retirement</option>
                </select>
              </div>
              <div style={{marginBottom:16}}>
                <div className="form-label">Unused Leave Days</div>
                <input className="input" type="number" placeholder="0" value={form.unused_leave} onChange={e=>setForm(p=>({...p,unused_leave:e.target.value}))} />
              </div>
              <button onClick={handleCalculate} disabled={loading}
                style={{width:'100%',background:'#C8A96E',color:'white',border:'none',borderRadius:12,padding:13,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:loading?.7:1}}>
                {loading?'Calculating…':'Calculate EOS'}
              </button>
            </div>

            {result && (
              <div style={{marginTop:14}}>
                <div style={{background:'#17294A',borderRadius:14,padding:16,textAlign:'center',marginBottom:10}}>
                  <div style={{color:'rgba(255,255,255,.5)',fontSize:11,marginBottom:4}}>TOTAL PAYABLE</div>
                  <div style={{color:'white',fontSize:28,fontWeight:800}}>{formatSAR(result.total_payable)}</div>
                  <div style={{color:'#C8A96E',fontSize:12,marginTop:4}}>{result.years_of_service} years of service</div>
                </div>
                <div style={{background:'white',borderRadius:14,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                  {[
                    {label:'Gratuity',         val:result.gratuity_amount,     color:'#17294A'},
                    {label:'Unused Leave Pay',  val:result.unused_leave_amount, color:'#17294A'},
                    {label:'Outstanding Salary',val:result.outstanding_salary,  color:'#17294A'},
                    {label:'Loan Deductions',   val:-result.loan_deductions,    color:'#E24B4A'},
                    {label:'Daily Rate',        val:result.daily_rate,          color:'#718096'},
                  ].map((row,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<4?'0.5px solid #F0F0F0':'none',fontSize:12}}>
                      <span style={{color:'#718096'}}>{row.label}</span>
                      <span style={{fontWeight:600,color:row.color}}>{row.val<0?'-':''}{formatSAR(Math.abs(row.val))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==='records' && (
          <div style={{textAlign:'center',padding:48,color:'#718096'}}>
            <i className="ti ti-file-off" style={{fontSize:36,color:'#CBD5E0',display:'block',marginBottom:8}} />
            <p style={{fontSize:13}}>EOS records will appear here</p>
          </div>
        )}
      </PageContent>
    </div>
  )
}
