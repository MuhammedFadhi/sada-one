// ============================================================
// SA'DA ONE — Edge Function: admin-create-user
// Admin-only. Creates an employee record + auth login (with a
// CHOSEN password) + user_profiles row (with role). Verifies caller is admin.
// Requires SERVICE_ROLE_KEY secret.
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // authorize caller = admin
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) return json({ error: 'Missing authorization' }, 401)
    const { data: caller, error: cErr } = await admin.auth.getUser(token)
    if (cErr || !caller.user) return json({ error: 'Invalid session' }, 401)
    const { data: cp } = await admin.from('user_profiles').select('role').eq('id', caller.user.id).single()
    if (cp?.role !== 'admin') return json({ error: 'Admin access required' }, 403)

    // input
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const role = String(body.role ?? 'employee')
    const fullEn = String(body.full_name_en ?? '').trim() || email.split('@')[0]
    const fullAr = String(body.full_name_ar ?? '').trim() || fullEn
    const titleEn = String(body.job_title_en ?? '').trim() || (role === 'admin' ? 'Administrator' : 'Employee')
    const titleAr = String(body.job_title_ar ?? '').trim() || (role === 'admin' ? 'مدير النظام' : 'موظف')
    if (!email || !password) return json({ error: 'email and password are required' }, 400)
    if (password.length < 6) return json({ error: 'password must be at least 6 characters' }, 400)
    if (!['admin', 'hr_officer', 'finance', 'manager', 'employee'].includes(role))
      return json({ error: 'invalid role' }, 400)

    // reject duplicate email (employee or auth)
    const { data: dupEmp } = await admin.from('employees').select('id').eq('work_email', email).maybeSingle()
    if (dupEmp) return json({ error: 'An employee with this email already exists' }, 409)

    // company (first)
    const { data: company } = await admin.from('companies').select('id').limit(1).maybeSingle()
    if (!company) return json({ error: 'No company configured' }, 400)

    const empNo = `EMP-${Date.now().toString().slice(-6)}`

    // 1. employee
    const { data: emp, error: empErr } = await admin.from('employees').insert({
      company_id: company.id,
      employee_number: empNo,
      full_name_en: fullEn,
      full_name_ar: fullAr,
      job_title_en: titleEn,
      job_title_ar: titleAr,
      work_email: email,
      join_date: new Date().toISOString().slice(0, 10),
      status: 'active',
    }).select('id').single()
    if (empErr) return json({ error: `employee: ${empErr.message}` }, 400)

    // 2. auth user with chosen password, confirmed
    const { data: authData, error: aErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullEn, employee_id: emp.id },
    })
    if (aErr || !authData.user) {
      await admin.from('employees').delete().eq('id', emp.id) // rollback
      return json({ error: `auth: ${aErr?.message ?? 'create failed'}` }, 400)
    }

    // 3. profile (no forced password change — they use the chosen password)
    const { error: pErr } = await admin.from('user_profiles').insert({
      id: authData.user.id,
      employee_id: emp.id,
      role,
      is_active: true,
      must_change_password: false,
      language_pref: 'en',
    })
    if (pErr) {
      await admin.auth.admin.deleteUser(authData.user.id)
      await admin.from('employees').delete().eq('id', emp.id)
      return json({ error: `profile: ${pErr.message}` }, 400)
    }

    await admin.from('audit_logs').insert({
      user_id: caller.user.id, employee_id: emp.id, action: 'create',
      table_name: 'user_profiles', record_id: authData.user.id,
      new_values: { email, role },
    })

    return json({ success: true, user_id: authData.user.id, employee_id: emp.id, email, role })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
