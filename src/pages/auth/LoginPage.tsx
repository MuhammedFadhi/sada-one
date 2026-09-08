import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { BlurFade } from '@/components/magicui/blur-fade'
import { Meteors } from '@/components/magicui/meteors'
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text'
import toast from 'react-hot-toast'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, loading } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]     = useState<{ email?: string; password?: string; general?: string }>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!email)               e.email    = 'Email is required'
    else if (!email.includes('@')) e.email = 'Enter a valid email'
    if (!password)            e.password = 'Password is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const result = await signIn(email, password)
    if (result.error) { setErrors({ general: result.error }); toast.error(result.error) }
    else              navigate('/')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(170deg, #0A1628 0%, #0D1B2A 50%, #111F35 100%)',
      display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', position: 'relative', overflow: 'hidden',
    }}>
      {/* Meteor background effect */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Meteors number={15} />
      </div>

      {/* Safe area spacer for Dynamic Island / notch */}
      

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 28px', paddingBottom: 'max(40px, calc(20px + env(safe-area-inset-bottom, 0px)))', overflowY: 'auto', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <BlurFade delay={0.1}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40, marginTop: 16 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
              style={{
                width: 100, height: 100, borderRadius: 26,
                background: 'white', overflow: 'hidden', padding: 6,
                boxShadow: '0 8px 40px rgba(0,0,0,.4), 0 0 0 1px rgba(200,169,110,.3)',
                marginBottom: 18,
              }}>
              <img src="/sada-one-logo.jpg" alt="SA'DA ONE"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </motion.div>
            <AnimatedGradientText className="text-2xl">SA'DA ONE</AnimatedGradientText>
            <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 10, letterSpacing: '1.2px', marginTop: 6 }}>
              INTEGRATED EMPLOYEE EXPERIENCE PLATFORM
            </div>
          </div>
        </BlurFade>

        {/* Heading */}
        <BlurFade delay={0.2}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', marginBottom: 28, lineHeight: 1.5 }}>
            Sign in with your SA'DA Group work email.
          </p>
        </BlurFade>

        {/* General error */}
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(226,75,74,.12)', border: '1px solid rgba(226,75,74,.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#E24B4A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
            {errors.general}
          </motion.div>
        )}

        {/* Email */}
        <BlurFade delay={0.25}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 8, letterSpacing: '1px' }}>WORK EMAIL</div>
            <div style={{ position: 'relative' }}>
              <input
                className="input-dark"
                type="email" placeholder="you@sada.sa" value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined, general: undefined })) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ paddingRight: 44, borderColor: errors.email ? '#E24B4A' : undefined }}
              />
              <i className="ti ti-mail" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.25)', fontSize: 18 }} />
            </div>
            {errors.email && <p style={{ fontSize: 11, color: '#E24B4A', marginTop: 5 }}>{errors.email}</p>}
          </div>
        </BlurFade>

        {/* Password */}
        <BlurFade delay={0.3}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 8, letterSpacing: '1px' }}>PASSWORD</div>
            <div style={{ position: 'relative' }}>
              <input
                className="input-dark"
                type={showPass ? 'text' : 'password'} placeholder="Your password" value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined, general: undefined })) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ paddingRight: 44, borderColor: errors.password ? '#E24B4A' : undefined }}
              />
              <button onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <i className={`ti ti-${showPass ? 'eye-off' : 'eye'}`} style={{ color: 'rgba(255,255,255,.25)', fontSize: 18 }} />
              </button>
            </div>
            {errors.password && <p style={{ fontSize: 11, color: '#E24B4A', marginTop: 5 }}>{errors.password}</p>}
          </div>
        </BlurFade>

        <div style={{ textAlign: 'right', marginBottom: 28 }}>
          <button onClick={() => navigate('/auth/forgot')}
            style={{ fontSize: 12, color: '#C8A96E', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Forgot password?
          </button>
        </div>

        {/* Shimmer Sign In button */}
        <BlurFade delay={0.35}>
          {loading ? (
            <div style={{ width: '100%', background: 'rgba(200,169,110,.4)', borderRadius: 14, padding: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'white', fontSize: 15, fontWeight: 700 }}>
              <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Signing in…
            </div>
          ) : (
            <ShimmerButton
              onClick={handleSubmit}
              className="w-full h-[52px] text-base"
              background="linear-gradient(135deg, #C8A96E 0%, #A8894E 100%)"
            >
              Sign In
            </ShimmerButton>
          )}
        </BlurFade>

        <BlurFade delay={0.4}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
            <div style={{ flex: 1, height: .5, background: 'rgba(255,255,255,.07)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>or</span>
            <div style={{ flex: 1, height: .5, background: 'rgba(255,255,255,.07)' }} />
          </div>

          <button onClick={() => toast('Biometric login coming soon', { icon: '🔐' })}
            style={{
              width: '100%', background: 'rgba(255,255,255,.05)',
              color: 'rgba(255,255,255,.5)', border: '1.5px solid rgba(255,255,255,.08)',
              borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <i className="ti ti-fingerprint" style={{ fontSize: 20 }} />
            Sign in with Biometrics
          </button>
        </BlurFade>

        <BlurFade delay={0.45}>
          <div style={{ marginTop: 'auto', paddingTop: 32, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <i className="ti ti-shield-check" style={{ color: 'rgba(200,169,110,.4)', fontSize: 15, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.18)', lineHeight: 1.5, margin: 0 }}>
              Encrypted · Role-based access · Session-only storage. For SA'DA Group employees only.
            </p>
          </div>
        </BlurFade>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
