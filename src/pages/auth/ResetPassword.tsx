// ============================================================
// SA'DA ONE — Reset Password Page
// Catches Supabase password reset tokens from URL hash
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [pw, setPw]         = useState('')
  const [confirm, setCfm]   = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase puts the token in the URL hash as access_token
    // onAuthStateChange fires with RECOVERY event when reset link is clicked
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
      if (event === 'SIGNED_IN' && session) {
        setSessionReady(true)
      }
    })

    // Also check if we already have a session from the magic link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    // PKCE flow: Supabase may return ?code=... instead of a hash token
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => { if (!error) setSessionReady(true); else setError(error.message) })
    }
    // Expired / invalid link lands with error params in the hash
    const hash = new URLSearchParams(window.location.hash.slice(1))
    if (hash.get('error_description')) setError(hash.get('error_description')!.replace(/\+/g, ' '))

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    if (pw.length < 8)  return setError('Password must be at least 8 characters')
    if (pw !== confirm) return setError('Passwords do not match')
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password: pw })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Mark profile as not needing password change
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_profiles')
        .update({ must_change_password: false })
        .eq('id', user.id)
    }

    toast.success('Password updated successfully!')
    setLoading(false)
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(170deg, #0A1628 0%, #0D1B2A 60%, #111F35 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      maxWidth: 480, margin: '0 auto', padding: '32px 28px',
    }}>
      {/* Logo */}
      <div style={{ width: 80, height: 80, borderRadius: 22, background: 'white', overflow: 'hidden', padding: 5, boxShadow: '0 8px 32px rgba(0,0,0,.4)', marginBottom: 20 }}>
        <img src="/sada-one-logo.jpg" alt="SA'DA ONE" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
        SA<span style={{ color: '#C8A96E' }}>'</span>DA ONE
      </div>
      <div style={{ color: 'rgba(255,255,255,.25)', fontSize: 10, letterSpacing: '1px', marginBottom: 32 }}>
        SET YOUR PASSWORD
      </div>

      {!sessionReady ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, marginBottom: 16 }}>
            Waiting for authentication...
          </div>
          <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 12, lineHeight: 1.6 }}>
            If you came from a reset email, the link should activate automatically.<br />
            If nothing happens, go back and try the magic link option.
          </div>
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          <div style={{ color: 'white', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Set your password</div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
            Choose a secure password for your SA'DA ONE account.
          </div>

          {error && (
            <div style={{ background: 'rgba(226,75,74,.12)', border: '1px solid rgba(226,75,74,.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#E24B4A' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 8, letterSpacing: '1px' }}>NEW PASSWORD</div>
            <div style={{ position: 'relative' }}>
              <input className="input-dark" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                value={pw} onChange={e => setPw(e.target.value)} style={{ paddingRight: 44 }} />
              <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <i className={`ti ti-${showPw ? 'eye-off' : 'eye'}`} style={{ color: 'rgba(255,255,255,.3)', fontSize: 18 }} />
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 8, letterSpacing: '1px' }}>CONFIRM PASSWORD</div>
            <input className="input-dark" type="password" placeholder="Repeat password"
              value={confirm} onChange={e => setCfm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ borderColor: confirm && pw !== confirm ? '#E24B4A' : undefined }} />
            {confirm && pw === confirm && <p style={{ fontSize: 11, color: '#1D9E75', marginTop: 5 }}>✓ Passwords match</p>}
          </div>

          <button onClick={handleSubmit} disabled={loading || pw.length < 8}
            style={{
              width: '100%',
              background: loading || pw.length < 8 ? 'rgba(200,169,110,.4)' : 'linear-gradient(135deg, #C8A96E, #A8894E)',
              color: 'white', border: 'none', borderRadius: 14, padding: 15,
              fontSize: 15, fontWeight: 700, cursor: loading || pw.length < 8 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', boxShadow: pw.length >= 8 ? '0 8px 24px rgba(200,169,110,.25)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Set Password & Sign In'}
          </button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
