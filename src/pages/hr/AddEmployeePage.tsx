import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateEmployee } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, TopBar, Button } from '@/components/ui'
import { BlurFade } from '@/components/magicui/blur-fade'
import toast from 'react-hot-toast'

const STEPS = ['Personal', 'Employment', 'Documents']

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
  padding: '11px 14px', fontSize: 13, fontFamily: 'inherit',
  outline: 'none', color: '#1A202C', background: 'white',
  transition: 'border-color .15s',
}
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#718096', marginBottom: 6, display: 'block', letterSpacing: '.3px' }

// Hoisted out of AddEmployeePage so they keep a stable identity across renders.
// (Defining these inside the page remounted the <input> on every keystroke,
//  which dropped focus and closed the mobile keyboard.)
function Field({ label, value, onChange, type = 'text', placeholder = '', required = false }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#E24B4A' }}> *</span>}</label>
      <input
        style={inputStyle}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => (e.target.style.borderColor = '#17B8D0')}
        onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
      />
    </div>
  )
}

function Select({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void
  options: any[]; required?: boolean
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#E24B4A' }}> *</span>}</label>
      <select
        style={{ ...inputStyle, cursor: 'pointer' }}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((o: any) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}

export function AddEmployeePage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const createMut = useCreateEmployee()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    full_name_en:     '',
    full_name_ar:     '',
    job_title_en:     '',
    job_title_ar:     '',
    work_email:       '',
    mobile:           '',
    nationality:      'Saudi',
    gender:           'male' as 'male' | 'female',
    date_of_birth:    '',
    join_date:        new Date().toISOString().split('T')[0],
    contract_type:    'permanent' as 'permanent' | 'fixed_term' | 'probation' | 'contractor',
    division_id:      '',
    department_id:    '',
    employee_number:  '',
    iqama_number:     '',
    iqama_expiry:     '',
    passport_number:  '',
    passport_expiry:  '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('id, name_en').eq('is_active', true).order('name_en')
      return data ?? []
    }
  })
  const { data: departments } = useQuery({
    queryKey: ['departments', form.division_id],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name_en').eq('division_id', form.division_id).order('name_en')
      return data ?? []
    },
    enabled: !!form.division_id
  })

  const validateStep = () => {
    if (step === 0) {
      if (!form.full_name_en.trim()) { toast.error('Full name (English) is required'); return false }
      if (!form.work_email.includes('@')) { toast.error('Valid work email is required'); return false }
    }
    if (step === 1) {
      if (!form.employee_number.trim()) { toast.error('Employee number is required'); return false }
      if (!form.join_date) { toast.error('Join date is required'); return false }
      if (!form.job_title_en.trim()) { toast.error('Job title (English) is required'); return false }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    if (!validateStep()) return

    // Build clean payload matching the DB schema exactly
    const company_id = profile?.employee?.company_id
    if (!company_id) { toast.error('Cannot determine company. Please re-login.'); return }

    const payload: Record<string, any> = {
      company_id,
      employee_number: form.employee_number.trim(),
      full_name_en:    form.full_name_en.trim(),
      full_name_ar:    form.full_name_ar.trim() || form.full_name_en.trim(),
      job_title_en:    form.job_title_en.trim(),
      job_title_ar:    form.job_title_ar.trim() || form.job_title_en.trim(),
      work_email:      form.work_email.trim().toLowerCase(),
      nationality:     form.nationality,
      gender:          form.gender,
      join_date:       form.join_date,
      contract_type:   form.contract_type,
      status:          'active',
    }

    // Optional fields — only include if filled
    if (form.mobile)           payload.mobile           = form.mobile.trim()
    if (form.date_of_birth)    payload.date_of_birth    = form.date_of_birth
    if (form.division_id)      payload.division_id      = form.division_id
    if (form.department_id)    payload.department_id    = form.department_id
    if (form.iqama_number)     payload.iqama_number     = form.iqama_number.trim()
    if (form.iqama_expiry)     payload.iqama_expiry     = form.iqama_expiry
    if (form.passport_number)  payload.passport_number  = form.passport_number.trim()
    if (form.passport_expiry)  payload.passport_expiry  = form.passport_expiry

    try {
      await createMut.mutateAsync(payload as any)
      toast.success('Employee created successfully!')
      navigate(profile?.role === 'admin' ? '/admin' : '/hr/employees')
    } catch (e: any) {
      // Parse Supabase error message for user-friendly feedback
      const msg = e?.message ?? ''
      if (msg.includes('duplicate') && msg.includes('work_email'))
        toast.error('This email is already used by another employee')
      else if (msg.includes('duplicate') && msg.includes('employee_number'))
        toast.error('This employee number already exists')
      else
        toast.error(msg || 'Failed to create employee')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F4F6F9' }}>
      {/* Header */}
      <div style={{ background: '#0D1B2A', flexShrink: 0 }}>
        <StatusBar />
        <TopBar title="Add New Employee" onBack={() => navigate(-1)} />

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{
                height: 3, borderRadius: 2, marginBottom: 5,
                background: i <= step ? '#C8A96E' : 'rgba(255,255,255,.15)',
                transition: 'background .3s',
              }} />
              <div style={{ fontSize: 9, fontWeight: 600, textAlign: 'center', color: i <= step ? '#C8A96E' : 'rgba(255,255,255,.3)', letterSpacing: '.5px' }}>
                {s.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* STEP 0: Personal */}
            {step === 0 && (
              <div>
                <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', marginBottom: 14 }}>Personal Information</div>
                  <Field label="Full Name (English)" value={form.full_name_en} onChange={v => set("full_name_en", v)} placeholder="e.g. Mohammed Al-Otaibi" required />
                  <Field label="Full Name (Arabic)" value={form.full_name_ar} onChange={v => set("full_name_ar", v)} placeholder="محمد العتيبي" />
                  <Field label="Work Email" value={form.work_email} onChange={v => set("work_email", v)} type="email" placeholder="name@company.com" required />
                  <Field label="Mobile" value={form.mobile} onChange={v => set("mobile", v)} placeholder="+966 50 123 4567" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Select label="Nationality" value={form.nationality} onChange={v => set("nationality", v)} options={['Saudi','Indian','Filipino','Egyptian','Pakistani','Bangladeshi','Sri Lankan','Yemeni','Sudanese','Other']} />
                    <Select label="Gender" value={form.gender} onChange={v => set("gender", v)} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} required />
                  </div>
                  <Field label="Date of Birth" value={form.date_of_birth} onChange={v => set("date_of_birth", v)} type="date" />
                </div>
              </div>
            )}

            {/* STEP 1: Employment */}
            {step === 1 && (
              <div>
                <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', marginBottom: 14 }}>Employment Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Employee Number" value={form.employee_number} onChange={v => set("employee_number", v)} placeholder="EMP-0021" required />
                    <Field label="Join Date" value={form.join_date} onChange={v => set("join_date", v)} type="date" required />
                  </div>
                  <Field label="Job Title (English)" value={form.job_title_en} onChange={v => set("job_title_en", v)} placeholder="e.g. Senior Developer" required />
                  <Field label="Job Title (Arabic)" value={form.job_title_ar} onChange={v => set("job_title_ar", v)} placeholder="مطور أول" />
                  <Select label="Contract Type" value={form.contract_type} onChange={v => set("contract_type", v)} required options={[
                    { value: 'permanent', label: 'Permanent' },
                    { value: 'fixed_term', label: 'Fixed Term' },
                    { value: 'probation', label: 'Probation' },
                    { value: 'contractor', label: 'Contractor' },
                  ]} />
                  <Select label="Division" value={form.division_id} onChange={v => set("division_id", v)} options={divisions?.map((d: any) => ({ value: d.id, label: d.name_en })) ?? []} />
                  {form.division_id && (
                    <Select label="Department" value={form.department_id} onChange={v => set("department_id", v)} options={departments?.map((d: any) => ({ value: d.id, label: d.name_en })) ?? []} />
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Documents */}
            {step === 2 && (
              <div>
                <div style={{ background: '#FFF8EC', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#C8A96E', lineHeight: 1.6, display: 'flex', gap: 8 }}>
                  <i className="ti ti-info-circle" style={{ flexShrink: 0, marginTop: 1 }} />
                  Document details can be added or updated later from the employee file. These fields are optional.
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', marginBottom: 14 }}>Identity Documents</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Iqama / National ID" value={form.iqama_number} onChange={v => set("iqama_number", v)} placeholder="1234567890" />
                    <Field label="Iqama Expiry" value={form.iqama_expiry} onChange={v => set("iqama_expiry", v)} type="date" />
                    <Field label="Passport Number" value={form.passport_number} onChange={v => set("passport_number", v)} placeholder="A12345678" />
                    <Field label="Passport Expiry" value={form.passport_expiry} onChange={v => set("passport_expiry", v)} type="date" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom buttons */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 50,
        background: 'white', borderTop: '0.5px solid #E2E8F0',
        padding: '12px 16px',
        paddingBottom: 'max(12px, calc(8px + env(safe-area-inset-bottom, 0px)))',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: step > 0 ? '1fr 2fr' : '1fr', gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ background: '#F4F6F9', color: '#718096', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Back
            </button>
          )}
          <Button
            fullWidth
            loading={createMut.isPending}
            onClick={step < 2 ? handleNext : handleSubmit}
            style={{
              background: step < 2 ? 'linear-gradient(135deg, #17B8D0, #0F8A9E)' : 'linear-gradient(135deg, #1D9E75, #147A5A)',
              boxShadow: '0 4px 12px rgba(23,184,208,.3)',
            }}>
            {createMut.isPending ? 'Creating…' : step < 2 ? 'Next →' : '✓ Create Employee'}
          </Button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
