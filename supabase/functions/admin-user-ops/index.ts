// ============================================================
// SA'DA ONE — Edge Function: admin-user-ops
// Admin-only user operations that require the service key:
//   { action:'reset_password', user_id, new_password, force_change? }
//   { action:'update_email',   user_id, new_email }
// Verifies the CALLER is an admin. Requires SERVICE_ROLE_KEY secret.
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')!

    // 1. Caller must be an authenticated admin
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) return json({ error: 'Missing authorization' }, 401)
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: caller, error: callerErr } = await admin.auth.getUser(token)
    if (callerErr || !caller.user) return json({ error: 'Invalid session' }, 401)
    const { data: callerProfile } = await admin.from('user_profiles').select('role').eq('id', caller.user.id).single()
    if (callerProfile?.role !== 'admin') return json({ error: 'Admin access required' }, 403)

    // 2. Perform action
    const body = await req.json()
    const { action, user_id } = body
    if (!action) return json({ error: 'action is required' }, 400)
    if (action !== 'create_account' && !user_id) return json({ error: 'user_id is required' }, 400)

    if (action === 'reset_password') {
      const { new_password, force_change } = body
      if (!new_password || new_password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)
      const { error } = await admin.auth.admin.updateUserById(user_id, { password: new_password })
      if (error) return json({ error: error.message }, 400)
      await admin.from('user_profiles').update({ must_change_password: !!force_change }).eq('id', user_id)
      return json({ ok: true })
    }

    if (action === 'update_email') {
      const { new_email } = body
      if (!new_email) return json({ error: 'new_email is required' }, 400)
      const { error } = await admin.auth.admin.updateUserById(user_id, { email: new_email, email_confirm: true })
      if (error) return json({ error: error.message }, 400)
      await admin.from('user_profiles').update({ email: new_email }).eq('id', user_id)
      return json({ ok: true })
    }

    if (action === 'create_account') {
      // Provision a login-ready account (auth user + employee + profile + balances).
      // Idempotent: re-running updates password/role instead of failing.
      const { email, password, role, employee_id, division_id, full_name, employee_number, job_title, manager_id } = body
      if (!email || !password || !role || !employee_id) return json({ error: 'email, password, role, employee_id required' }, 400)
      // 1. auth user (create or find + reset)
      let authId: string | null = null
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: full_name ?? email } })
      if (created.error) {
        // already exists -> locate and reset password
        const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const found = list.data?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase())
        if (!found) return json({ error: `createUser failed: ${created.error.message}` }, 400)
        authId = found.id
        await admin.auth.admin.updateUserById(authId, { password, email_confirm: true })
      } else {
        authId = created.data.user!.id
      }
      // 2. employee (upsert on id)
      const emp = {
        id: employee_id, company_id: 'a0000000-0000-0000-0000-000000000001', division_id: division_id ?? null,
        manager_id: manager_id ?? null, employee_number: employee_number ?? ('TST-' + role.slice(0,3).toUpperCase()),
        full_name_en: full_name ?? email, full_name_ar: full_name ?? email,
        job_title_en: job_title ?? role, job_title_ar: job_title ?? role,
        nationality: 'Saudi', gender: 'male', work_email: email,
        join_date: new Date(Date.now() - 365*864e5).toISOString().slice(0,10), contract_type: 'permanent', status: 'active',
      }
      const eUp = await admin.from('employees').upsert(emp, { onConflict: 'id' })
      if (eUp.error) return json({ error: `employee upsert: ${eUp.error.message}` }, 400)
      // 3. profile (upsert on id) — role is post-merge value caller supplies
      const pUp = await admin.from('user_profiles').upsert({ id: authId, employee_id, role, is_active: true, language_pref: 'en', must_change_password: false }, { onConflict: 'id' })
      if (pUp.error) return json({ error: `profile upsert: ${pUp.error.message}` }, 400)
      // 4. leave balances (ignore conflicts)
      const yr = new Date().getFullYear()
      await admin.from('leave_balances').upsert([
        { employee_id, year: yr, leave_type: 'annual', entitled_days: 30, taken_days: 0, pending_days: 0, carried_over: 0 },
        { employee_id, year: yr, leave_type: 'sick',   entitled_days: 30, taken_days: 0, pending_days: 0, carried_over: 0 },
      ], { onConflict: 'employee_id,year,leave_type', ignoreDuplicates: true })
      return json({ ok: true, user_id: authId, email })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})
