// ============================================================
// SA'DA ONE — Edge Function: send-email
// Called by the DB trigger `trg_notification_email` (pg_net) on every
// non-chat notification. Sends via Resend.
// Secrets:
//   RESEND_API_KEY  — from resend.com (function no-ops gracefully if absent)
//   MAIL_FROM       — optional, e.g. "SA'DA ONE <no-reply@sada.one>"
// The trigger sends header x-hook-secret: sada-one-mail-2026
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const HOOK_SECRET = 'sada-one-mail-2026'
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

serve(async (req) => {
  try {
    if (req.headers.get('x-hook-secret') !== HOOK_SECRET) return json({ error: 'Forbidden' }, 403)

    const key = Deno.env.get('RESEND_API_KEY')
    if (!key) return json({ ok: true, skipped: 'RESEND_API_KEY not configured' })

    const { to, subject, text, link } = await req.json()
    if (!to || !subject) return json({ error: 'to and subject required' }, 400)

    const appUrl = 'https://sada-one-umber.vercel.app'
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#0D1B2A;border-radius:14px;padding:28px;color:white">
          <div style="font-size:18px;font-weight:800;margin-bottom:4px">SA<span style="color:#C8A96E">'</span>DA ONE</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4);letter-spacing:1px;margin-bottom:22px">EMPLOYEE EXPERIENCE</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:10px">${escapeHtml(subject)}</div>
          <div style="font-size:14px;line-height:1.6;color:rgba(255,255,255,.85);margin-bottom:24px">${escapeHtml(text ?? '')}</div>
          <a href="${appUrl}${link ?? '/'}" style="display:inline-block;background:linear-gradient(135deg,#C8A96E,#A8894E);color:white;text-decoration:none;border-radius:10px;padding:12px 22px;font-size:14px;font-weight:700">Open SA'DA ONE</a>
        </div>
        <div style="font-size:11px;color:#94A3B8;text-align:center;margin-top:14px">This is an automated notification from SA'DA ONE.</div>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('MAIL_FROM') ?? 'SA\'DA ONE <onboarding@resend.dev>',
        to: [to], subject, html,
      }),
    })
    const data = await res.json()
    if (!res.ok) return json({ error: data }, 502)
    return json({ ok: true, id: data.id })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
