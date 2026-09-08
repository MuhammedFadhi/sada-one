// ============================================================
// SA'DA ONE — Chat Room (WhatsApp-style, Supabase Realtime)
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMessageReceipts, usePresenceHeartbeat, useChatMessages, useSendMessage, useAddReaction, useMarkChannelRead, useChatChannels, useEmployees } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui'
import { useVoiceRecorder, VoicePlayer, fmtDur } from '@/components/chat/VoiceNote'
import toast from 'react-hot-toast'
import { formatDayNameLong, formatTime } from '@/lib/dates'

const QUICK_REACTIONS = ['👍','❤️','😄','🎉','👀','✅']

export function ChatRoomPage() {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate      = useNavigate()
  const { profile }   = useAuthStore()
  const qc            = useQueryClient()

  const { data: messages, isLoading } = useChatMessages(channelId!)
  const { data: receipts } = useMessageReceipts(channelId)
  usePresenceHeartbeat()
  const { data: channels }            = useChatChannels()
  const { data: employees }           = useEmployees({ status: 'active' })
  const sendMessage  = useSendMessage()
  const addReaction  = useAddReaction()
  const markRead     = useMarkChannelRead(channelId!)

  const [text, setText]             = useState('')
  const [replyTo, setReplyTo]       = useState<any>(null)
  const [mentionSearch, setMentionSearch] = useState<string | null>(null) // '@mention' in progress
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const kbInset = useKeyboardInset()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !channelId) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Max file size is 10MB'); return }
    setUploading(true)
    try {
      const path = `${channelId}/${crypto.randomUUID()}-${file.name}`
      const { error: upErr } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path)
      await sendMessage.mutateAsync({
        channel_id: channelId,
        content: '',
        attachment_url: publicUrl,
        attachment_name: file.name,
        attachment_type: file.type,
      })
    } catch (err: any) {
      toast.error(/bucket/i.test(err?.message ?? '') ? 'Attachments are not enabled yet' : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── Voice notes ──────────────────────────────────────
  const rec = useVoiceRecorder()

  const handleVoiceStart = async () => {
    const ok = await rec.start()
    if (!ok) toast.error(rec.lastError?.() || 'Could not start recording')
  }

  const handleVoiceSend = async () => {
    const result = await rec.stop()
    if (!result || !channelId) return
    if (result.duration < 1) { toast.error('Too short — record at least a second'); return }
    setUploading(true)
    try {
      const ext  = result.mime.includes('mp4') ? 'm4a' : 'webm'
      const path = `${channelId}/voice-${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('chat-attachments')
        .upload(path, result.blob, { contentType: result.mime, upsert: false })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path)
      const msg = await sendMessage.mutateAsync({
        channel_id: channelId,
        content: '',
        reply_to_id: replyTo?.id,
        attachment_url: publicUrl,
        attachment_name: `Voice note (${fmtDur(result.duration)})`,
        attachment_type: result.mime,
      })
      setReplyTo(null)
      channelRef.current?.send({ type: 'broadcast', event: 'new_msg', payload: msg })
    } catch (err: any) {
      toast.error(/bucket|not found/i.test(err?.message ?? '') ? 'Attachment storage is not set up' : `Could not send voice note: ${err?.message ?? 'unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const channel = channels?.find((c: any) => c.id === channelId)
  const isDM    = channel?.type === 'direct'
  const myId    = profile?.employee_id

  // refs so the realtime subscription (keyed only on channelId) always reads latest data
  const employeesRef = useRef(employees)
  useEffect(() => { employeesRef.current = employees }, [employees])
  const myIdRef = useRef(myId)
  useEffect(() => { myIdRef.current = myId }, [myId])
  const channelRef = useRef<any>(null)

  // Get DM partner name
  const dmPartner = isDM ? (() => {
    const mem = channel?.members?.find((m: any) => m.employee_id !== myId)
    return employees?.find(e => e.id === mem?.employee_id)
  })() : null

  // Groups are named freely (capitals, spaces, duplicates) — no '#' prefix,
  // which was Slack-style channel naming.
  const channelName = isDM
    ? (dmPartner?.full_name_en ?? 'Direct Message')
    : (channel?.name ?? 'Group')

  // ── Realtime subscription ─────────────────────────────
  // Broadcast = near-instant client→client delivery (~150ms).
  // postgres_changes = fallback/persistence guarantee (~500-800ms, WAL-based).
  // Both funnel through appendMessage which dedupes by id.
  useEffect(() => {
    if (!channelId) return

    const appendMessage = (msg: any, resolveSender = false) => {
      if (!msg?.id) return
      let sender = msg.sender ?? null
      if (resolveSender && !sender) {
        const e = employeesRef.current?.find((x: any) => x.id === msg.sender_id)
        sender = e ? { id: e.id, full_name_en: e.full_name_en, avatar_url: e.avatar_url } : null
      }
      qc.setQueryData<any[]>(['chat-messages', channelId], (old = []) => {
        if (old.some(m => m.id === msg.id)) return old
        // only refetch if we truly can't resolve a sender (postgres_changes path)
        if (resolveSender && !sender && msg.sender_id !== myIdRef.current) {
          qc.invalidateQueries({ queryKey: ['chat-messages', channelId] })
          return old
        }
        return [...old, { ...msg, sender }]
      })
      qc.invalidateQueries({ queryKey: ['chat-channels'] })
    }

    const sub = supabase
      .channel(`chat:${channelId}`, { config: { broadcast: { self: false } } })
      // Instant path — sender broadcasts the persisted message
      .on('broadcast', { event: 'new_msg' }, ({ payload }) => appendMessage(payload))
      // Fallback path — guarantees delivery even if a broadcast is missed
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => appendMessage(payload.new, true))
      .subscribe()

    channelRef.current = sub
    return () => { channelRef.current = null; supabase.removeChannel(sub) }
  }, [channelId])

  // ── Auto-scroll to bottom ─────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, kbInset])

  // ── Mark as read when entering ────────────────────────
  useEffect(() => {
    markRead.mutate()
  }, [channelId])

  // ── Send message ──────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim()) return
    const content = text.trim()
    setText('')
    setPickedMentions([])
    setReplyTo(null)
    try {
      const msg = await sendMessage.mutateAsync({
        channel_id: channelId!,
        content,
        reply_to_id: replyTo?.id,
        mentions: resolveMentions(content, pickedMentions, mentionCandidates),
      })
      // Instant delivery to others on the channel (row is already persisted above)
      channelRef.current?.send({ type: 'broadcast', event: 'new_msg', payload: msg })
    } catch { toast.error('Failed to send') }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === '@') setMentionSearch('')
    if (mentionSearch !== null && e.key === 'Escape') setMentionSearch(null)
  }

  const handleTextChange = (val: string) => {
    setText(val)
    const atMatch = val.match(/@(\w*)$/)
    setMentionSearch(atMatch ? atMatch[1] : null)
  }

  // Only people in THIS conversation can be mentioned — tagging someone who
  // isn't a member would notify them about a thread they can't even open.
  const memberIds = new Set((channel?.members ?? []).map((m: any) => m.employee_id))

  // Replies are resolved LOCALLY. The PostgREST self-join on reply_to_id came back
  // in the wrong direction — it returned a message's CHILDREN rather than its parent,
  // and because an empty array is truthy in JS, every message rendered a blank
  // "Reply" chip while genuine replies never showed what they quoted.
  const byId = new Map<string, any>((messages ?? []).map((m: any) => [m.id, m]))
  const mentionCandidates = (employees ?? []).filter(e => e.id !== myId && memberIds.has(e.id))

  // Remember exactly who was picked. Resolving "@name" by first name alone
  // tagged the wrong colleague whenever two people shared one.
  const [pickedMentions, setPickedMentions] = useState<{ id: string; label: string }[]>([])

  const insertMention = (emp: any) => {
    const label = emp.full_name_en.split(' ')[0]
    setText(text.replace(/@[\w]*$/, `@${label} `))
    setPickedMentions(prev => prev.some(p => p.id === emp.id) ? prev : [...prev, { id: emp.id, label }])
    setMentionSearch(null)
    inputRef.current?.focus()
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction.mutateAsync({ message_id: messageId, emoji, channel_id: channelId! })
    } catch {}
  }

  // ── Group messages by date ────────────────────────────
  const groupedMessages = groupByDate(messages ?? [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F4F6F9', paddingBottom: kbInset, transition: 'padding-bottom .18s ease' }}>

      {/* Header */}
      <div style={{ background: '#17294A', paddingBottom: 12, flexShrink: 0 }}>
        <div style={{ height: 'env(safe-area-inset-top)', background: '#17294A' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px 0', gap: 8 }}>
          <button onClick={() => navigate('/chat')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <i className="ti ti-arrow-left" style={{ color: 'white', fontSize: 22 }} />
          </button>

          {isDM && dmPartner
            ? <Avatar name={dmPartner.full_name_en} size={34} />
            : (
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-users" style={{ color: 'rgba(255,255,255,.7)', fontSize: 18 }} />
              </div>
            )
          }

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {channelName}
            </div>
            {isDM && dmPartner && (
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11 }}>{dmPartner.job_title_en}</div>
            )}
            {!isDM && (
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(() => {
                  // WhatsApp-style subtitle: who's actually in the group.
                  const names = (channel?.members ?? [])
                    .map((m: any) => employees?.find(e => e.id === m.employee_id)?.full_name_en?.split(' ')[0])
                    .filter(Boolean)
                  if (!names.length) return channel?.description ?? ''
                  return names.length <= 4
                    ? names.join(', ')
                    : `${names.slice(0, 3).join(', ')} and ${names.length - 3} others`
                })()}
              </div>
            )}
          </div>

          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-dots-vertical" style={{ color: 'rgba(255,255,255,.5)', fontSize: 20 }} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 32, color: '#718096' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 8 }} />
            Loading messages...
          </div>
        )}

        {!isLoading && !messages?.length && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#718096' }}>
            <i className="ti ti-message-circle" style={{ fontSize: 48, color: '#CBD5E0', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: '#4A5568', marginBottom: 4 }}>
              {isDM ? `Start a conversation with ${dmPartner?.full_name_en?.split(' ')[0]}` : `This is the start of ${channel?.name ?? 'the group'}`}
            </p>
            <p style={{ fontSize: 12, color: '#718096' }}>
              {isDM ? 'Messages are private and only visible to you two.' : (channel?.description ?? 'This is the beginning of the channel.')}
            </p>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]: [string, any[]]) => (
          <div key={date}>
            {/* Date divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
              <div style={{ flex: 1, height: .5, background: '#E2E8F0' }} />
              <span style={{ fontSize: 11, color: '#CBD5E0', fontWeight: 500, whiteSpace: 'nowrap', padding: '0 8px', background: '#F4F6F9' }}>{date}</span>
              <div style={{ flex: 1, height: .5, background: '#E2E8F0' }} />
            </div>

            {msgs.map((msg: any, i: number) => {
              const isMe = msg.sender_id === myId
              const prevMsg = msgs[i - 1]
              const sameAuthor = prevMsg && prevMsg.sender_id === msg.sender_id &&
                (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) < 120000

              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  replyParent={msg.reply_to_id ? (byId.get(msg.reply_to_id) ?? null) : null}
                  receipt={receipts?.[msg.id]}
                  isMe={isMe}
                  sameAuthor={sameAuthor}
                  onReply={() => setReplyTo(msg)}
                  onAddReaction={emoji => handleReaction(msg.id, emoji)}
                  myId={myId!}
                />
              )
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* @Mention autocomplete */}
      {mentionSearch !== null && (
        <div style={{ background: 'white', borderRadius: '12px 12px 0 0', boxShadow: '0 -4px 16px rgba(0,0,0,.1)', maxHeight: 180, overflowY: 'auto', flexShrink: 0 }}>
          {mentionCandidates.filter(e =>
            e.full_name_en.toLowerCase().includes(mentionSearch.toLowerCase())
          ).slice(0, 6).map(emp => (
            <button key={emp.id} onClick={() => insertMention(emp)}
              style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', borderBottom: '0.5px solid #F4F6F9' }}>
              <Avatar name={emp.full_name_en} size={28} />
              <div>
                <div style={{ fontSize: 13, color: '#1A202C', fontWeight: 500 }}>{emp.full_name_en}</div>
                <div style={{ fontSize: 11, color: '#718096' }}>{emp.job_title_en}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div style={{ background: '#EBF8FF', borderLeft: '3px solid #17B8D0', padding: '8px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-corner-up-right" style={{ color: '#17B8D0', fontSize: 14, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#17B8D0', fontWeight: 600 }}>Replying to {replyTo.sender?.full_name_en}</div>
            <div style={{ fontSize: 12, color: '#4A5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.content}</div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div style={{ background: 'white', padding: '10px 12px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '0.5px solid #E2E8F0' }}>
        {rec.recording ? (
          /* ── Recording bar ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button aria-label="Cancel recording" onClick={() => rec.cancel()}
              style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#F4F6F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-trash" style={{ color: '#E24B4A', fontSize: 18 }} />
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#FFF5F5', borderRadius: 22, padding: '12px 16px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E24B4A', animation: 'recPulse 1s ease-in-out infinite' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#E24B4A' }}>{fmtDur(rec.seconds)}</span>
              <span style={{ fontSize: 12, color: '#A0AEC0' }}>Recording voice note…</span>
            </div>
            <button aria-label="Send voice note" onClick={handleVoiceSend} disabled={uploading}
              style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#17B8D0,#0F8A9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(23,184,208,.35)' }}>
              <i className={`ti ti-${uploading ? 'loader-2' : 'send'}`} style={{ color: 'white', fontSize: 18, animation: uploading ? 'spin .8s linear infinite' : 'none' }} />
            </button>
          </div>
        ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ flex: 1, background: '#F4F6F9', borderRadius: 22, padding: '8px 14px', border: '1.5px solid transparent', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => inputRef.current?.focus()}>
            <input
              ref={inputRef}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${channelName}…`}
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 16, color: '#1A202C', fontFamily: 'inherit', lineHeight: 1.4 }}
            />
            <input ref={fileRef} type="file" hidden onChange={handleFile}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />
            <button aria-label="Attach file" disabled={uploading}
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
              style={{ background: 'none', border: 'none', cursor: uploading ? 'default' : 'pointer', padding: 0, display: 'flex' }}>
              <i className={`ti ti-${uploading ? 'loader-2' : 'paperclip'}`}
                style={{ color: '#94A3B8', fontSize: 18, animation: uploading ? 'spin .8s linear infinite' : 'none' }} />
            </button>
          </div>

          {/* Send / Mic button */}
          {text.trim() ? (
            <button
              aria-label="Send message"
              onClick={handleSend}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#17B8D0,#0F8A9E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background .2s', boxShadow: '0 4px 12px rgba(23,184,208,.35)',
              }}>
              <i className="ti ti-send" style={{ color: 'white', fontSize: 18 }} />
            </button>
          ) : (
            <button
              aria-label="Record voice note"
              onClick={handleVoiceStart}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#C8A96E,#A8894E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(200,169,110,.3)',
              }}>
              <i className="ti ti-microphone" style={{ color: 'white', fontSize: 18 }} />
            </button>
          )}
        </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes recPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────
// Gestures: long-press (touch) / hover (desktop) opens the action menu;
// swipe right on any message = reply. Menu flips below the bubble when
// it would be clipped by the header. iOS text-selection callout suppressed.
function MessageBubble({ msg, replyParent, isMe, sameAuthor, onReply, onAddReaction, myId, receipt }: {
  msg: any
  replyParent?: any
  receipt?: any
  isMe: boolean
  sameAuthor: boolean
  onReply: () => void
  onAddReaction: (emoji: string) => void
  myId: string
}) {
  const [showActions, setShowActions] = useState(false)
  const [menuViaPointer, setMenuViaPointer] = useState(false) // touch/right-click vs hover
  const [menuBelow, setMenuBelow]     = useState(false)
  const [dragX, setDragX]             = useState(0)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const press    = useRef<{ timer: ReturnType<typeof setTimeout> | null; x: number; y: number; swiping: boolean; fired: boolean }>({ timer: null, x: 0, y: 0, swiping: false, fired: false })

  const openMenu = () => {
    const rect = wrapRef.current?.getBoundingClientRect()
    setMenuBelow(!!rect && rect.top < 140) // header + safe-area: flip below instead of clipping
    setMenuViaPointer(true)
    setShowActions(true)
    if (navigator.vibrate) navigator.vibrate(10)
  }

  const clearPress = () => {
    if (press.current.timer) { clearTimeout(press.current.timer); press.current.timer = null }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    press.current = { timer: null, x: t.clientX, y: t.clientY, swiping: false, fired: false }
    press.current.timer = setTimeout(() => { press.current.fired = true; openMenu() }, 350)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const t  = e.touches[0]
    const dx = t.clientX - press.current.x
    const dy = t.clientY - press.current.y
    // any real movement cancels the long-press
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearPress()
    // horizontal drag to the right (not mine: always right; mine: also right) = reply gesture
    if (!press.current.swiping && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.4 && dx > 0) {
      press.current.swiping = true
    }
    if (press.current.swiping) {
      setDragX(Math.min(Math.max(dx, 0), 72))
    }
  }

  const onTouchEnd = () => {
    clearPress()
    if (press.current.swiping) {
      if (dragX > 48) { onReply(); if (navigator.vibrate) navigator.vibrate(8) }
      press.current.swiping = false
      setDragX(0)
    }
  }

  const time = formatTime(msg.created_at)
  const hasReactions = Object.keys(msg.reactions ?? {}).some(k => (msg.reactions[k]?.length ?? 0) > 0)
  const isVoice = typeof msg.attachment_type === 'string' && msg.attachment_type.startsWith('audio/')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: sameAuthor ? 2 : 10 }}>

      {/* Author + avatar (only if new author) */}
      {!sameAuthor && !isMe && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Avatar name={msg.sender?.full_name_en ?? '?'} size={26} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#4A5568' }}>{msg.sender?.full_name_en}</span>
          <span style={{ fontSize: 10, color: '#CBD5E0' }}>{time}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '85%', position: 'relative' }}>

        {/* Avatar spacer for same author */}
        {!isMe && <div style={{ width: sameAuthor ? 26 : 0 }} />}

        {/* Swipe reply hint behind the bubble */}
        {dragX > 12 && (
          <div style={{ position: 'absolute', left: isMe ? 'auto' : -30, right: isMe ? -30 : 'auto', top: '50%', transform: 'translateY(-50%)', opacity: Math.min(dragX / 48, 1) }}>
            <i className="ti ti-corner-up-right" style={{ fontSize: 18, color: '#17B8D0' }} />
          </div>
        )}

        <div
          ref={wrapRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          onContextMenu={e => { e.preventDefault(); openMenu() }}
          onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) { setMenuViaPointer(false); setShowActions(true) } }}
          onMouseLeave={() => { if (window.matchMedia('(hover: hover)').matches) setShowActions(false) }}
          style={{
            position: 'relative',
            transform: dragX ? `translateX(${dragX}px)` : undefined,
            transition: dragX ? 'none' : 'transform .18s ease',
            WebkitUserSelect: 'none', userSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'pan-y',
          }}>

          {/* Quoted message — only when the parent actually resolved */}
          {replyParent && (
            <div style={{
              // The quote sits ABOVE the bubble, on the page background — not inside
              // it. A 15%-white fill with white text was therefore white-on-light-grey
              // and completely invisible on your own messages. Use a solid darker
              // teal so it reads as the top of the bubble.
              background: isMe ? '#0F8A9E' : '#E8EDF5',
              borderRadius: '10px 10px 0 0', padding: '5px 10px',
              borderLeft: isMe ? 'none' : '3px solid rgba(23,184,208,.5)',
              marginBottom: 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isMe ? 'rgba(255,255,255,.85)' : '#17B8D0' }}>
                {replyParent.sender?.full_name_en ?? 'Reply'}
              </div>
              <div style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,.9)' : '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                {replyParent.attachment_type?.startsWith('audio/') ? '🎤 Voice note' : replyParent.content}
              </div>
            </div>
          )}

          {/* Message bubble */}
          <div style={{
            background: msg.is_deleted ? '#F4F6F9' : isMe ? 'linear-gradient(135deg,#17B8D0,#0F8A9E)' : 'white',
            borderRadius: isMe
              ? (replyParent ? '0 0 4px 16px' : '16px 4px 16px 16px')
              : (replyParent ? '0 0 16px 4px' : '4px 16px 16px 16px'),
            padding: '9px 13px',
            boxShadow: '0 1px 3px rgba(0,0,0,.08)',
          }}>
            {msg.is_deleted
              ? <span style={{ fontSize: 12, color: '#CBD5E0', fontStyle: 'italic' }}>Message deleted</span>
              : <>
                  {msg.attachment_url && (
                    isVoice
                      ? <VoicePlayer url={msg.attachment_url} isMe={isMe} label={msg.attachment_name} />
                      : msg.attachment_type?.startsWith('image/')
                      ? <img src={msg.attachment_url} alt={msg.attachment_name ?? 'image'}
                          onClick={() => window.open(msg.attachment_url, '_blank')}
                          style={{ maxWidth: 220, maxHeight: 260, borderRadius: 10, cursor: 'pointer', display: 'block', marginBottom: msg.content ? 6 : 0 }} />
                      : <a href={msg.attachment_url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '8px 10px', borderRadius: 8,
                            background: isMe ? 'rgba(255,255,255,.15)' : '#F4F6F9', marginBottom: msg.content ? 6 : 0, maxWidth: 220 }}>
                          <i className="ti ti-file-text" style={{ fontSize: 20, color: isMe ? 'white' : '#17B8D0', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: isMe ? 'white' : '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.attachment_name ?? 'Attachment'}
                          </span>
                        </a>
                  )}
                  {msg.content && (
                    <span style={{ fontSize: 14, color: isMe ? 'white' : '#1A202C', lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {renderContent(msg.content)}
                    </span>
                  )}
                </>
            }
            {/* Time (same author) */}
            {(sameAuthor || isMe) && (
              <div style={{ fontSize: 9, color: isMe ? 'rgba(255,255,255,.5)' : '#CBD5E0', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                {time}{isMe && <Ticks receipt={receipt} />}
              </div>
            )}
          </div>

          {/* Reactions */}
          {hasReactions && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {Object.entries(msg.reactions ?? {}).map(([emoji, users]: [string, any]) => {
                if (!users?.length) return null
                const reacted = users.includes(myId)
                return (
                  <button key={emoji} onClick={() => onAddReaction(emoji)}
                    style={{ background: reacted ? '#EBF8FF' : '#F4F6F9', border: `1px solid ${reacted ? '#17B8D0' : '#E2E8F0'}`, borderRadius: 20, padding: '3px 8px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                    {emoji} <span style={{ fontSize: 10, color: reacted ? '#17B8D0' : '#718096', fontWeight: reacted ? 600 : 400 }}>{users.length}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Action menu (hover on desktop, long-press on touch) */}
          {showActions && !msg.is_deleted && (
            <>
              {/* touch backdrop to dismiss — only for touch/long-press menus, never hover */}
              {menuViaPointer && (
                <div onClick={() => setShowActions(false)} onTouchStart={() => setShowActions(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 9, background: 'transparent' }} />
              )}
              <div style={{
                position: 'absolute',
                [isMe ? 'right' : 'left']: 0,
                ...(menuBelow ? { top: 'calc(100% + 6px)' } : { top: -40 }),
                background: 'white', borderRadius: 22,
                boxShadow: '0 4px 20px rgba(0,0,0,.18)',
                padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 2, zIndex: 10, whiteSpace: 'nowrap',
              }}>
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => { onAddReaction(emoji); setShowActions(false) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, padding: '3px 5px', borderRadius: 6 }}>
                    {emoji}
                  </button>
                ))}
                <div style={{ width: .5, alignSelf: 'stretch', background: '#E2E8F0', margin: '0 3px' }} />
                <button onClick={() => { onReply(); setShowActions(false) }} aria-label="Reply"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5568', padding: '3px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-corner-up-right" style={{ fontSize: 17 }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Reply</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────
// One tick = stored on the server. Two grey = every recipient has been
// online since it was sent. Two blue = every recipient has actually read it.
// A recipient who has switched read receipts off is never counted as having
// read, so their blue tick simply never appears — same as WhatsApp.
function Ticks({ receipt }: { receipt?: { delivered_count: number; read_count: number; total_recipients: number } }) {
  const total = receipt?.total_recipients ?? 0
  const read = (receipt?.read_count ?? 0) >= total && total > 0
  const delivered = (receipt?.delivered_count ?? 0) >= total && total > 0
  const colour = read ? '#4FC3F7' : 'rgba(255,255,255,.55)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, verticalAlign: 'middle' }}
          title={read ? 'Read' : delivered ? 'Delivered' : 'Sent'}>
      <svg width={delivered || read ? 16 : 11} height="11" viewBox={delivered || read ? '0 0 16 11' : '0 0 11 11'} fill="none">
        <path d={delivered || read ? 'M1 5.5L4 8.5L9.5 2' : 'M1 5.5L4 8.5L9.5 2'}
              stroke={colour} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {(delivered || read) && (
          <path d="M6.5 5.5L9.5 8.5L15 2" stroke={colour} strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  )
}

function groupByDate(messages: any[]) {
  const groups: Record<string, any[]> = {}
  messages.forEach(msg => {
    const date = new Date(msg.created_at)
    const now  = new Date()
    const diff = now.getTime() - date.getTime()
    let label: string
    if (diff < 86400000 && date.getDate() === now.getDate()) label = 'Today'
    else if (diff < 172800000) label = 'Yesterday'
    else label = formatDayNameLong(date)
    if (!groups[label]) groups[label] = []
    groups[label].push(msg)
  })
  return groups
}

function renderContent(content: string) {
  // Bold: *text*, mention: @Name
  const parts = content.split(/(@\w+|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@'))
      return <strong key={i} style={{ color: '#C8A96E' }}>{part}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <strong key={i}>{part.slice(1, -1)}</strong>
    return part
  })
}

// Prefer the people actually chosen from the picker; fall back to typed text
// only when it matches exactly one member of this conversation.
function resolveMentions(
  content: string,
  picked: { id: string; label: string }[],
  candidates: any[],
): string[] {
  const ids = new Set<string>()
  picked.forEach(p => {
    if (new RegExp(`@${p.label}\\b`, 'i').test(content)) ids.add(p.id)
  })
  ;(content.match(/@(\w+)/g) ?? []).forEach(m => {
    const name = m.slice(1).toLowerCase()
    const hits = candidates.filter(e => e.full_name_en.split(' ')[0].toLowerCase() === name)
    if (hits.length === 1) ids.add(hits[0].id)   // ambiguous → trust the picker instead
  })
  return [...ids]
}
