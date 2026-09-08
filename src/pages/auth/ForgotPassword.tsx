import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import toast from 'react-hot-toast'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { sendPasswordReset } = useAuthStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!email.includes('@')) return toast.error('Enter a valid email')
    setLoading(true)
    const result = await sendPasswordReset(email)
    setLoading(false)
    if (result.error) toast.error(result.error)
    else setSent(true)
  }

  if (sent) return (
    <div style={{ minHeight:'100dvh', background:'#0D1B2A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', maxWidth:480, margin:'0 auto', padding:32, textAlign:'center' }}>
      <div style={{ width:64, height:64, borderRadius:20, background:'rgba(29,158,117,.15)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
        <i className="ti ti-mail-check" style={{ fontSize:32, color:'#1D9E75' }} />
      </div>
      <h1 style={{ fontSize:22, fontWeight:700, color:'white', marginBottom:8 }}>Check Your Email</h1>
      <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', lineHeight:1.7, marginBottom:32 }}>
        We sent a password reset link to <span style={{ color:'rgba(255,255,255,.7)' }}>{email}</span>.<br />
        Check your inbox and click the link to reset your password.
      </p>
      <button onClick={() => navigate('/auth/login')} style={{ width:'100%', background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.8)', border:'none', borderRadius:12, padding:14, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
        Back to Sign In
      </button>
    </div>
  )

  return (
    <div style={{ minHeight:'100dvh', background:'#0D1B2A', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', padding:24 }}>
      <div style={{ height:'env(safe-area-inset-top)' }} />
      <button onClick={() => navigate('/auth/login')} style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:10, padding:'8px 14px', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer', marginTop:16, marginBottom:36, display:'flex', alignItems:'center', gap:6, width:'fit-content' }}>
        <i className="ti ti-arrow-left" /> Back
      </button>
      <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#7F77DD,#5A52C8)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
        <i className="ti ti-lock-open" style={{ fontSize:26, color:'white' }} />
      </div>
      <h1 style={{ fontSize:24, fontWeight:700, color:'white', marginBottom:8 }}>Reset Password</h1>
      <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:32, lineHeight:1.6 }}>Enter your work email and we'll send you a link to reset your password.</p>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:8, letterSpacing:'.5px' }}>WORK EMAIL</div>
        <input className="input-dark" type="email" placeholder="you@sada.sa" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSend()} />
      </div>
      <button onClick={handleSend} disabled={loading}
        style={{ width:'100%', background:'linear-gradient(135deg,#17B8D0,#0F8A9E)', color:'white', border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:loading?.7:1 }}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
    </div>
  )
}
