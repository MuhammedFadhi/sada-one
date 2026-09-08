import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useAttendance, useCheckIn, useCheckOut, usePunch, useWorkSites } from '@/hooks/useData'
import { getGeoFix, checkGeofence } from '@/lib/geo'
import { StatusBar, PageContent, StatStrip, EmptyState, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDayName, formatDayNameLong } from '@/lib/dates'

const STATUS_COLORS: Record<string,string> = {
  present:'#1D9E75', late:'#E67E22', absent:'#E24B4A',
  on_leave:'#7F77DD', holiday:'#17B8D0', remote:'#C8A96E', half_day:'#E67E22'
}

function getGeo(): Promise<{ lat?: number; lng?: number }> {
  return new Promise(res => {
    if (!navigator.geolocation) return res({})
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({}), { timeout: 4000 }
    )
  })
}

export function AttendancePage() {
  const { profile } = useAuthStore()
  const empId = profile?.employee_id ?? ''
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const { data: logs, isLoading } = useAttendance(empId, month)
  const checkInMut  = useCheckIn()
  const checkOutMut = useCheckOut()
  const punchMut    = usePunch()
  const { data: sites } = useWorkSites()

  const geoErr = (e: any): string => {
    const m = `${e?.message ?? ''} ${e?.details ?? ''}`
    if (m.includes('OUTSIDE_GEOFENCE')) return 'You are outside the allowed work site area.'
    if (m.includes('GEO_REQUIRED'))     return 'Location is required to check in. Enable GPS and retry.'
    return 'Check-in failed'
  }

  const todayStr = now.toISOString().split('T')[0]
  const today = logs?.find(l => l.date === todayStr)
  const present = logs?.filter(l => l.status==='present'||l.status==='late').length ?? 0
  const absent  = logs?.filter(l => l.status==='absent').length ?? 0
  const late    = logs?.filter(l => l.status==='late').length ?? 0
  const totalHours = logs?.reduce((a,l) => a+(l.hours_worked??0), 0).toFixed(1) ?? '0'

  const handleIn = async () => {
    const fix = await getGeoFix()
    const active = (sites ?? []).filter(s => s.is_active)
    if (active.length) {
      if (fix.lat == null) { toast.error('Turn on location to check in at a work site.'); return }
      const res = checkGeofence(fix, sites ?? [])
      if (!res.ok) {
        toast.error(res.reason === 'no_fix'
          ? 'Could not get your location. Try again outdoors.'
          : `You're ${res.distance}m away${res.site ? ` from ${res.site.name}` : ''} — must be within ${res.site?.radius_m ?? 0}m.`)
        return
      }
    }
    try { await checkInMut.mutateAsync({ lat: fix.lat, lng: fix.lng }); toast.success('Checked in!') }
    catch (e) { toast.error(geoErr(e)) }
  }
  const handleOut = async () => {
    try { await checkOutMut.mutateAsync(); toast.success('Checked out!') }
    catch { toast.error('Check-out failed') }
  }
  const punch = async (type: 'break_in'|'break_out'|'overtime_in'|'overtime_out', label: string) => {
    const { lat, lng } = await getGeo()
    try { await punchMut.mutateAsync({ type, lat, lng }); toast.success(label) }
    catch { toast.error('Failed to record') }
  }

  const fmt = (ts?: string) => ts ? new Date(ts).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}) : '—'
  const punchBtn = (c: string): React.CSSProperties => ({ background: c+'22', color: c==='#E67E22'?'#FFD9A8':'#D6D2FF', border:`1px solid ${c}55`, borderRadius:9, padding:'9px 0', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:5 })
  const punchDone: React.CSSProperties = { background:'rgba(29,158,117,.12)', color:'#1D9E75', borderRadius:9, padding:'9px 0', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center' }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Header */}
      <div style={{background:'#0D1B2A',padding:'0 0 16px'}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Attendance</h1>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'5px 10px',color:'white',fontSize:12,outline:'none',fontFamily:'inherit'}} />
        </div>
      </div>

      <PageContent>
        <StatStrip stats={[
          {label:'Present', value:present, color:'#1D9E75'},
          {label:'Absent',  value:absent,  color:'#E24B4A'},
          {label:'Late',    value:late,    color:'#E67E22'},
          {label:'Hrs',     value:totalHours, color:'#17B8D0'},
        ]} />

        {/* Today card */}
        <div style={{background:'#17294A',borderRadius:14,padding:14,marginBottom:14}}>
          <p style={{color:'rgba(255,255,255,.5)',fontSize:11,marginBottom:6}}>
            TODAY — {formatDayNameLong(now)}
          </p>
          <div style={{display:'flex',gap:16,marginBottom:12}}>
            {[{label:'Check In',val:fmt(today?.check_in)},{label:'Check Out',val:fmt(today?.check_out)},{label:'Hours',val:today?.hours_worked?`${today.hours_worked}h`:'—'}].map((x,i)=>(
              <div key={i}>
                <div style={{color:'rgba(255,255,255,.45)',fontSize:10}}>{x.label}</div>
                <div style={{color:'white',fontSize:16,fontWeight:700}}>{x.val}</div>
              </div>
            ))}
          </div>
          {!today?.check_in && (
            <button onClick={handleIn} disabled={checkInMut.isPending}
              style={{width:'100%',background:'#1D9E75',color:'white',border:'none',borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <i className="ti ti-fingerprint" /> {checkInMut.isPending?'Checking in…':'Check In Now'}
            </button>
          )}
          {today?.check_in && !today?.check_out && (
            <button onClick={handleOut} disabled={checkOutMut.isPending}
              style={{width:'100%',background:'#C8A96E',color:'white',border:'none',borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <i className="ti ti-logout" /> {checkOutMut.isPending?'Checking out…':'Check Out'}
            </button>
          )}
          {today?.check_in && today?.check_out && (
            <div style={{textAlign:'center',color:'#1D9E75',fontSize:13,fontWeight:500}}>✓ Attendance recorded for today</div>
          )}

          {/* Break & Overtime punches (available once checked in) */}
          {today?.check_in && (
            <div style={{marginTop:12,paddingTop:12,borderTop:'0.5px solid rgba(255,255,255,.1)'}}>
              <div style={{display:'flex',gap:14,marginBottom:10}}>
                <div><div style={{color:'rgba(255,255,255,.4)',fontSize:9}}>BREAK</div><div style={{color:'white',fontSize:12,fontWeight:600}}>{fmt(today?.break_in)} → {fmt(today?.break_out)}</div></div>
                <div><div style={{color:'rgba(255,255,255,.4)',fontSize:9}}>OVERTIME</div><div style={{color:'white',fontSize:12,fontWeight:600}}>{fmt(today?.overtime_in)} → {fmt(today?.overtime_out)}</div>{today?.overtime_hours ? <div style={{color:'#C8A96E',fontSize:9}}>{today.overtime_hours}h OT</div> : null}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {!today?.break_in
                  ? <button onClick={()=>punch('break_in','Break started')} disabled={punchMut.isPending} style={punchBtn('#E67E22')}><i className="ti ti-coffee" /> Start Break</button>
                  : !today?.break_out
                    ? <button onClick={()=>punch('break_out','Break ended')} disabled={punchMut.isPending} style={punchBtn('#E67E22')}><i className="ti ti-coffee-off" /> End Break</button>
                    : <div style={punchDone}>✓ Break done</div>}
                {!today?.overtime_in
                  ? <button onClick={()=>punch('overtime_in','Overtime started')} disabled={punchMut.isPending} style={punchBtn('#7F77DD')}><i className="ti ti-clock-bolt" /> Start OT</button>
                  : !today?.overtime_out
                    ? <button onClick={()=>punch('overtime_out','Overtime ended')} disabled={punchMut.isPending} style={punchBtn('#7F77DD')}><i className="ti ti-clock-check" /> End OT</button>
                    : <div style={punchDone}>✓ OT done</div>}
              </div>
            </div>
          )}
        </div>

        {/* Log */}
        <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Log for {month}</div>
        {isLoading && <SkeletonList />}
        {!isLoading && !logs?.length && <EmptyState icon="calendar-off" title="No records" subtitle="No attendance logged for this month." />}
        {logs?.map(log => (
          <div key={log.id} style={{background:'white',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',marginBottom:6,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:STATUS_COLORS[log.status]??'#CBD5E0',marginRight:12,flexShrink:0}} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>{formatDayName(log.date+'T00:00:00')}</div>
              <div style={{fontSize:11,color:'#718096'}}>{fmt(log.check_in)} → {fmt(log.check_out)}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <span className="badge" style={{background:(STATUS_COLORS[log.status]??'#CBD5E0')+'22',color:STATUS_COLORS[log.status]??'#718096',fontSize:10}}>
                {log.status.replace('_',' ')}
              </span>
              {log.hours_worked && <div style={{fontSize:10,color:'#718096',marginTop:3}}>{log.hours_worked}h</div>}
            </div>
          </div>
        ))}
      </PageContent>
    </div>
  )
}
