import { useState } from 'react'
import { useExpiringDocuments } from '@/hooks/useData'
import { StatusBar, PageContent, Avatar, Tabs, SkeletonList } from '@/components/ui'
import { formatDateShort } from '@/lib/dates'

export function DocTrackingPage() {
  const [tab, setTab] = useState('30')
  const days = parseInt(tab)
  const { data: docs, isLoading } = useExpiringDocuments(90)

  const filtered = docs?.filter((d:any) => {
    const daysLeft = Math.ceil((new Date(d.expiry_date).getTime()-Date.now())/86400000)
    if (tab==='expired') return daysLeft < 0
    return daysLeft >= 0 && daysLeft <= days
  }) ?? []

  const getColor = (d: number) => d<0?'#E24B4A':d<30?'#E24B4A':d<60?'#E67E22':'#C8A96E'
  const getBg    = (d: number) => d<0?'#FFF0F0':d<30?'#FFF0F0':d<60?'#FFF3E0':'#FFF8EC'

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Document Tracking</h1>
          {filtered.length>0 && <span style={{background:'#E24B4A',color:'white',borderRadius:10,fontSize:11,fontWeight:700,padding:'3px 9px'}}>{filtered.length}</span>}
        </div>
      </div>
      <PageContent>
        <Tabs tabs={[{key:'30',label:'30 Days'},{key:'60',label:'60 Days'},{key:'90',label:'90 Days'},{key:'expired',label:'Expired'}]} active={tab} onChange={setTab} />
        {isLoading && <SkeletonList />}
        {!isLoading && !filtered.length && (
          <div style={{textAlign:'center',padding:32,color:'#718096'}}>
            <i className="ti ti-circle-check" style={{fontSize:36,color:'#1D9E75',display:'block',marginBottom:8}} />
            <div style={{fontSize:13,fontWeight:500,color:'#4A5568'}}>No documents expiring in this range</div>
          </div>
        )}
        {filtered.map((d:any)=>{
          const daysLeft = Math.ceil((new Date(d.expiry_date).getTime()-Date.now())/86400000)
          const color = getColor(daysLeft)
          const bg    = getBg(daysLeft)
          return (
            <div key={d.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)',borderLeft:`3px solid ${color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <Avatar name={d.employee?.full_name_en??'?'} size={38} />
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{d.employee?.full_name_en}</div>
                  <div style={{fontSize:11,color:'#718096'}}>{d.employee?.job_title_en} · {d.employee?.division?.name_en}</div>
                </div>
              </div>
              <div style={{background:bg,borderRadius:8,padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color}}>{d.doc_name}</div>
                  <div style={{fontSize:11,color,marginTop:2}}>
                    {daysLeft<0?`Expired ${Math.abs(daysLeft)} days ago`:`Expires in ${daysLeft} days`}
                  </div>
                </div>
                <div style={{fontSize:12,color,fontWeight:600}}>{formatDateShort(d.expiry_date)}</div>
              </div>
            </div>
          )
        })}
      </PageContent>
    </div>
  )
}
