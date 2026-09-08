import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { StatusBar, PageContent } from '@/components/ui'
import { formatDayMonth } from '@/lib/dates'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export function CalendarPage() {
  const now   = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { data: holidays } = useQuery({
    queryKey: ['holidays', year],
    queryFn: async () => {
      const { data } = await supabase.from('public_holidays').select('*').eq('year', year).order('date')
      return data ?? []
    }
  })

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }

  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMon = new Date(year, month+1, 0).getDate()

  const isHoliday  = (d: number) => holidays?.some((h:any) => new Date(h.date+'T00:00').getDate()===d && new Date(h.date+'T00:00').getMonth()===month)
  const isWeekend  = (d: number) => { const day = new Date(year,month,d).getDay(); return day===5||day===6 }
  const isToday    = (d: number) => d===now.getDate()&&month===now.getMonth()&&year===now.getFullYear()
  const getHoliday = (d: number) => holidays?.find((h:any) => new Date(h.date+'T00:00').getDate()===d && new Date(h.date+'T00:00').getMonth()===month)

  const upcomingHols = holidays?.filter((h:any) => new Date(h.date) >= new Date()) ?? []

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <button onClick={prevMonth} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white'}}>
            <i className="ti ti-chevron-left" style={{fontSize:18}} />
          </button>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>{MONTHS[month]} {year}</h1>
          <button onClick={nextMonth} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white'}}>
            <i className="ti ti-chevron-right" style={{fontSize:18}} />
          </button>
        </div>
      </div>
      <PageContent>
        {/* Calendar grid */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:6}}>
            {DAYS.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:600,color:'#718096',padding:'4px 0'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
            {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`} />)}
            {Array(daysInMon).fill(null).map((_,i)=>{
              const d = i+1
              const holiday = getHoliday(d)
              const today   = isToday(d)
              const weekend = isWeekend(d)
              const hasHol  = !!holiday
              return (
                <div key={d} style={{
                  textAlign:'center', padding:'6px 2px', borderRadius:8, fontSize:13, fontWeight:today?700:400,
                  background: today?'#17B8D0': hasHol?'#FFF8EC': weekend?'#F4F6F9':'transparent',
                  color: today?'white': hasHol?'#C8A96E': weekend?'#CBD5E0':'#1A202C',
                  cursor: hasHol?'help':'default', position:'relative',
                }} title={holiday?.name_en}>
                  {d}
                  {hasHol && <div style={{width:4,height:4,borderRadius:'50%',background:'#C8A96E',margin:'2px auto 0'}} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{display:'flex',gap:16,marginBottom:14,flexWrap:'wrap'}}>
          {[{color:'#17B8D0',label:'Today'},{color:'#C8A96E',label:'Holiday'},{color:'#F4F6F9',label:'Weekend (Fri-Sat)',text:'#CBD5E0'}].map((l,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#718096'}}>
              <div style={{width:12,height:12,borderRadius:3,background:l.color}} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Upcoming Holidays */}
        {upcomingHols.length > 0 && (
          <>
            <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Upcoming Holidays</div>
            {upcomingHols.slice(0,5).map((h:any)=>(
              <div key={h.id} style={{background:'white',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:6,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <div style={{width:38,height:38,borderRadius:10,background:'#FFF8EC',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="ti ti-calendar-event" style={{color:'#C8A96E',fontSize:18}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{h.name_en}</div>
                  <div style={{fontSize:11,color:'#718096',marginTop:2}}>{h.name_ar}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12,fontWeight:500,color:'#C8A96E'}}>{formatDayMonth(h.date+'T00:00')}</div>
                  <div style={{fontSize:10,color:'#CBD5E0',textTransform:'capitalize'}}>{h.type}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </PageContent>
    </div>
  )
}
