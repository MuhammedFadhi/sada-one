import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusBar, PageContent, Avatar, SearchBar, Tabs, EmptyState, BottomSheet, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'

const ROLE_COLORS: Record<string,string> = { admin:'#E24B4A', hr_officer:'#17B8D0', finance:'#C8A96E', manager:'#1D9E75', employee:'#718096' }
const ROLES = [
  { value:'employee', label:'Employee' }, { value:'manager', label:'Manager' },
  { value:'hr_officer', label:'HR & Finance' }, { value:'admin', label:'Admin' },
]

export function UsersPage() {
  const { initialized } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [sheet, setSheet] = useState<any|null>(null)   // employee selected for account creation
  const [role, setRole] = useState('employee')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{email:string;temp:string}|null>(null)

  // All employees, each with their login account (if any)
  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-users'],
    enabled: !!initialized,
    queryFn: async () => {
      const { data, error } = await supabase.from('employees')
        .select('id,full_name_en,job_title_en,work_email,avatar_url,status,employee_number,division:divisions!division_id(name_en),profile:user_profiles(id,role,is_active)')
        .order('employee_number')
      if (error) throw error
      return (data ?? []).map((e:any) => {
        const p = Array.isArray(e.profile) ? e.profile[0] : e.profile
        return { employeeId:e.id, profileId:p?.id, name:e.full_name_en, email:e.work_email,
          jobTitle:e.job_title_en, division:e.division?.name_en, empNumber:e.employee_number,
          hasAccount:!!p, role:p?.role, isActive:p?.is_active }
      })
    }
  })

  const withLogin = rows?.filter(r=>r.hasAccount).length ?? 0
  const noLogin   = rows?.filter(r=>!r.hasAccount).length ?? 0
  const filtered = rows?.filter(r=>{
    const s = !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()) || r.empNumber?.toLowerCase().includes(search.toLowerCase())
    const t = tab==='all' ? true : tab==='with' ? r.hasAccount : !r.hasAccount
    return s && t
  }) ?? []

  const openCreate = (r:any) => { setSheet(r); setRole('employee'); setEmail(r.email||''); setCreated(null) }
  const doCreate = async () => {
    if (!email.trim()) return toast.error('Email is required')
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-employee-account', { body: { employee_id: sheet.employeeId, email: email.trim(), role } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setCreated({ email: data.email, temp: data.temp_password })
      qc.invalidateQueries({ queryKey:['admin-users'] })
    } catch (e:any) { toast.error(e.message ?? 'Failed to create account') }
    finally { setBusy(false) }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>User Management</h1>
          <span style={{color:'rgba(255,255,255,.5)',fontSize:12}}>{rows?.length??0} employees</span>
        </div>
      </div>
      <PageContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search employees..." />
        <Tabs tabs={[{key:'all',label:'All',count:rows?.length},{key:'with',label:'With Login',count:withLogin},{key:'none',label:'No Login',count:noLogin}]} active={tab} onChange={setTab} />
        {isLoading && <SkeletonList />}
        {!isLoading && !filtered.length && <EmptyState icon="users" title="No employees found" subtitle="Try a different search or tab." />}
        {filtered.map(r=>(
          <div key={r.employeeId}
            onClick={()=> navigate(`/admin/users/${r.profileId ?? r.employeeId}`)}
            style={{width:'100%',background:'white',borderRadius:14,padding:14,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
            <Avatar name={r.name??'?'} size={42} />
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1A202C',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name??'Unknown'}</div>
              <div style={{fontSize:11,color:'#718096',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.empNumber} · {r.email}</div>
              <div style={{display:'flex',gap:6,marginTop:5,alignItems:'center',flexWrap:'wrap'}}>
                {r.hasAccount ? (
                  <>
                    <span className="badge" style={{background:(ROLE_COLORS[r.role]??'#718096')+'18',color:ROLE_COLORS[r.role]??'#718096',fontSize:9,textTransform:'capitalize'}}>{r.role?.replace(/_/g,' ')}</span>
                    {!r.isActive && <span className="badge badge-danger" style={{fontSize:9}}>Inactive</span>}
                  </>
                ) : (
                  <span className="badge" style={{background:'#C8A96E1F',color:'#9C7B3E',fontSize:9}}>No login account</span>
                )}
              </div>
            </div>
            {r.hasAccount
              ? <i className="ti ti-chevron-right" style={{color:'#CBD5E0',fontSize:18}} />
              : <button onClick={e=>{ e.stopPropagation(); openCreate(r) }}
                  style={{fontSize:11,fontWeight:600,color:'#17B8D0',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:'6px 4px'}}>
                  <i className="ti ti-user-plus" />Create</button>}
          </div>
        ))}
      </PageContent>

      <BottomSheet open={!!sheet} onClose={()=>setSheet(null)} title={created ? 'Account created' : `Create login — ${sheet?.name??''}`}>
        {!created ? (
          <div>
            <div className="form-label">Login Email</div>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com" style={{marginBottom:12}} />
            <div className="form-label">Role</div>
            <select className="input" value={role} onChange={e=>setRole(e.target.value)} style={{marginBottom:16}}>
              {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={doCreate} disabled={busy}
              style={{width:'100%',background:'#17B8D0',color:'white',border:'none',borderRadius:12,padding:13,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:busy?.7:1}}>
              {busy ? 'Creating…' : 'Create login account'}
            </button>
          </div>
        ) : (
          <div>
            <p style={{fontSize:13,color:'#1A202C',marginBottom:12}}>Share these credentials with the employee. They'll be required to change the password on first login.</p>
            <div style={{background:'#F4F6F9',borderRadius:10,padding:12,marginBottom:8}}>
              <div style={{fontSize:10,color:'#A0AEC0',fontWeight:600,textTransform:'uppercase'}}>Email</div>
              <div style={{fontSize:13,fontWeight:600,color:'#1A202C',userSelect:'all'}}>{created.email}</div>
            </div>
            <div style={{background:'#F4F6F9',borderRadius:10,padding:12,marginBottom:16}}>
              <div style={{fontSize:10,color:'#A0AEC0',fontWeight:600,textTransform:'uppercase'}}>Temporary password</div>
              <div style={{fontSize:15,fontWeight:700,color:'#1D9E75',fontFamily:'monospace',userSelect:'all'}}>{created.temp}</div>
            </div>
            <button onClick={()=>{ navigator.clipboard?.writeText(`Email: ${created.email}\nTemp password: ${created.temp}`); toast.success('Copied') }}
              style={{width:'100%',background:'#17294A',color:'white',border:'none',borderRadius:12,padding:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:8}}>
              <i className="ti ti-copy" /> Copy credentials
            </button>
            <button onClick={()=>setSheet(null)} style={{width:'100%',background:'#F4F6F9',color:'#718096',border:'none',borderRadius:12,padding:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Done</button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
