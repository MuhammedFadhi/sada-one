// ============================================================
// SA'DA ONE — Edge Function: send-push-notification
// Sends a notification: stores in DB + (optionally) web push.
// Called by triggers/app for leave approvals, announcements, etc.
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      employee_ids,        // array of employee ids OR
      employee_id,         // single id
      title,
      body,
      type = 'general',    // leave, payroll, document, announcement, etc.
      link,                // in-app deep link e.g. /employee/leave
    } = await req.json()

    if ((!employee_ids && !employee_id) || !title) {
      return new Response(JSON.stringify({ error: 'recipient and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const recipients: string[] = employee_ids ?? [employee_id]

    // 1. Insert in-app notifications (these power the bell icon + unread dot)
    const rows = recipients.map(eid => ({
      employee_id: eid,
      title,
      body: body ?? '',
      type,
      link: link ?? null,
      is_read: false,
    }))
    const { error: insertErr } = await supabase.from('notifications').insert(rows)
    if (insertErr) {
      return new Response(JSON.stringify({ error: 'Failed to store notifications: ' + insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Fetch web-push tokens for these employees (PWA push subscriptions)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('push_token')
      .in('employee_id', recipients)
      .not('push_token', 'is', null)

    const tokens = (profiles ?? []).map((p: any) => p.push_token).filter(Boolean)

    // 3. Send web push via the configured provider (VAPID keys as secrets).
    //    Stored as a no-op if push isn't configured yet — in-app still works.
    let pushSent = 0
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const fcmKey = Deno.env.get('FCM_SERVER_KEY')

    if (fcmKey && tokens.length) {
      // Firebase Cloud Messaging path (works for PWA on Android/desktop)
      for (const token of tokens) {
        try {
          const res = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: { 'Authorization': `key=${fcmKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: token,
              notification: { title, body: body ?? '', icon: '/sada-one-logo.jpg' },
              data: { link: link ?? '/' },
            }),
          })
          if (res.ok) pushSent++
        } catch { /* token may be stale; in-app notification already delivered */ }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      notified: recipients.length,
      push_sent: pushSent,
      push_configured: !!(fcmKey || vapidPublic),
      message: pushSent > 0
        ? `Sent ${pushSent} push + ${recipients.length} in-app notifications`
        : `Stored ${recipients.length} in-app notifications (web push not configured)`,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
