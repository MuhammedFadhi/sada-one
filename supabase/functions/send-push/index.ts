// ============================================================
// SA'DA ONE — Edge Function: send-push
// Called by the notification_push trigger for every non-chat notification.
// Sends a Web Push (PWA) notification to all of the recipient's subscribed
// devices using VAPID.
//
// Configure as function secrets (Supabase dashboard → Edge Functions → secrets):
//   VAPID_PRIVATE_KEY  ECDSA P-256 private key as a JWK JSON string
//   VAPID_PUBLIC_KEY   the matching public key as a JWK JSON string
//   VAPID_SUBJECT      e.g. mailto:admin@sada.co
//   SERVICE_ROLE_KEY   (already set for admin-user-ops) — used to read subscriptions
// Generate the key pair once with the helper described in DEPLOY-033.md.
// If VAPID keys are missing, this is a safe no-op so notifications never fail.
//
// Trigger sends header x-hook-secret: sada-one-push-2026
// NOTE: This path is code-complete but must be verified after deploy with a
//       real browser subscription — Web Push cannot be exercised locally.
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush'

const HOOK_SECRET = 'sada-one-push-2026'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (req.headers.get('x-hook-secret') !== HOOK_SECRET) return json({ error: 'Forbidden' }, 403)
    const { user_id, title, body, link } = await req.json()
    if (!user_id) return json({ error: 'user_id required' }, 400)

    const priv = Deno.env.get('VAPID_PRIVATE_KEY')
    const pub = Deno.env.get('VAPID_PUBLIC_KEY')
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@sada.co'
    if (!priv || !pub) return json({ ok: true, skipped: 'VAPID keys not configured' })

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', user_id)
    if (!subs || subs.length === 0) return json({ ok: true, sent: 0 })

    // Secrets are pasted by hand, so tolerate the usual slips: surrounding
    // whitespace/quotes, or an accidentally-included "NAME=" prefix.
    const clean = (v: string) => {
      let s = v.trim().replace(/^VAPID_(PUBLIC|PRIVATE)_KEY\s*=\s*/i, '').trim()
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim()
      return s
    }
    const parseJwk = (v: string, name: string) => {
      try { return JSON.parse(clean(v)) }
      catch { throw new Error(`${name} is not valid JWK JSON. It must be the whole {"kty":"EC",...} string.`) }
    }
    const vapidKeys = await webpush.importVapidKeys(
      { publicKey: parseJwk(pub, 'VAPID_PUBLIC_KEY'), privateKey: parseJwk(priv, 'VAPID_PRIVATE_KEY') },
      { extractable: false },
    )
    const server = await webpush.ApplicationServer.new({ contactInformation: subject, vapidKeys })

    const payload = JSON.stringify({ title: title ?? 'SA\'DA ONE', body: body ?? '', link: link ?? '/' })
    let sent = 0
    for (const s of subs) {
      try {
        const subscriber = server.subscribe({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        } as any)
        await subscriber.pushTextMessage(payload, {})
        sent++
      } catch (err) {
        // 404/410 = subscription gone; clean it up
        const msg = String((err as Error)?.message ?? '')
        if (msg.includes('404') || msg.includes('410')) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
      }
    }
    return json({ ok: true, sent })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
