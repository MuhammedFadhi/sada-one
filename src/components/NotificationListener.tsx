// ============================================================
// SA'DA ONE — Global notification listener
// Subscribes to the user's notification INSERTs: shows an in-app
// banner (toast) and refreshes the unread badge instantly.
// Mounted once inside the authenticated app shell.
// ============================================================
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { KEYS } from '@/hooks/useData'
import toast from 'react-hot-toast'

export function NotificationListener() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) return
    const ch = supabase
      .channel(`notif-rt-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => {
          const n: any = payload.new
          qc.invalidateQueries({ queryKey: KEYS.notifications })
          // Chat has its own in-room experience; only banner when not already in that chat
          if (n.type === 'chat_message' && window.location.pathname === (n.data?.link ?? '')) return
          toast.custom(t => (
            <div onClick={() => { toast.dismiss(t.id); if (n.data?.link) navigate(n.data.link) }}
              style={{
                background: '#0D1B2A', color: 'white', borderRadius: 14, padding: '12px 14px',
                boxShadow: '0 8px 28px rgba(0,0,0,.35)', display: 'flex', gap: 10, alignItems: 'flex-start',
                maxWidth: 340, cursor: 'pointer', border: '1px solid rgba(255,255,255,.08)',
              }}>
              <i className={`ti ti-${n.type === 'chat_message' ? 'message-circle' : n.type === 'task' ? 'checkbox' : 'bell'}`}
                style={{ color: '#17B8D0', fontSize: 18, flexShrink: 0, marginTop: 1 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.body}</div>}
              </div>
            </div>
          ), { duration: 4000, position: 'top-center' })
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  return null
}
