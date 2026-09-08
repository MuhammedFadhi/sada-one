// ============================================================
// SA'DA ONE — Complete Your Profile (self-onboarding)
//
// New starters sign in with the temporary credentials HR hands out
// and land here. They set their own sign-in details and enter their
// OWN record end to end — name, documents, and employment details.
//
// Admins can correct anything afterwards from the user's page.
// A few fields stay server-controlled (employee number, employment
// status, company, manager, work schedule) — see migration 038.
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui'

const NAVY = '#0D1B2A', TEAL = '#17B8D0', GOLD = '#C8A96E'
const STEPS = ['Sign-in', 'About you', 'Documents', 'Your role'] as const

// Declared OUTSIDE the component on purpose — see the note in the render body.
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 10,
  border: '1px solid #E2E8F0', fontSize: 14, background: '#fff', fontFamily: 'inherit',
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>
        {label} {hint && <span style={{ color: '#A0AEC0', fontWeight: 400 }}>· {hint}</span>}
      </div>
      {children}
    </div>
  )
}
type StepIdx = 0 | 1 | 2 | 3

export default function CompleteProfilePage() {
  const { user, profile, refreshProfile } = useAuthStore() as any
  const navigate = useNavigate()
  const emp = profile?.employee

  const [step, setStep] = useState<StepIdx>(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [divisions, setDivisions] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  const [sec, setSec] = useState({ email: user?.email ?? '', password: '', confirm: '' })
  const [f, setF] = useState({
    full_name_en: emp?.full_name_en ?? '',
    full_name_ar: emp?.full_name_ar ?? '',
    date_of_birth: emp?.date_of_birth ?? '',
    gender: emp?.gender ?? '',
    nationality: emp?.nationality ?? '',
    mobile: emp?.mobile ?? '',
    iqama_number: emp?.iqama_number ?? '',
    iqama_expiry: emp?.iqama_expiry ?? '',
    passport_number: emp?.passport_number ?? '',
    passport_expiry: emp?.passport_expiry ?? '',
    emergency_contact: emp?.emergency_contact ?? '',
    job_title_en: emp?.job_title_en ?? '',
    job_title_ar: emp?.job_title_ar ?? '',
    division_id: emp?.division_id ?? '',
    department_id: emp?.department_id ?? '',
    join_date: emp?.join_date ?? '',
    contract_type: emp?.contract_type ?? 'permanent',
  })
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    (async () => {
      const [d, dep] = await Promise.all([
        supabase.from('divisions').select('id,name_en').order('name_en'),
        supabase.from('departments').select('id,name_en,division_id').order('name_en'),
      ])
      setDivisions(d.data ?? []); setDepartments(dep.data ?? [])
    })()
  }, [])

  const next = () => {
    setError(null)
    if (step === 0) {
      if (!sec.email.trim()) return setError('Enter the email you want to sign in with.')
      if (sec.password.length < 8) return setError('Password must be at least 8 characters.')
      if (sec.password !== sec.confirm) return setError('The two passwords do not match.')
    }
    if (step === 1) {
      if (!f.full_name_en.trim()) return setError('Your full name in English is required.')
      if (!f.mobile.trim()) return setError('A mobile number is required.')
    }
    setStep((step + 1) as StepIdx)
  }

  const finish = async () => {
    setError(null)
    if (!f.job_title_en.trim()) return setError('Please enter your job title.')
    setSaving(true)
    try {
      const creds: { email?: string; password: string } = { password: sec.password }
      if (sec.email.trim() && sec.email.trim() !== user?.email) creds.email = sec.email.trim()
      const { error: aErr } = await supabase.auth.updateUser(creds)
      if (aErr) throw aErr

      if (profile?.employee_id) {
        const payload: Record<string, any> = { ...f }
        // Arabic fields are NOT NULL in the schema — fall back to the English text
        payload.full_name_ar = f.full_name_ar.trim() || f.full_name_en.trim()
        payload.job_title_ar = f.job_title_ar.trim() || f.job_title_en.trim()
        for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null
        // keep the directory address in step with the new sign-in address
        if (creds.email) payload.work_email = creds.email
        const { error: eErr } = await supabase.from('employees').update(payload).eq('id', profile.employee_id)
        if (eErr) throw eErr
      }

      const { error: pErr } = await supabase.from('user_profiles')
        .update({ profile_completed: true, must_change_password: false })
        .eq('id', profile?.id)
      if (pErr) throw pErr

      await refreshProfile?.()
      navigate('/', { replace: true })
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Please try again.')
      setSaving(false)
    }
  }

  // ── field renderers ──────────────────────────────────────
  // NOTE: `Row` lives at module scope (top of file). Defining a component
  // inside the render body gives it a new identity on every keystroke, so
  // React unmounts and remounts the <input> — which drops focus and closes
  // the phone keyboard after each character. Do not move it back in here.
  const T = (k: string, ph = '', type = 'text', dir?: string) => (
    <input style={inputStyle} type={type} value={(f as any)[k]} placeholder={ph} dir={dir}
      onChange={e => set(k, e.target.value)} />
  )
  const S = (k: string, opts: { v: string; l: string }[], ph = 'Select…') => (
    <select style={inputStyle} value={(f as any)[k]} onChange={e => set(k, e.target.value)}>
      <option value="">{ph}</option>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )

  const deptOptions = departments
    .filter(d => !f.division_id || d.division_id === f.division_id)
    .map(d => ({ v: d.id, l: d.name_en }))

  return (
    <div style={{ minHeight: '100dvh', background: `linear-gradient(160deg, ${NAVY} 0%, #12263F 100%)`, padding: '30px 18px 44px' }}>
      <div style={{ maxWidth: 470, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: GOLD, fontWeight: 700 }}>SA'DA ONE</div>
          <h1 style={{ color: '#fff', fontSize: 21, margin: '8px 0 4px', fontWeight: 700 }}>
            {['Set your sign-in details', 'About you', 'Your documents', 'Your role'][step]}
          </h1>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, margin: 0 }}>
            {[
              'Replace the temporary credentials with your own.',
              'Tell us who you are.',
              'Iqama, passport and an emergency contact.',
              'Your job and when you joined.',
            ][step]}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= step ? TEAL : 'rgba(255,255,255,.18)' }} />
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 18px 40px rgba(0,0,0,.28)' }}>
          {step === 0 && (<>
            <Row label="Sign-in email" hint="this becomes your username">
              <input style={inputStyle} type="email" value={sec.email} placeholder="you@company.com"
                onChange={e => setSec({ ...sec, email: e.target.value })} />
            </Row>
            <Row label="New password" hint="at least 8 characters">
              <input style={inputStyle} type="password" value={sec.password}
                onChange={e => setSec({ ...sec, password: e.target.value })} />
            </Row>
            <Row label="Confirm password">
              <input style={inputStyle} type="password" value={sec.confirm}
                onChange={e => setSec({ ...sec, confirm: e.target.value })} />
            </Row>
          </>)}

          {step === 1 && (<>
            <Row label="Full name (English)">{T('full_name_en', 'As written on your iqama')}</Row>
            <Row label="Full name (Arabic)" hint="optional">{T('full_name_ar', 'الاسم الكامل', 'text', 'rtl')}</Row>
            <Row label="Mobile">{T('mobile', '05XXXXXXXX', 'tel')}</Row>
            <Row label="Date of birth">{T('date_of_birth', '', 'date')}</Row>
            <Row label="Gender">{S('gender', [{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }])}</Row>
            <Row label="Nationality">{T('nationality', 'e.g. Indian, Saudi, Bangladeshi')}</Row>
          </>)}

          {step === 2 && (<>
            <Row label="Iqama / ID number">{T('iqama_number', '2XXXXXXXXX')}</Row>
            <Row label="Iqama expiry">{T('iqama_expiry', '', 'date')}</Row>
            <Row label="Passport number" hint="optional">{T('passport_number')}</Row>
            <Row label="Passport expiry" hint="optional">{T('passport_expiry', '', 'date')}</Row>
            <Row label="Emergency contact" hint="name and phone">{T('emergency_contact', 'e.g. Ahmed — 0551234567')}</Row>
          </>)}

          {step === 3 && (<>
            <Row label="Job title (English)">{T('job_title_en', 'e.g. Technician, Sales Manager')}</Row>
            <Row label="Job title (Arabic)" hint="optional">{T('job_title_ar', '', 'text', 'rtl')}</Row>
            <Row label="Company / division">
              {S('division_id', divisions.map(d => ({ v: d.id, l: d.name_en })), 'Select your company…')}
            </Row>
            <Row label="Department" hint="optional">
              {S('department_id', deptOptions, deptOptions.length ? 'Select…' : 'No departments for this division')}
            </Row>
            <Row label="Joining date">{T('join_date', '', 'date')}</Row>
            <Row label="Contract type">
              {S('contract_type', [
                { v: 'permanent', l: 'Permanent' }, { v: 'fixed_term', l: 'Fixed Term' },
                { v: 'probation', l: 'Probation' }, { v: 'contractor', l: 'Contractor' },
              ], 'Select…')}
            </Row>
          </>)}

          {error && <p style={{ color: '#E24B4A', fontSize: 12.5, margin: '4px 0 12px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {step > 0 && (
              <Button variant="ghost" onClick={() => { setError(null); setStep((step - 1) as StepIdx) }}>Back</Button>
            )}
            {step < 3
              ? <Button variant="primary" fullWidth onClick={next}>Continue</Button>
              : <Button variant="primary" fullWidth loading={saving} onClick={finish}>Finish setup</Button>}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 11, marginTop: 14 }}>
          Anything you're unsure about can be corrected later — by you or by HR.
        </p>
      </div>
    </div>
  )
}
