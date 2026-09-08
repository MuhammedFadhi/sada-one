import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { StatusBar, TopBar, PageContent, Avatar, EmptyState } from '@/components/ui'

const ROLE_META: Record<string,{label:string;color:string;icon:string;perms:string[]}> = {
  admin:     {label:'Administrator',color:'#E24B4A',icon:'shield-lock',perms:['Full system access','User management','Role assignment','System settings','Audit logs','All employee data','All financial data']},
  hr_officer:{label:'HR & Finance',color:'#17B8D0',icon:'users',perms:['Employee management','Add/edit employees','HR requests','Onboarding & offboarding','Document tracking','Leave management','Payroll & payslips','Loans & EOS','Expense approvals','Financial reports']},
  finance:   {label:'Finance',color:'#C8A96E',icon:'wallet',perms:['Payroll processing','Loan approvals','EOS calculations','Expense claims','Financial reports','Salary management']},
  manager:   {label:'Manager',color:'#1D9E75',icon:'user-star',perms:['Team overview','Leave approvals','Team attendance','Performance reviews','Team reports']},
  employee:  {label:'Employee',color:'#718096',icon:'user',perms:['View own profile','Request leave','View payslips','Submit HR requests','View documents','Company directory']},
}

export function RoleDetailPage() {
  const { role } = useParams<{role:string}>()
  const navigate = useNavigate()
  const meta = ROLE_META[role??'employee'] ?? ROLE_META.employee

  const { data: users } = useQuery({
    queryKey: ['role-users', role],
    queryFn: async () => {
      const { data } = await supabase.from('user_profiles')
        .select('*, employee:employees(id,full_name_en,job_title_en,avatar_url)')
        .eq('role', role)
      return data ?? []
    },
    enabled: !!role
  })

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:18}}>
        <StatusBar />
        <TopBar title="Role Details" onBack={()=>navigate('/admin/roles')} />
        <div style={{padding:'8px 16px 0',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:54,height:54,borderRadius:15,background:meta.color+'25',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className={`ti ti-${meta.icon}`} style={{color:meta.color,fontSize:26}} />
          </div>
          <div>
            <div style={{color:'white',fontSize:18,fontWeight:700}}>{meta.label}</div>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:12,marginTop:2}}>{users?.length??0} users assigned</div>
          </div>
        </div>
      </div>
      <PageContent>
        {/* Permissions */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:10}}>Permissions</div>
          {meta.perms.map((p,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<meta.perms.length-1?'0.5px solid #F0F0F0':'none'}}>
              <div style={{width:20,height:20,borderRadius:'50%',background:meta.color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="ti ti-check" style={{color:meta.color,fontSize:12}} />
              </div>
              <span style={{fontSize:13,color:'#4A5568'}}>{p}</span>
            </div>
          ))}
        </div>

        {/* Assigned users */}
        <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Assigned Users</div>
        {!users?.length && <EmptyState icon="users" title="No users" subtitle={`No users have the ${meta.label} role.`} />}
        {users?.map((u:any)=>(
          <button key={u.id} onClick={()=>navigate(`/admin/users/${u.id}`)}
            style={{width:'100%',background:'white',borderRadius:12,padding:'10px 14px',border:'none',cursor:'pointer',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:6,display:'flex',alignItems:'center',gap:10}}>
            <Avatar name={u.employee?.full_name_en??'?'} size={36} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{u.employee?.full_name_en}</div>
              <div style={{fontSize:11,color:'#718096'}}>{u.employee?.job_title_en}</div>
            </div>
            {!u.is_active && <span className="badge badge-danger" style={{fontSize:9}}>Inactive</span>}
            <i className="ti ti-chevron-right" style={{color:'#CBD5E0',fontSize:16}} />
          </button>
        ))}
      </PageContent>
    </div>
  )
}
