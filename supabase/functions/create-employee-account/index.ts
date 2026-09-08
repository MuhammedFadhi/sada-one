// ============================================================
// SA'DA ONE — Edge Function: create-employee-account
// Creates a Supabase auth user for a new employee + links profile
// Called by HR when onboarding. Requires service role (admin) key.
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw + '!2A'   // ensure complexity requirements
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { employee_id, email, role = 'employee' } = await req.json()

    if (!employee_id || !email) {
      return new Response(JSON.stringify({ error: 'employee_id and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Admin client with service role key (set as edge function secret)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Verify the employee exists and has no account yet
    const { data: employee, error: empErr } = await supabase
      .from('employees').select('id, full_name_en, company_id').eq('id', employee_id).single()
    if (empErr || !employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: existingProfile } = await supabase
      .from('user_profiles').select('id').eq('employee_id', employee_id).maybeSingle()
    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'This employee already has an account' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Create the auth user with a temp password, auto-confirmed.
    //    If the email is already registered (e.g. an orphaned auth user from a
    //    previous partial attempt), adopt that user instead of failing.
    const tempPassword = generateTempPassword()
    let userId: string
    let createdNew = false
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: employee.full_name_en, employee_id },
    })
    if (authErr || !authData.user) {
      if (/already.*(registered|exists)/i.test(authErr?.message ?? '')) {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existing = list?.users?.find(u => (u.email ?? '').toLowerCase() === email.toLowerCase())
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Email already registered but user could not be located' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        userId = existing.id
        // reset to a fresh temp password so HR has a known credential
        await supabase.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: employee.full_name_en, employee_id },
        })
      } else {
        return new Response(JSON.stringify({ error: authErr?.message ?? 'Failed to create auth user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    } else {
      userId = authData.user.id
      createdNew = true
    }

    // 3. Create (or repair) the linked user_profiles row
    const { error: profileErr } = await supabase.from('user_profiles').upsert({
      id: userId,
      employee_id,
      role,
      is_active: true,
      two_fa_enabled: false,
      language_pref: 'en',
      must_change_password: true,
    })
    if (profileErr) {
      if (createdNew) await supabase.auth.admin.deleteUser(userId) // only roll back users we made
      return new Response(JSON.stringify({ error: 'Failed to link profile: ' + profileErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      employee_id,
      action: 'create',
      table_name: 'user_profiles',
      record_id: userId,
      new_values: { email, role, full_name: employee.full_name_en },
    })

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      email,
      temp_password: tempPassword,
      message: 'Account created. Employee must change password on first login.',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
