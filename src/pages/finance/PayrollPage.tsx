import { useState } from 'react'
import { usePayrollRuns } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { StatusBar, PageContent, Tabs, StatusBadge, formatSAR, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDateShort } from '@/lib/dates'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function PayrollPage() {
  const { data: runs, isLoading, refetch } = usePayrollRuns()
  const [tab, setTab] = useState('runs')
  const [pinModal, setPinModal] = useState<string|null>(null)
  const [pin, setPin] = useState('')
  const CORRECT_PIN = '1234' // In production: store encrypted, verify server-side

  const handleRelease = async (runId: string) => {
    if (pin !== CORRECT_PIN) { toast.error('Incorrect PIN'); return }
    try {
      const { error } = await supabase.from('payroll_runs').update({
        status:'released', released_at: new Date().toISOString()
      }).eq('id', runId)
      if (error) throw error
      toast.success('Payroll released successfully')
      setPinModal(null); setPin('')
      refetch()
    } catch { toast.error('Failed to release payroll') }
  }

  const statusColor: Record<string,string> = {
    draft:'#CBD5E0', pending_approval:'#E67E22', approved:'#17B8D0', released:'#1D9E75', failed:'#E24B4A'
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Payroll</h1></div>
      </div>
      <PageContent>
        <Tabs tabs={[{key:'runs',label:'Payroll Runs'},{key:'new',label:'Create Run'}]} active={tab} onChange={setTab} />

        {tab==='runs' && (
          <>
            {isLoading && <SkeletonList />}
            {runs?.map(run=>(
              <div key={run.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:'#1A202C'}}>{MONTHS_SHORT[(run.month ?? 0)-1]} {(run.year ?? 0)}</div>
                    <div style={{fontSize:11,color:'#718096'}}>{run.employee_count} employees</div>
                  </div>
                  <StatusBadge status={run.status} label={run.status.replace(/_/g,' ')} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                  {[{label:'Gross',val:(run.total_gross ?? 0),color:'#17294A'},{label:'Deductions',val:(run.total_deductions ?? 0),color:'#E24B4A'},{label:'Net',val:run.total_net,color:'#1D9E75'}].map((x,i)=>(
                    <div key={i} style={{background:'#F4F6F9',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'#718096'}}>{x.label}</div>
                      <div style={{fontSize:12,fontWeight:700,color:x.color}}>{formatSAR(x.val)}</div>
                    </div>
                  ))}
                </div>
                {run.status==='approved' && (
                  <button onClick={()=>setPinModal(run.id)}
                    style={{width:'100%',background:'#1D9E75',color:'white',border:'none',borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    <i className="ti ti-lock-open" /> Release Payroll
                  </button>
                )}
                {run.status==='released' && (run.transfer_date ?? "") && (
                  <div style={{textAlign:'center',fontSize:12,color:'#1D9E75',fontWeight:500}}>✓ Transferred on {formatDateShort((run.transfer_date ?? ""))}</div>
                )}
              </div>
            ))}
            {!isLoading && !runs?.length && <div style={{textAlign:'center',padding:32,color:'#718096',fontSize:12}}>No payroll runs yet</div>}
          </>
        )}

        {tab==='new' && (
          <div style={{background:'white',borderRadius:14,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <h3 style={{fontSize:14,fontWeight:600,color:'#1A202C',marginBottom:14}}>Create New Payroll Run</h3>
            <div className="form-row" style={{marginBottom:14}}>
              <div>
                <div className="form-label">Month</div>
                <select className="input" defaultValue={new Date().getMonth()+1}>
                  {MONTHS_SHORT.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <div className="form-label">Year</div>
                <input className="input" type="number" defaultValue={new Date().getFullYear()} />
              </div>
            </div>
            <div style={{background:'#FFF8EC',borderRadius:10,padding:'12px 14px',marginBottom:14,fontSize:12,color:'#C8A96E',lineHeight:1.6}}>
              ⚠️ Creating a payroll run will calculate salaries for all active employees. This action can be undone while in draft status.
            </div>
            <button onClick={()=>toast.success('Payroll run created — review before approving')}
              style={{width:'100%',background:'#17B8D0',color:'white',border:'none',borderRadius:12,padding:13,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              Create Draft Run
            </button>
          </div>
        )}
      </PageContent>

      {/* PIN Modal */}
      {pinModal && (
        <div className="sheet-overlay" onClick={()=>{setPinModal(null);setPin('')}}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 style={{fontSize:15,fontWeight:600,color:'#1A202C',marginBottom:6,textAlign:'center'}}>Authorization Required</h3>
            <p style={{fontSize:12,color:'#718096',textAlign:'center',marginBottom:20}}>Enter your finance authorization PIN to release payroll</p>
            <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}
              placeholder="Enter 4-digit PIN"
              style={{width:'100%',background:'#F4F6F9',border:'1.5px solid #E2E8F0',borderRadius:12,padding:16,fontSize:24,fontWeight:700,letterSpacing:12,textAlign:'center',fontFamily:'inherit',outline:'none',marginBottom:16}} />
            <button onClick={()=>handleRelease(pinModal)} disabled={pin.length<4}
              style={{width:'100%',background:pin.length<4?'#CBD5E0':'#1D9E75',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:pin.length<4?'default':'pointer',fontFamily:'inherit'}}>
              Release Payroll
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
