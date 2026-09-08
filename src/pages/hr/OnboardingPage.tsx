import { useState } from 'react'
import { useEmployees, useOnboardingChecklist, useCompleteOnboardingStep } from '@/hooks/useData'
import { StatusBar, PageContent, Avatar, SearchBar, ProgressBar } from '@/components/ui'

const DEFAULT_STEPS = [
  {step_key:'documents_collected', step_label_en:'Documents Collected', step_order:1},
  {step_key:'iqama_applied',       step_label_en:'Iqama Application Submitted', step_order:2},
  {step_key:'system_access',       step_label_en:'System Access Granted', step_order:3},
  {step_key:'equipment_issued',    step_label_en:'Equipment Issued', step_order:4},
  {step_key:'orientation_done',    step_label_en:'Orientation Completed', step_order:5},
  {step_key:'policy_signed',       step_label_en:'Policies Acknowledged', step_order:6},
  {step_key:'training_enrolled',   step_label_en:'Training Enrolled', step_order:7},
  {step_key:'probation_review',    step_label_en:'Probation Review Scheduled', step_order:8},
]

function OnboardingCard({ emp }: { emp: any }) {
  const { data: checklist } = useOnboardingChecklist(emp.id)
  const completeMut = useCompleteOnboardingStep()
  const steps = checklist?.length ? checklist : DEFAULT_STEPS.map(s=>({...s,employee_id:emp.id,is_completed:false}))
  const completed = steps.filter((s:any)=>s.is_completed).length
  const pct = Math.round((completed/steps.length)*100)

  return (
    <div style={{background:'white',borderRadius:14,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
        <Avatar name={emp.full_name_en} size={38} />
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{emp.full_name_en}</div>
          <div style={{fontSize:11,color:'#718096'}}>{emp.job_title_en}</div>
        </div>
        <div style={{fontSize:13,fontWeight:700,color:pct===100?'#1D9E75':'#17B8D0'}}>{pct}%</div>
      </div>
      <ProgressBar value={pct} color={pct===100?'#1D9E75':'#17B8D0'} />
      <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:4}}>
        {steps.map((step:any,i:number)=>(
          <button key={step.step_key??i} onClick={()=>!step.is_completed&&checklist?.length&&completeMut.mutate({employeeId:emp.id,stepKey:step.step_key})}
            style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:step.is_completed?'default':'pointer',padding:'5px 0',textAlign:'left',fontFamily:'inherit'}}>
            <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${step.is_completed?'#1D9E75':'#E2E8F0'}`,background:step.is_completed?'#1D9E75':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {step.is_completed && <i className="ti ti-check" style={{color:'white',fontSize:11}} />}
            </div>
            <span style={{fontSize:12,color:step.is_completed?'#1D9E75':'#4A5568',textDecoration:step.is_completed?'line-through':'none'}}>{step.step_label_en}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function OnboardingPage() {
  const { data: employees } = useEmployees({status:'active'})
  const [search, setSearch] = useState('')
  const recent = employees?.filter(e => {
    const joinDate = new Date(e.join_date)
    const days = Math.ceil((Date.now()-joinDate.getTime())/86400000)
    return days <= 90
  }).filter(e => e.full_name_en.toLowerCase().includes(search.toLowerCase())) ?? []

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Onboarding</h1>
          <span style={{color:'rgba(255,255,255,.5)',fontSize:12}}>{recent.length} employees</span>
        </div>
      </div>
      <PageContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search new employees..." />
        {!recent.length && (
          <div style={{textAlign:'center',padding:32,color:'#718096',fontSize:13}}>
            <i className="ti ti-user-check" style={{fontSize:36,color:'#CBD5E0',display:'block',marginBottom:8}} />
            No employees joined in the last 90 days
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {recent.map(emp=><OnboardingCard key={emp.id} emp={emp} />)}
        </div>
      </PageContent>
    </div>
  )
}
