import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { statusLabel, roleLabel, contractTypeLabel } from '@/lib/labels'
import { usePrivacySettings } from '@/hooks/useData'
import { Toggle } from '@/components/ui'
import { StatusBar, PageContent, Avatar, InfoCard, BottomSheet, Button, formatDate } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/lib/dates'

export function ProfilePage() {
  const { profile, signOut, updatePassword, refreshProfile } = useAuthStore()
  const navigate = useNavigate()
  const emp = profile?.employee
  const [showPwForm, setShowPwForm] = useState(false)
  const [pw, setPw]       = useState('')
  const [confirm, setCfm] = useState('')
  const [loading, setLoading] = useState(false)
  const privacy = usePrivacySettings()

  // ── Change sign-in email (username) ──
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [emailBusy, setEmailBusy] = useState(false)
  const handleEmailChange = async () => {
    setEmailMsg(null)
    const v = newEmail.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setEmailMsg({ ok: false, text: 'Enter a valid email address.' }); return }
    setEmailBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: v })
      if (error) throw error
      setEmailMsg({ ok: true, text: 'Check your inbox — confirm the link to finish the change.' })
      setNewEmail('')
    } catch (e: any) {
      setEmailMsg({ ok: false, text: e?.message ?? 'Could not update email.' })
    } finally { setEmailBusy(false) }
  }

  // ── Edit profile ──
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name_en:'', full_name_ar:'', nationality:'', mobile:'', date_of_birth:'', language_pref:'en' })
  const openEdit = () => {
    setForm({
      full_name_en: emp?.full_name_en ?? '', full_name_ar: emp?.full_name_ar ?? '',
      nationality: emp?.nationality ?? '', mobile: emp?.mobile ?? '',
      date_of_birth: emp?.date_of_birth ?? '', language_pref: profile?.language_pref ?? 'en',
    })
    setEditOpen(true)
  }
  const saveProfile = async () => {
    if (!form.full_name_en.trim()) return toast.error('Name (English) is required')
    setSaving(true)
    try {
      const { error: e1 } = await supabase.from('employees').update({
        full_name_en: form.full_name_en.trim(),
        full_name_ar: form.full_name_ar.trim() || null,
        nationality: form.nationality.trim() || null,
        mobile: form.mobile.trim() || null,
        date_of_birth: form.date_of_birth || null,
      }).eq('id', emp?.id)
      if (e1) throw e1
      if (form.language_pref !== profile?.language_pref) {
        const { error: e2 } = await supabase.from('user_profiles').update({ language_pref: form.language_pref }).eq('id', profile?.id)
        if (e2) throw e2
      }
      await refreshProfile()
      toast.success('Profile updated')
      setEditOpen(false)
    } catch (e:any) { toast.error(e.message ?? 'Failed to update profile') }
    finally { setSaving(false) }
  }

  const handleSignOut = async () => { await signOut(); navigate('/auth/login') }

  const handlePwChange = async () => {
    if (pw.length < 8)  return toast.error('Minimum 8 characters')
    if (pw !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    const result = await updatePassword(pw)
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Password updated!'); setShowPwForm(false); setPw(''); setCfm('') }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:20}}>
        <StatusBar />
        <div style={{padding:'4px 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>My Profile</h1>
          <button onClick={openEdit} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:8,padding:'7px 12px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-pencil" /> Edit
          </button>
        </div>
        <div style={{padding:'0 16px',display:'flex',alignItems:'center',gap:14}}>
          <Avatar name={emp?.full_name_en??'?'} size={56} />
          <div>
            <div style={{color:'white',fontSize:16,fontWeight:600}}>{emp?.full_name_en}</div>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:12,marginTop:2}}>{emp?.job_title_en}</div>
            <div style={{color:'#C8A96E',fontSize:11,marginTop:3}}>{emp?.division?.name_en} · {emp?.employee_number}</div>
          </div>
        </div>
      </div>
      <PageContent>
        <InfoCard title="Personal Information" rows={[
          {label:'Full Name (EN)',  value:emp?.full_name_en??'—'},
          {label:'Full Name (AR)',  value:emp?.full_name_ar??'—'},
          {label:'Nationality',    value:emp?.nationality??'—'},
          {label:'Date of Birth',  value:emp?.date_of_birth?formatDate(emp.date_of_birth):'—'},
          {label:'Work Email',     value:emp?.work_email??'—'},
          {label:'Mobile',         value:emp?.mobile??'—'},
        ]} />
        <InfoCard title="Employment" rows={[
          {label:'Employee #',     value:emp?.employee_number??'—'},
          {label:'Join Date',      value:emp?.join_date?formatDate(emp.join_date):'—'},
          {label:'Contract Type',  value:contractTypeLabel(emp?.contract_type)},
          {label:'Division',       value:emp?.division?.name_en??'—'},
          {label:'Status',         value:<span className={`badge badge-${emp?.status==='active'?'success':'warning'}`}>{statusLabel(emp?.status)}</span>},
        ]} />
        <InfoCard title="Account" rows={[
          {label:'Role',           value:<span className="badge badge-info">{roleLabel(profile?.role)}</span>},
          {label:'Last Login',     value:profile?.last_login_at?formatDateTime(profile.last_login_at):'—'},
        ]} />

        {/* Change Password */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <button onClick={()=>setShowPwForm(!showPwForm)}
            style={{width:'100%',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',fontFamily:'inherit'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <i className="ti ti-lock" style={{color:'#718096',fontSize:18}} />
              <span style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>Change Password</span>
            </div>
            <i className={`ti ti-chevron-${showPwForm?'up':'down'}`} style={{color:'#CBD5E0',fontSize:16}} />
          </button>
          {showPwForm && (
            <div style={{marginTop:12,paddingTop:12,borderTop:'0.5px solid #F0F0F0'}}>
              <div className="form-label">New Password</div>
              <input className="input" type="password" placeholder="Min. 8 characters" value={pw} onChange={e=>setPw(e.target.value)} style={{marginBottom:10}} />
              <div className="form-label">Confirm Password</div>
              <input className="input" type="password" placeholder="Repeat password" value={confirm} onChange={e=>setCfm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handlePwChange()} style={{marginBottom:12}} />
              <button onClick={handlePwChange} disabled={loading}
                style={{width:'100%',background:'#17B8D0',color:'white',border:'none',borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:loading?.7:1}}>
                {loading?'Saving…':'Update Password'}
              </button>
            </div>
          )}
        </div>

        {/* Privacy */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#718096',letterSpacing:'.5px',marginBottom:10}}>PRIVACY</div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>Read receipts</div>
              <div style={{fontSize:11,color:'#718096',marginTop:2,lineHeight:1.45}}>
                Show blue ticks when you have read a message. Turn this off and others won't see when you've read theirs.
              </div>
            </div>
            <Toggle on={privacy.readReceipts}
              onChange={v => privacy.update.mutate({ read_receipts_enabled: v })} />
          </div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,paddingTop:12,borderTop:'0.5px solid #F0F0F0'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>Online status</div>
              <div style={{fontSize:11,color:'#718096',marginTop:2,lineHeight:1.45}}>
                Let colleagues see when you're online. HR and Finance can always see this for work records.
              </div>
            </div>
            <Toggle on={privacy.showOnline}
              onChange={v => privacy.update.mutate({ show_online_status: v })} />
          </div>
        </div>

        {/* Change sign-in email (username) */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <button onClick={()=>setShowEmailForm(!showEmailForm)}
            style={{width:'100%',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',fontFamily:'inherit'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <i className="ti ti-at" style={{color:'#718096',fontSize:18}} />
              <span style={{fontSize:13,fontWeight:500,color:'#1A202C'}}>Change Sign-in Email</span>
            </div>
            <i className={`ti ti-chevron-${showEmailForm?'up':'down'}`} style={{color:'#CBD5E0',fontSize:16}} />
          </button>
          {showEmailForm && (
            <div style={{marginTop:12,paddingTop:12,borderTop:'0.5px solid #F0F0F0'}}>
              <div className="form-label">New Email</div>
              <input className="input" type="email" placeholder="you@company.com" value={newEmail}
                onChange={e=>setNewEmail(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleEmailChange()} style={{marginBottom:12}} />
              {emailMsg && (
                <p style={{fontSize:11,marginBottom:10,color:emailMsg.ok?'#1D9E75':'#E24B4A'}}>{emailMsg.text}</p>
              )}
              <button onClick={handleEmailChange} disabled={emailBusy}
                style={{width:'100%',background:'#17B8D0',color:'white',border:'none',borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:emailBusy?.7:1}}>
                {emailBusy?'Sending…':'Update Email'}
              </button>
            </div>
          )}
        </div>

        <button onClick={handleSignOut}
          style={{width:'100%',background:'#FFF0F0',color:'#E24B4A',border:'1px solid #E24B4A',borderRadius:12,padding:13,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>
          <i className="ti ti-logout" /> Sign Out
        </button>
        <p style={{textAlign:'center',fontSize:10,color:'#CBD5E0',paddingBottom:8}}>SA'DA ONE v1.0 · Powered by A360</p>
      </PageContent>

      <BottomSheet open={editOpen} onClose={()=>setEditOpen(false)} title="Edit Profile">
        <div style={{maxHeight:'60vh',overflowY:'auto'}}>
          <div className="form-label">Full Name (English)</div>
          <input className="input" value={form.full_name_en} onChange={e=>setForm(f=>({...f,full_name_en:e.target.value}))} style={{marginBottom:10}} />
          <div className="form-label">Full Name (Arabic)</div>
          <input className="input" value={form.full_name_ar} onChange={e=>setForm(f=>({...f,full_name_ar:e.target.value}))} dir="rtl" style={{marginBottom:10}} />
          <div className="form-label">Nationality</div>
          <input className="input" value={form.nationality} onChange={e=>setForm(f=>({...f,nationality:e.target.value}))} style={{marginBottom:10}} />
          <div className="form-label">Mobile</div>
          <input className="input" type="tel" value={form.mobile} onChange={e=>setForm(f=>({...f,mobile:e.target.value}))} placeholder="+966 50 123 4567" style={{marginBottom:10}} />
          <div className="form-label">Date of Birth</div>
          <input className="input" type="date" value={form.date_of_birth} onChange={e=>setForm(f=>({...f,date_of_birth:e.target.value}))} style={{marginBottom:10}} />
          <Button variant="primary" fullWidth loading={saving} onClick={saveProfile}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <p style={{fontSize:10,color:'#A0AEC0',textAlign:'center',marginTop:10}}>Work email, employee number, role and division are managed by HR.</p>
        </div>
      </BottomSheet>
    </div>
  )
}
