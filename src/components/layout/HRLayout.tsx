import { Outlet, useNavigate, useLocation } from 'react-router-dom'
const NAV = [
  {path:'/hr',icon:'home',label:'Home'},
  {path:'/hr/employees',icon:'users',label:'Employees'},
  {path:'/hr/requests',icon:'file-text',label:'Requests'},
  {path:'/finance',icon:'cash',label:'Finance'},
  {path:'/hr/tools',icon:'tools',label:'Tools'},

  {path:'/tasks',icon:'checkbox',label:'Tasks'},
  {path:'/chat',icon:'message-circle',label:'Chat'},
]
export function HRLayout() {
  const navigate=useNavigate(); const location=useLocation()
  const isActive=(path:string)=>path==='/hr'?location.pathname==='/hr':location.pathname.startsWith(path)
  return (
    <div style={{maxWidth:480,margin:'0 auto',height:'100dvh',display:'flex',flexDirection:'column',background:'#0D1B2A',overflow:'hidden'}}>
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',background:'#F4F6F9'}}><Outlet /></div>
      <div style={{background:'#0D1B2A',display:'flex',justifyContent:'space-around',padding:'8px 0',paddingBottom:'max(env(safe-area-inset-bottom, 16px), 16px)'}}>
        {NAV.map(item=>{const active=isActive(item.path);return(
          <button key={item.path} onClick={()=>navigate(item.path)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',opacity:active?1:.45,background:'none',border:'none'}}>
            <i className={`ti ti-${item.icon}`} style={{color:active?'#C8A96E':'white',fontSize:22}} />
            <span style={{color:active?'#C8A96E':'white',fontSize:9,fontWeight:active?600:400}}>{item.label}</span>
          </button>
        )})}
      </div>
    </div>
  )
}
