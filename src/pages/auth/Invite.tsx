import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pw, setPw] = useState('')
  const [confirm, setCfm] = useState('')

  useEffect(() => {
    const checkToken = async () => {
      const { data } = await supabase.rpc('validate_invite_token', { p_token: token })
      const row = Array.isArray(data) ? data[0] : null
      setInvite(row ? { employee: row } : null)
      setLoading(false)
    }
    if (token) checkToken()
  }, [token])

  const handleAccept = async () => {
    if (pw.length < 8)  return toast.error('Password must be at least 8 characters')
    if (pw !== confirm) return toast.error('Passwords do not match')
    try {
      const email = invite.employee.work_email
      const { error } = await supabase.auth.signUp({ email, password: pw })
      if (error) throw error
      await supabase.rpc('consume_invite_token', { p_token: token })
      toast.success('Account created! Please sign in.')
      navigate('/auth/login')
    } catch (err: any) { toast.error(err.message) }
  }

  if (loading) return <div style={{ minHeight:'100dvh', background:'#0D1B2A', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ti ti-loader-2" style={{ color:'#17B8D0', fontSize:32, animation:'spin 1s linear infinite' }} /></div>
  if (!invite) return (
    <div style={{ minHeight:'100dvh', background:'#0D1B2A', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:24 }}>
      <div>
        <i className="ti ti-link-off" style={{ fontSize:48, color:'#E24B4A', display:'block', marginBottom:16 }} />
        <p style={{ color:'white', fontSize:16, fontWeight:600, marginBottom:8 }}>Invalid or Expired Link</p>
        <p style={{ color:'rgba(255,255,255,.4)', fontSize:13 }}>This invite link has expired or been used. Contact HR for a new link.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100dvh', background:'#0D1B2A', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto', padding:24 }}>
      <div style={{ flex:1, paddingTop:48 }}>
        <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#1D9E75,#0F7A5A)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
          <i className="ti ti-user-check" style={{ fontSize:26, color:'white' }} />
        </div>
        <h1 style={{ fontSize:24, fontWeight:700, color:'white', marginBottom:6 }}>You're Invited!</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:8 }}>Welcome to SA'DA Group</p>
        <div style={{ background:'rgba(255,255,255,.06)', borderRadius:12, padding:'12px 16px', marginBottom:28 }}>
          <p style={{ fontSize:14, fontWeight:500, color:'white', marginBottom:2 }}>{invite.employee.full_name_en}</p>
          <p style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{invite.employee.job_title_en}</p>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:8, letterSpacing:'.5px' }}>CREATE PASSWORD</div>
          <input className="input-dark" type="password" placeholder="Min. 8 characters" value={pw} onChange={e => setPw(e.target.value)} />
        </div>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:8, letterSpacing:'.5px' }}>CONFIRM PASSWORD</div>
          <input className="input-dark" type="password" placeholder="Repeat password" value={confirm} onChange={e => setCfm(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAccept()} />
        </div>
        <button onClick={handleAccept} style={{ width:'100%', background:'linear-gradient(135deg,#17B8D0,#0F8A9E)', color:'white', border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          Create My Account
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
