// ============================================================
// SA'DA ONE — Edge Function: delete-user
// Admin-only. Removes a user's login (auth user + user_profiles)
// and offboards the employee (status = 'terminated', history kept).
// Requires SERVICE_ROLE_KEY secret. Verifies the CALLER is an admin.
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

    // 1. Authenticate + authorize the caller as admin
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'Missing authorization' }, 401)

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: caller, error: callerErr } = await admin.auth.getUser(token)
    if (callerErr || !caller.user) return json({ error: 'Invalid session' }, 401)

    const { data: callerProfile } = await admin
      .from('user_profiles').select('role').eq('id', caller.user.id).single()
    if (callerProfile?.role !== 'admin') return json({ error: 'Admin access required' }, 403)

    // 2. Validate target
    const { user_id, hard } = await req.json()
    if (!user_id) return json({ error: 'user_id is required' }, 400)
    if (user_id === caller.user.id) return json({ error: 'You cannot delete your own account' }, 400)

    const { data: target } = await admin
      .from('user_profiles').select('id, employee_id').eq('id', user_id).maybeSingle()

    if (hard) {
      // HARD: erase the employee record, all their data, AND the auth login.
      // admin_hard_delete_employee (SQL, owner privileges) removes the linked
      // auth.users row itself — GoTrue's admin deleteUser was unreliable here.
      const errors: string[] = []
      if (target?.employee_id) {
        const { error: rpcErr } = await admin.rpc('admin_hard_delete_employee', { p_emp: target.employee_id })
        if (rpcErr) errors.push('data: ' + (rpcErr.message || JSON.stringify(rpcErr)))
      } else {
        // no employee link — remove the auth user directly
        const { error: delErr } = await admin.auth.admin.deleteUser(user_id)
        const m = delErr?.message || ''
        if (delErr && m && !/not.?found|does not exist|no.?rows/i.test(m)) errors.push('auth: ' + m)
      }
      // best-effort safety net; never fatal (rpc already handled these)
      await admin.from('user_profiles').delete().eq('id', user_id)
      await admin.auth.admin.deleteUser(user_id)

      if (errors.length) return json({ error: errors.join(' | ') }, 400)

      await admin.from('audit_logs').insert({
        user_id: caller.user.id, employee_id: null, action: 'delete',
        table_name: 'employees', record_id: target?.employee_id ?? user_id,
        old_values: { hard_deleted_user_id: user_id, employee_id: target?.employee_id },
      })
      return json({ success: true, message: 'User and all associated data permanently deleted.' })
    }

    // SOFT: remove login + profile, keep employee record as terminated (audit/history)
    if (target?.employee_id) {
      await admin.from('employees').update({ status: 'terminated' }).eq('id', target.employee_id)
    }
    await admin.from('user_profiles').delete().eq('id', user_id)
    const { error: delErr } = await admin.auth.admin.deleteUser(user_id)
    if (delErr && !/not found/i.test(delErr.message)) return json({ error: delErr.message }, 400)

    await admin.from('audit_logs').insert({
      user_id: caller.user.id,
      employee_id: target?.employee_id ?? null,
      action: 'delete',
      table_name: 'user_profiles',
      record_id: user_id,
      old_values: { deleted_user_id: user_id },
    })
    return json({ success: true, message: 'User account deleted and employee offboarded.' })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
