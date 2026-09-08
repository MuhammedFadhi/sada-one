// ============================================================
// SA'DA ONE — Edge Function: send-sms
// Called by the notification_sms trigger for type='approval' notifications.
// Edge functions have no static IP, and Taqnyat requires a whitelisted IP,
// so this POSTs to your existing static-IP SMS relay (the same DigitalOcean
// droplet used by the H2O apps), which forwards to Taqnyat.
//
// Configure as function secrets (Supabase dashboard → Edge Functions → secrets):
//   SMS_RELAY_URL     e.g. https://206.189.42.165:443/send   (your relay endpoint)
//   SMS_RELAY_SECRET  the relay's shared secret (sent as X-Secret-Key)
// If either is missing, this is a safe no-op (returns ok) so notifications
// never fail — SMS simply stays off until configured.
//
// Trigger sends header x-hook-secret: sada-one-sms-2026
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const HOOK_SECRET = 'sada-one-sms-2026'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

// KSA numbers: relay/Taqnyat expects 9665XXXXXXXX. Normalize common local forms.
function normalizeKsa(raw: string): string {
  let n = String(raw).replace(/[^\d+]/g, '').replace(/^\+/, '')
  if (n.startsWith('00')) n = n.slice(2)
  if (n.startsWith('05')) n = '966' + n.slice(1)   // 05XXXXXXXX -> 9665XXXXXXXX
  else if (n.startsWith('5') && n.length === 9) n = '966' + n // 5XXXXXXXX
  else if (n.startsWith('966')) { /* already E.164 without + */ }
  return n
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (req.headers.get('x-hook-secret') !== HOOK_SECRET) return json({ error: 'Forbidden' }, 403)
    const { to, message } = await req.json()
    if (!to || !message) return json({ error: 'to and message required' }, 400)

    const relayUrl = Deno.env.get('SMS_RELAY_URL')
    const relaySecret = Deno.env.get('SMS_RELAY_SECRET')
    if (!relayUrl || !relaySecret) return json({ ok: true, skipped: 'SMS relay not configured' })

    const num = normalizeKsa(to)
    if (num.length < 12) return json({ ok: true, skipped: 'invalid number' })

    const r = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Secret-Key': relaySecret },
      body: JSON.stringify({ to: num, message: String(message).slice(0, 300) }),
    })
    const body = await r.text().catch(() => '')
    if (!r.ok) return json({ error: 'relay failed', status: r.status, body: body.slice(0, 160) }, 502)
    return json({ ok: true })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
