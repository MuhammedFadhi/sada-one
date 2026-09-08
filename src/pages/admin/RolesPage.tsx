import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { StatusBar, PageContent } from '@/components/ui'

const ROLES = [
  {key:'admin',     label:'Administrator', color:'#E24B4A', icon:'shield-lock',   desc:'Full system access, user & role management'},
  {key:'hr_officer',label:'HR & Finance',  color:'#17B8D0', icon:'users',          desc:'Employees, requests, onboarding, payroll, loans, EOS'},
  {key:'manager',   label:'Manager',       color:'#1D9E75', icon:'user-star',      desc:'Team management, leave approvals'},
  {key:'employee',  label:'Employee',      color:'#718096', icon:'user',           desc:'Self-service: leave, payslips, requests'},
]

export function RolesPage() {
  const { initialized } = useAuthStore()
  const navigate = useNavigate()
  const { data: counts } = useQuery({
    queryKey: ['role-counts'],
    enabled: !!initialized,
    queryFn: async () => {
      const { data } = await supabase.from('user_profiles').select('role')
      const c: Record<string,number> = {}
      data?.forEach((u:any)=>{c[u.role]=(c[u.role]??0)+1})
      return c
    }
  })

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Roles & Permissions</h1></div>
      </div>
      <PageContent>
        <div style={{background:'#EBF8FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#17B8D0',lineHeight:1.6}}>
          <i className="ti ti-info-circle" style={{marginRight:6}} />
          Tap a role to view its permissions and assigned users.
        </div>
        {ROLES.map(r=>(
          <button key={r.key} onClick={()=>navigate(`/admin/roles/${r.key}`)}
            style={{width:'100%',background:'white',borderRadius:14,padding:14,border:'none',cursor:'pointer',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:46,height:46,borderRadius:13,background:r.color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className={`ti ti-${r.icon}`} style={{color:r.color,fontSize:22}} />
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{r.label}</div>
              <div style={{fontSize:11,color:'#718096',marginTop:2,lineHeight:1.4}}>{r.desc}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:700,color:r.color}}>{counts?.[r.key]??0}</div>
              <div style={{fontSize:9,color:'#CBD5E0'}}>users</div>
            </div>
          </button>
        ))}
      </PageContent>
    </div>
  )
}
