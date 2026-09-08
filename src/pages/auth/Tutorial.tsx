import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SLIDES = [
  { icon:'home', color:'#17B8D0', title:'Your Dashboard', body:'See your leave balance, attendance status, next salary countdown, and important alerts at a glance.' },
  { icon:'fingerprint', color:'#1D9E75', title:'Attendance', body:'Check in and out with one tap. Geolocation is recorded for verification. View your monthly attendance history.' },
  { icon:'calendar-check', color:'#C8A96E', title:'Leave Requests', body:'Apply for any leave type — annual, sick, emergency, and more. Track approval status in real time.' },
  { icon:'wallet', color:'#7F77DD', title:'Payslips', body:'View and download your monthly payslip. See a full breakdown of earnings and deductions.' },
  { icon:'grid-dots', color:'#E67E22', title:'Services Hub', body:'Request HR documents, apply for loans, manage exit/re-entry permits, and submit help desk tickets.' },
]

export function TutorialPage() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  return (
    <div style={{ minHeight:'100dvh', background:'#0D1B2A', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:16 }}>
        <button onClick={() => navigate('/')} style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:8, padding:'6px 14px', color:'rgba(255,255,255,.5)', fontSize:12, cursor:'pointer' }}>
          Skip
        </button>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <div style={{ width:90, height:90, borderRadius:28, background:slide.color+'22', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28 }}>
          <i className={`ti ti-${slide.icon}`} style={{ fontSize:44, color:slide.color }} />
        </div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'white', marginBottom:12 }}>{slide.title}</h2>
        <p style={{ fontSize:14, color:'rgba(255,255,255,.45)', lineHeight:1.7, maxWidth:280 }}>{slide.body}</p>
      </div>
      {/* Dots */}
      <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:24 }}>
        {SLIDES.map((_,i) => (
          <div key={i} onClick={() => setCurrent(i)} style={{ width: i===current ? 20 : 7, height:7, borderRadius:4, background: i===current ? '#17B8D0' : 'rgba(255,255,255,.2)', cursor:'pointer', transition:'all .3s' }} />
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns: current>0 ? '1fr 2fr' : '1fr', gap:10 }}>
        {current > 0 && (
          <button onClick={() => setCurrent(c => c-1)} style={{ background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.7)', border:'none', borderRadius:12, padding:14, fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            Back
          </button>
        )}
        <button onClick={() => isLast ? navigate('/') : setCurrent(c => c+1)}
          style={{ background:'linear-gradient(135deg,#17B8D0,#0F8A9E)', color:'white', border:'none', borderRadius:12, padding:14, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          {isLast ? 'Get Started →' : 'Next'}
        </button>
      </div>
    </div>
  )
}
