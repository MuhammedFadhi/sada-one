import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBar, TopBar, PageContent, Avatar, InfoCard, Toggle, BottomSheet, Button } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDateShort, formatDateTime } from '@/lib/dates'

const ROLES = [
  {key:'employee',  label:'Employee',    color:'#718096'},
  {key:'manager',   label:'Manager',     color:'#1D9E75'},
  {key:'hr_officer',label:'HR & Finance',color:'#17B8D0'},
  
  {key:'admin',     label:'Admin',       color:'#E24B4A'},
]

export function UserDetailPage() {
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pwOpen, setPwOpen]     = useState(false)
  const [newPw, setNewPw]       = useState('')
  const [forceChange, setForceChange] = useState(true)
  const [empForm, setEmpForm]   = useState<any>(null)   // null = view mode
  const [hardMode, setHardMode] = useState(false)
  const [typed, setTyped] = useState('')

  const openConfirm = (hard: boolean) => { setHardMode(hard); setTyped(''); setConfirmOpen(true) }

  const deleteMut = useMutation({
    mutationFn: async (hard: boolean) => {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { user_id: id, hard } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: () => {
      toast.success(hardMode ? 'User permanently erased' : 'User deleted')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      navigate('/admin/users')
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete user'),
  })

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      // `id` may be a user_profiles id (person has a login) OR an employees id —
      // imported staff have no account yet but their record must still be editable.
      const { data: prof } = await supabase.from('user_profiles')
        .select('*, employee:employees(*, division:divisions!division_id(name_en))')
        .eq('id', id).maybeSingle()
      if (prof) return prof
      const { data: emp, error } = await supabase.from('employees')
        .select('*, division:divisions!division_id(name_en)')
        .eq('id', id).single()
      if (error) throw error
      return { id: null, employee_id: emp.id, role: null, is_active: null,
               must_change_password: null, last_login_at: null, employee: emp, noAccount: true }
    },
    enabled: !!id
  })

  const { data: orgData } = useQuery({
    queryKey: ['admin-org-lists'],
    queryFn: async () => {
      const [c, d, dep, e] = await Promise.all([
        supabase.from('companies').select('id,name_en').order('name_en'),
        supabase.from('divisions').select('id,name_en,company_id').order('name_en'),
        supabase.from('departments').select('id,name_en,division_id').order('name_en'),
        supabase.from('employees').select('id,full_name_en').eq('status','active').order('full_name_en'),
      ])
      return { companies: c.data ?? [], divisions: d.data ?? [], departments: dep.data ?? [], employees: e.data ?? [] }
    }
  })

  const resetPwMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-user-ops', {
        body: { action: 'reset_password', user_id: id, new_password: newPw, force_change: forceChange }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: () => { toast.success('Password reset ✓'); setPwOpen(false); setNewPw(''); qc.invalidateQueries({queryKey:['admin-user',id]}) },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to reset password')
  })

  const noAccount = !!(user as any)?.noAccount
  const needsAccount = () => { toast.error('No login account yet — create one from the Users list first.'); }

  const empMut = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from('employees').update(updates).eq('id', user?.employee?.id)
      if (error) throw error

      // The login email lives in auth.users, NOT on the employee record.
      // Editing work_email alone changed the address shown in the app while the
      // person still had to sign in with the old one — which reads exactly like
      // "wrong password" and is impossible to diagnose from the UI.
      // Keep the two in step whenever the email actually changes.
      const newEmail = (updates.work_email ?? '').trim()
      const oldEmail = (user?.employee?.work_email ?? '').trim()
      if (newEmail && newEmail.toLowerCase() !== oldEmail.toLowerCase() && !(user as any)?.noAccount && user?.id) {
        const { data: sess } = await supabase.auth.getSession()
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-ops`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${sess?.session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ action: 'update_email', user_id: user.id, new_email: newEmail }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          // Surface it loudly: the employee record saved but the login did not move.
          throw new Error(`Details saved, but the sign-in email could NOT be changed: ${body.error ?? res.status}. They must keep using ${oldEmail}.`)
        }
      }
    },
    onSuccess: () => { toast.success('Employee updated'); setEmpForm(null); qc.invalidateQueries({queryKey:['admin-user',id]}); qc.invalidateQueries({queryKey:['employees']}) },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to update employee')
  })

  const updateMut = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from('user_profiles').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({queryKey:['admin-user',id]}); qc.invalidateQueries({queryKey:['admin-users']}) },
    onError: () => toast.error('Failed to update')
  })

  if (isLoading || !user) return (
    <div style={{background:'#0D1B2A',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <i className="ti ti-loader-2" style={{color:'#17B8D0',fontSize:32,animation:'spin 1s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const emp = user.employee

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:18}}>
        <StatusBar />
        <TopBar title="User Details" onBack={()=>navigate('/admin/users')} />
        <div style={{padding:'8px 16px 0',display:'flex',alignItems:'center',gap:14}}>
          <Avatar name={emp?.full_name_en??'?'} size={54} />
          <div>
            <div style={{color:'white',fontSize:16,fontWeight:600}}>{emp?.full_name_en}</div>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:12,marginTop:2}}>{emp?.work_email}</div>
            <div style={{color:'#C8A96E',fontSize:11,marginTop:3}}>{emp?.employee_number} · {emp?.division?.name_en}</div>
          </div>
        </div>
      </div>
      <PageContent>
        {noAccount && (
          <div style={{background:'#FFF8E8',border:'1px solid #C8A96E55',borderRadius:12,padding:12,marginBottom:12,display:'flex',gap:9,alignItems:'flex-start'}}>
            <i className="ti ti-info-circle" style={{color:'#9C7B3E',fontSize:16,marginTop:1}} />
            <div style={{fontSize:12,color:'#7A5F2E',lineHeight:1.45}}>
              <b>No login account yet.</b> You can edit every detail below. Role, password and account
              controls become available once a login is created from the Users list.
            </div>
          </div>
        )}
        {/* Role assignment */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:12}}>Role & Permissions</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {ROLES.map(r=>(
              <button key={r.key} onClick={()=> noAccount ? needsAccount() : updateMut.mutate({role:r.key})}
                style={{background:user.role===r.key?r.color+'18':'#F4F6F9',border:`2px solid ${user.role===r.key?r.color:'transparent'}`,borderRadius:10,padding:'10px 6px',cursor:'pointer',fontFamily:'inherit'}}>
                <div style={{fontSize:11,fontWeight:600,color:user.role===r.key?r.color:'#718096'}}>{r.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Account controls */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:12}}>Account Status</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid #F0F0F0'}}>
            <div><div style={{fontSize:13,color:'#1A202C'}}>Active Account</div><div style={{fontSize:11,color:'#718096'}}>User can sign in</div></div>
            <Toggle on={!!user.is_active} onChange={v=> noAccount ? needsAccount() : updateMut.mutate({is_active:v})} />
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}>
            <div><div style={{fontSize:13,color:'#1A202C'}}>Force Password Change</div><div style={{fontSize:11,color:'#718096'}}>On next login</div></div>
            <Toggle on={!!user.must_change_password} onChange={v=> noAccount ? needsAccount() : updateMut.mutate({must_change_password:v})} />
          </div>
        </div>

        {/* Employee details editor */}
        {emp && (
          <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>Employee Details</div>
              {!empForm
                ? <button onClick={()=>setEmpForm({full_name_en:emp.full_name_en??'',full_name_ar:emp.full_name_ar??'',job_title_en:emp.job_title_en??'',job_title_ar:emp.job_title_ar??'',employee_number:emp.employee_number??'',work_email:emp.work_email??'',mobile:emp.mobile??'',nationality:emp.nationality??'',iqama_number:emp.iqama_number??'',passport_number:emp.passport_number??'',emergency_contact:emp.emergency_contact??'',date_of_birth:emp.date_of_birth??'',iqama_expiry:emp.iqama_expiry??'',passport_expiry:emp.passport_expiry??'',join_date:emp.join_date??'',contract_end_date:emp.contract_end_date??'',gender:emp.gender??'',contract_type:emp.contract_type??'permanent',status:emp.status??'active',company_id:emp.company_id??'',division_id:emp.division_id??'',department_id:emp.department_id??'',manager_id:emp.manager_id??''})}
                    style={{background:'#EBF8FF',color:'#17B8D0',border:'none',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    <i className="ti ti-pencil" style={{fontSize:12,marginRight:4}} />Edit
                  </button>
                : <button onClick={()=>setEmpForm(null)} style={{background:'none',color:'#718096',border:'none',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>}
            </div>
            {!empForm ? (
              <div>
                {[['Employee No.',emp.employee_number],['Name (EN)',emp.full_name_en],['Name (AR)',emp.full_name_ar],
                  ['Job Title',emp.job_title_en],['Job Title (AR)',emp.job_title_ar],
                  ['Work Email',emp.work_email],['Mobile',emp.mobile],
                  ['Date of Birth',emp.date_of_birth],['Gender',emp.gender],['Nationality',emp.nationality],
                  ['Iqama / ID',emp.iqama_number],['Iqama Expiry',emp.iqama_expiry],
                  ['Passport',emp.passport_number],['Passport Expiry',emp.passport_expiry],
                  ['Emergency Contact',emp.emergency_contact],
                  ['Joined',emp.join_date],['Contract',emp.contract_type],['Contract Ends',emp.contract_end_date],
                  ['Status',emp.status],
                  ['Company',orgData?.companies.find((c:any)=>c.id===emp.company_id)?.name_en],
                  ['Division',orgData?.divisions.find((d:any)=>d.id===emp.division_id)?.name_en],
                  ['Department',orgData?.departments.find((d:any)=>d.id===emp.department_id)?.name_en],
                  ['Manager',orgData?.employees.find((e:any)=>e.id===emp.manager_id)?.full_name_en],
                ].map(([l,v],i,arr)=>(
                  <div key={String(l)} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<arr.length-1?'0.5px solid #F0F0F0':'none'}}>
                    <span style={{fontSize:12,color:'#718096'}}>{l}</span>
                    <span style={{fontSize:12,color:'#1A202C',fontWeight:500,textAlign:'right'}}>{v??'—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {([['employee_number','Employee Number'],['full_name_en','Name (English)'],['full_name_ar','Name (Arabic)'],
                   ['job_title_en','Job Title (English)'],['job_title_ar','Job Title (Arabic)'],
                   ['work_email','Work Email'],['mobile','Mobile'],['nationality','Nationality'],
                   ['iqama_number','Iqama / ID Number'],['passport_number','Passport Number'],
                   ['emergency_contact','Emergency Contact']] as const).map(([k,l])=>(
                  <div key={k}>
                    <div style={{fontSize:11,color:'#718096',marginBottom:4}}>{l}</div>
                    <input className="input" value={empForm[k]} onChange={e=>setEmpForm({...empForm,[k]:e.target.value})} />
                  </div>
                ))}
                {([['date_of_birth','Date of Birth'],['iqama_expiry','Iqama Expiry'],['passport_expiry','Passport Expiry'],['join_date','Joining Date'],['contract_end_date','Contract End Date']] as const).map(([k,l])=>(
                  <div key={k}>
                    <div style={{fontSize:11,color:'#718096',marginBottom:4}}>{l}</div>
                    <input className="input" type="date" value={empForm[k]??''} onChange={e=>setEmpForm({...empForm,[k]:e.target.value})} />
                  </div>
                ))}
                {([['gender','Gender',[['','— None —'],['male','Male'],['female','Female']]],
                   ['contract_type','Contract Type',[['permanent','Permanent'],['fixed_term','Fixed Term'],['probation','Probation'],['contractor','Contractor']]],
                   ['status','Employment Status',[['active','Active'],['on_leave','On Leave'],['offboarding','Offboarding'],['inactive','Inactive']]]] as const).map(([k,l,opts])=>(
                  <div key={k}>
                    <div style={{fontSize:11,color:'#718096',marginBottom:4}}>{l}</div>
                    <select className="input" value={empForm[k]??''} onChange={e=>setEmpForm({...empForm,[k]:e.target.value})}>
                      {(opts as any).map(([v,lab]:any)=><option key={v} value={v}>{lab}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <div style={{fontSize:11,color:'#718096',marginBottom:4}}>Company</div>
                  <select className="input" value={empForm.company_id} onChange={e=>setEmpForm({...empForm,company_id:e.target.value,division_id:'',department_id:''})}>
                    <option value="">— Select —</option>
                    {orgData?.companies.map((c:any)=><option key={c.id} value={c.id}>{c.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:'#718096',marginBottom:4}}>Division</div>
                  <select className="input" value={empForm.division_id} onChange={e=>setEmpForm({...empForm,division_id:e.target.value,department_id:''})}>
                    <option value="">— None —</option>
                    {orgData?.divisions.filter((d:any)=>!empForm.company_id||d.company_id===empForm.company_id).map((d:any)=><option key={d.id} value={d.id}>{d.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:'#718096',marginBottom:4}}>Department</div>
                  <select className="input" value={empForm.department_id} onChange={e=>setEmpForm({...empForm,department_id:e.target.value})}>
                    <option value="">— None —</option>
                    {orgData?.departments.filter((d:any)=>!empForm.division_id||d.division_id===empForm.division_id).map((d:any)=><option key={d.id} value={d.id}>{d.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:'#718096',marginBottom:4}}>Manager (reports to)</div>
                  <select className="input" value={empForm.manager_id} onChange={e=>setEmpForm({...empForm,manager_id:e.target.value})}>
                    <option value="">— No manager —</option>
                    {orgData?.employees.filter((e:any)=>e.id!==emp.id).map((e:any)=><option key={e.id} value={e.id}>{e.full_name_en}</option>)}
                  </select>
                </div>
                <Button fullWidth loading={empMut.isPending}
                  onClick={()=>empMut.mutate({
                    employee_number: empForm.employee_number, full_name_en: empForm.full_name_en,
                    full_name_ar: empForm.full_name_ar || empForm.full_name_en,
                    job_title_en: empForm.job_title_en, job_title_ar: empForm.job_title_ar || empForm.job_title_en,
                    work_email: empForm.work_email, mobile: empForm.mobile || null,
                    nationality: empForm.nationality || null, gender: empForm.gender || null,
                    iqama_number: empForm.iqama_number || null, passport_number: empForm.passport_number || null,
                    emergency_contact: empForm.emergency_contact || null,
                    date_of_birth: empForm.date_of_birth || null, iqama_expiry: empForm.iqama_expiry || null,
                    passport_expiry: empForm.passport_expiry || null, join_date: empForm.join_date || null,
                    contract_end_date: empForm.contract_end_date || null,
                    contract_type: empForm.contract_type, status: empForm.status,
                    company_id: empForm.company_id || null, division_id: empForm.division_id || null,
                    department_id: empForm.department_id || null, manager_id: empForm.manager_id || null,
                  })}>
                  {empMut.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Password reset */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Password</div>
          <div style={{fontSize:11,color:'#718096',marginBottom:10}}>Set a new password for this user. Optionally force them to change it on next login.</div>
          <button onClick={()=>setPwOpen(true)}
            style={{width:'100%',background:'#EBF8FF',color:'#17B8D0',border:'1px solid rgba(23,184,208,.3)',borderRadius:10,padding:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <i className="ti ti-key" /> Reset Password
          </button>
        </div>

        <InfoCard title="Activity" rows={[
          {label:'Last Login', value:user.last_login_at?formatDateTime(user.last_login_at):'Never'},
          {label:'Created',    value:formatDateShort(user.created_at)},
        ]} />

        {/* Danger zone */}
        <div style={{background:'white',borderRadius:14,padding:14,marginTop:12,border:'1px solid #FED7D7',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#E24B4A',marginBottom:10}}>Danger Zone</div>

          <div style={{fontSize:11,color:'#718096',marginBottom:8}}>Removes the login and marks the employee <b>terminated</b> (record kept for history).</div>
          <button onClick={()=>openConfirm(false)}
            style={{width:'100%',background:'#FFF5F5',color:'#E24B4A',border:'1px solid #FEB2B2',borderRadius:10,padding:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:14}}>
            <i className="ti ti-user-off" /> Delete User (keep history)
          </button>

          <div style={{fontSize:11,color:'#718096',marginBottom:8}}>Permanently erases the login, the employee record, and <b>all their data</b>. Irreversible.</div>
          <button onClick={()=>openConfirm(true)}
            style={{width:'100%',background:'#E24B4A',color:'white',border:'none',borderRadius:10,padding:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <i className="ti ti-trash-x" /> Hard Delete — Erase Everything
          </button>
        </div>
      </PageContent>

      <BottomSheet open={confirmOpen} onClose={()=>setConfirmOpen(false)} title={hardMode?'Permanently erase this user?':'Delete this user?'}>
        <div style={{fontSize:13,color:'#4A5568',lineHeight:1.6,marginBottom:16}}>
          {hardMode
            ? <><b>{emp?.full_name_en}</b> ({emp?.work_email}) and <b>all their records</b> (leave, payslips, attendance, documents, tasks, messages…) will be permanently deleted. This <b>cannot be undone</b>.</>
            : <><b>{emp?.full_name_en}</b> ({emp?.work_email}) will lose access immediately and be marked <b>terminated</b>. The record is kept for history.</>}
        </div>
        {hardMode && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:'#718096',marginBottom:6}}>Type <b>DELETE</b> to confirm:</div>
            <input value={typed} onChange={e=>setTyped(e.target.value)} placeholder="DELETE"
              style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #E2E8F0',fontSize:14,fontFamily:'inherit',outline:'none'}} />
          </div>
        )}
        <div style={{display:'flex',gap:10}}>
          <Button variant="secondary" fullWidth onClick={()=>setConfirmOpen(false)}>Cancel</Button>
          <Button variant="danger" fullWidth
            disabled={hardMode && typed.trim().toUpperCase()!=='DELETE'}
            loading={deleteMut.isPending}
            onClick={()=>deleteMut.mutate(hardMode)}>
            {deleteMut.isPending ? 'Deleting…' : hardMode ? 'Erase everything' : 'Delete'}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={pwOpen} onClose={()=>setPwOpen(false)} title="Reset Password">
        <div style={{fontSize:12,color:'#718096',marginBottom:12}}>New password for <b>{emp?.full_name_en}</b> ({emp?.work_email})</div>
        <input className="input" type="text" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          placeholder="New password (min 8 characters)" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{marginBottom:12}} />
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div><div style={{fontSize:13,color:'#1A202C'}}>Force change on next login</div></div>
          <Toggle on={forceChange} onChange={setForceChange} />
        </div>
        <Button fullWidth loading={resetPwMut.isPending} disabled={newPw.length<8}
          onClick={()=>resetPwMut.mutate()}>
          {resetPwMut.isPending ? 'Resetting…' : 'Set New Password'}
        </Button>
      </BottomSheet>
    </div>
  )
}
