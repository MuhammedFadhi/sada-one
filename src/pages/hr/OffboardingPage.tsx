import { useState } from 'react'
import { useEmployees } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, PageContent, Avatar, SearchBar, BottomSheet, ProgressBar } from '@/components/ui'
import toast from 'react-hot-toast'

const OFFBOARD_STEPS = [
  {step_key:'resignation_received', step_label_en:'Resignation Letter Received',  step_order:1},
  {step_key:'exit_interview',       step_label_en:'Exit Interview Conducted',      step_order:2},
  {step_key:'eos_calculated',       step_label_en:'EOS Gratuity Calculated',       step_order:3},
  {step_key:'assets_returned',      step_label_en:'Company Assets Returned',       step_order:4},
  {step_key:'system_access_revoked',step_label_en:'System Access Revoked',         step_order:5},
  {step_key:'iqama_cancelled',      step_label_en:'Iqama Cancellation Filed',      step_order:6},
  {step_key:'final_payment_made',   step_label_en:'Final Settlement Paid',         step_order:7},
  {step_key:'experience_letter',    step_label_en:'Experience Letter Issued',      step_order:8},
]

export function OffboardingPage() {
  const { profile } = useAuthStore()
  const { data: employees } = useEmployees({status:'offboarding'})
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const qc = useQueryClient()

  const { data: checklist } = useQuery({
    queryKey: ['offboarding', selected?.id],
    queryFn: async () => {
      const { data } = await supabase.from('offboarding_checklists').select('*').eq('employee_id',selected.id).order('step_order')
      return data ?? []
    },
    enabled: !!selected?.id
  })

  const completeMut = useMutation({
    mutationFn: async (stepKey: string) => {
      const { error } = await supabase.from('offboarding_checklists').update({ is_completed:true, completed_by:profile?.employee_id, completed_at:new Date().toISOString() }).eq('employee_id',selected.id).eq('step_key',stepKey)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Step completed'); qc.invalidateQueries({queryKey:['offboarding',selected?.id]}) },
    onError: () => toast.error('Failed to update')
  })

  const filtered = employees?.filter(e=>e.full_name_en.toLowerCase().includes(search.toLowerCase()))??[]
  const steps = checklist?.length ? checklist : OFFBOARD_STEPS.map(s=>({...s,is_completed:false}))
  const completed = steps.filter((s:any)=>s.is_completed).length
  const pct = steps.length ? Math.round((completed/steps.length)*100) : 0

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Offboarding</h1>
          <span style={{color:'rgba(255,255,255,.5)',fontSize:12}}>{filtered.length} employees</span>
        </div>
      </div>
      <PageContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search..." />
        {!filtered.length && (
          <div style={{textAlign:'center',padding:32,color:'#718096',fontSize:13}}>
            <i className="ti ti-user-check" style={{fontSize:36,color:'#1D9E75',display:'block',marginBottom:8}} />
            No employees currently offboarding
          </div>
        )}
        {filtered.map(emp=>(
          <div key={emp.id} onClick={()=>setSelected(emp)}
            style={{background:'white',borderRadius:14,padding:14,marginBottom:8,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <Avatar name={emp.full_name_en} size={38} />
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{emp.full_name_en}</div>
                <div style={{fontSize:11,color:'#718096'}}>{emp.job_title_en}</div>
              </div>
              <span className="badge badge-warning">Offboarding</span>
            </div>
            <ProgressBar value={0} color='#E67E22' />
          </div>
        ))}
      </PageContent>

      <BottomSheet open={!!selected} onClose={()=>setSelected(null)} title={`Offboarding: ${selected?.full_name_en??''}`}>
        {selected && (
          <div>
            <div style={{marginBottom:12}}>
              <ProgressBar value={pct} color={pct===100?'#1D9E75':'#E67E22'} label={`${completed} of ${steps.length} steps completed`} />
            </div>
            {steps.map((step:any,i:number)=>(
              <button key={step.step_key??i} onClick={()=>!step.is_completed&&completeMut.mutate(step.step_key)}
                disabled={step.is_completed||completeMut.isPending}
                style={{width:'100%',display:'flex',alignItems:'center',gap:10,background:step.is_completed?'#E6FAF0':'#F4F6F9',borderRadius:10,padding:'10px 12px',border:'none',cursor:step.is_completed?'default':'pointer',marginBottom:6,fontFamily:'inherit'}}>
                <div style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${step.is_completed?'#1D9E75':'#CBD5E0'}`,background:step.is_completed?'#1D9E75':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {step.is_completed && <i className="ti ti-check" style={{color:'white',fontSize:11}} />}
                </div>
                <span style={{fontSize:13,color:step.is_completed?'#1D9E75':'#4A5568',textDecoration:step.is_completed?'line-through':'none',flex:1,textAlign:'left'}}>{step.step_label_en}</span>
                {!step.is_completed && <span style={{fontSize:10,color:'#CBD5E0'}}>Tap to complete</span>}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
