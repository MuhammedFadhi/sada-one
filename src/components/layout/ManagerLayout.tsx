import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { usePendingApprovals } from '@/hooks/useData'

const NAV = [
  {path:'/manager',       icon:'home',         label:'Home'},
  {path:'/manager/approvals',icon:'circle-check',  label:'Approvals'},
  {path:'/manager/team',  icon:'users',        label:'Team'},
  {path:'/manager/reports',icon:'chart-bar',   label:'Reports'},
  {path:'/employee',      icon:'user',         label:'My Portal'},

  {path:'/tasks',icon:'checkbox',label:'Tasks'},
  {path:'/chat',icon:'message-circle',label:'Chat'},
]
export function ManagerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: approvals } = usePendingApprovals()
  const pending = (approvals?.leave?.length??0)+(approvals?.loans?.length??0)
  const isActive = (path:string) => path==='/manager' ? location.pathname==='/manager' : location.pathname.startsWith(path)
  return (
    <div style={{maxWidth:480,margin:'0 auto',height:'100dvh',display:'flex',flexDirection:'column',background:'#0D1B2A',overflow:'hidden'}}>
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',background:'#F4F6F9'}}><Outlet /></div>
      <div style={{background:'#0D1B2A',display:'flex',justifyContent:'space-around',padding:'8px 0',paddingBottom:'max(env(safe-area-inset-bottom, 16px), 16px)'}}>
        {NAV.map(item=>{
          const active=isActive(item.path)
          return (
            <button key={item.path} onClick={()=>navigate(item.path)}
              style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',opacity:active?1:0.45,background:'none',border:'none',position:'relative'}}>
              <div style={{position:'relative'}}>
                <i className={`ti ti-${item.icon}`} style={{color:active?'#C8A96E':'white',fontSize:22}} />
                {item.path==='/manager/approvals' && pending>0 && <div style={{position:'absolute',top:-3,right:-4,width:14,height:14,background:'#E24B4A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:'white'}}>{pending}</div>}
              </div>
              <span style={{color:active?'#C8A96E':'white',fontSize:9,fontWeight:active?600:400}}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
