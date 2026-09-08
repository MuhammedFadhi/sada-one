import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import toast from 'react-hot-toast'

function strength(p: string) {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
}
const STRENGTH_LABELS = ['','Weak','Fair','Good','Strong']
const STRENGTH_COLORS = ['','#E24B4A','#E67E22','#17B8D0','#1D9E75']

export function SetPasswordPage() {
  const navigate = useNavigate()
  const { updatePassword, loading } = useAuthStore()
  const [pw, setPw]     = useState('')
  const [confirm, setCfm] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [showCfm, setShowCfm] = useState(false)
  const s = strength(pw)

  const handleSubmit = async () => {
    if (pw.length < 8)       return toast.error('Password must be at least 8 characters')
    if (pw !== confirm)      return toast.error('Passwords do not match')
    if (s < 3)               return toast.error('Please use a stronger password')
    const result = await updatePassword(pw)
    if (result.error)        toast.error(result.error)
    else { toast.success('Password updated!'); navigate('/welcome') }
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#0D1B2A', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', padding:'0 24px' }}>
      <div style={{ height:'env(safe-area-inset-top)' }} />
      <div style={{ paddingTop:48, flex:1 }}>
        <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#C8A96E,#A8894E)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
          <i className="ti ti-lock-cog" style={{ fontSize:26, color:'white' }} />
        </div>
        <h1 style={{ fontSize:24, fontWeight:700, color:'white', marginBottom:8 }}>Set Your Password</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:36, lineHeight:1.6 }}>
          This is your first sign in. Please create a secure password for your account.
        </p>

        {/* Password field */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:8, letterSpacing:'.5px' }}>NEW PASSWORD</div>
          <div style={{ position:'relative' }}>
            <input className="input-dark" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" value={pw}
              onChange={e => setPw(e.target.value)} style={{ paddingRight:44 }} />
            <button onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer' }}>
              <i className={`ti ti-${showPw ? 'eye-off' : 'eye'}`} style={{ color:'rgba(255,255,255,.3)', fontSize:18 }} />
            </button>
          </div>
          {pw && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i <= s ? STRENGTH_COLORS[s] : 'rgba(255,255,255,.1)', transition:'background .3s' }} />
                ))}
              </div>
              <span style={{ fontSize:11, color: STRENGTH_COLORS[s] }}>{STRENGTH_LABELS[s]}</span>
            </div>
          )}
        </div>

        {/* Confirm field */}
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:8, letterSpacing:'.5px' }}>CONFIRM PASSWORD</div>
          <div style={{ position:'relative' }}>
            <input className="input-dark" type={showCfm ? 'text' : 'password'} placeholder="Repeat password" value={confirm}
              onChange={e => setCfm(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()}
              style={{ paddingRight:44, borderColor: confirm && pw !== confirm ? '#E24B4A' : undefined }} />
            <button onClick={() => setShowCfm(!showCfm)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer' }}>
              <i className={`ti ti-${showCfm ? 'eye-off' : 'eye'}`} style={{ color:'rgba(255,255,255,.3)', fontSize:18 }} />
            </button>
          </div>
          {confirm && pw !== confirm && <p style={{ fontSize:11, color:'#E24B4A', marginTop:5 }}>Passwords do not match</p>}
          {confirm && pw === confirm && <p style={{ fontSize:11, color:'#1D9E75', marginTop:5 }}>✓ Passwords match</p>}
        </div>

        <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'10px 14px', marginBottom:28, marginTop:8 }}>
          {['At least 8 characters','One uppercase letter','One number','One special character'].map((tip,i) => {
            const met = [pw.length>=8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)][i]
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', fontSize:12, color: met ? '#1D9E75' : 'rgba(255,255,255,.35)' }}>
                <i className={`ti ti-${met ? 'circle-check' : 'circle'}`} style={{ fontSize:14 }} />
                {tip}
              </div>
            )
          })}
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width:'100%', background:'linear-gradient(135deg,#17B8D0,#0F8A9E)', color:'white', border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:loading ? .7 : 1 }}>
          {loading ? 'Setting Password...' : 'Set Password & Continue'}
        </button>
      </div>
    </div>
  )
}
