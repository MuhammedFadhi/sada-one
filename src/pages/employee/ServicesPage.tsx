import { useNavigate } from 'react-router-dom'
import { StatusBar, PageContent } from '@/components/ui'

const SERVICES = [
  { group: 'Leave & Time',
    items: [
      {icon:'calendar-check',color:'#17B8D0',bg:'#EBF8FF',label:'Leave Requests',sub:'Apply & track leave',path:'/employee/leave'},
      {icon:'calendar-month',color:'#7F77DD',bg:'#F5F0FF',label:'Company Calendar',sub:'Holidays & events',path:'/employee/calendar'},
    ]
  },
  { group: 'Finance',
    items: [
      {icon:'cash',color:'#E67E22',bg:'#FFF3E0',label:'Loans & Advances',sub:'Apply for financial aid',path:'/employee/loans'},
      {icon:'receipt',color:'#E24B4A',bg:'#FFF0F0',label:'Expense Claims',sub:'Submit expenses',path:'/employee/expenses'},
    ]
  },
  { group: 'HR & Documents',
    items: [
      {icon:'id-badge',color:'#7F77DD',bg:'#F5F0FF',label:'My Documents',sub:'Iqama, passport, etc.',path:'/employee/documents'},
      {icon:'plane-departure',color:'#C8A96E',bg:'#FFF8EC',label:'Exit Re-Entry',sub:'Permit requests',path:'/employee/exit'},
      {icon:'file-text',color:'#7F77DD',bg:'#F5F0FF',label:'HR Requests',sub:'Letters & requests',path:'/employee/hr-requests'},
    ]
  },
  { group: 'Company',
    items: [
      {icon:'sitemap',color:'#17B8D0',bg:'#EBF8FF',label:'Org Chart',sub:'Company hierarchy',path:'/employee/org'},
      {icon:'users',color:'#1D9E75',bg:'#E6FAF0',label:'Directory',sub:'Find colleagues',path:'/employee/directory'},
      {icon:'speakerphone',color:'#C8A96E',bg:'#FFF8EC',label:'Announcements',sub:'Company news',path:'/employee/announcements'},
    ]
  },
  { group: 'Support',
    items: [
      {icon:'headset',color:'#E67E22',bg:'#FFF3E0',label:'Help Desk',sub:'Raise a support ticket',path:'/employee/helpdesk'},
      {icon:'book-2',color:'#17B8D0',bg:'#EBF8FF',label:'Policies',sub:'Company policies',path:'/employee/policies'},
      {icon:'bulb',color:'#E67E22',bg:'#FFF3E0',label:'Suggestions',sub:'Share your ideas',path:'/employee/suggestions'},
    ]
  },
]

export function ServicesPage() {
  const navigate = useNavigate()
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Services</h1></div>
      </div>
      <PageContent>
        {SERVICES.map(group => (
          <div key={group.group} style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:600,color:'#718096',letterSpacing:'.5px',marginBottom:8}}>{group.group.toUpperCase()}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {group.items.map(item => (
                <button key={item.path} onClick={()=>navigate(item.path)}
                  style={{background:'white',borderRadius:14,padding:12,border:'none',cursor:'pointer',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:item.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                    <i className={`ti ti-${item.icon}`} style={{color:item.color,fontSize:18}} />
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:'#1A202C',lineHeight:1.3}}>{item.label}</div>
                  <div style={{fontSize:9,color:'#718096',marginTop:2,lineHeight:1.3}}>{item.sub}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </PageContent>
    </div>
  )
}
