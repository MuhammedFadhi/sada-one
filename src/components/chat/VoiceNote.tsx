// ============================================================
// SA'DA ONE — Voice notes: recorder hook + playback bubble
// iOS Safari records audio/mp4 (AAC); Chrome/Android audio/webm (Opus).
// Both formats play back cross-platform on 2024+ browsers.
// ============================================================
import { useState, useRef, useEffect } from 'react'

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  // Order matters. Chrome NOW reports audio/mp4 as supported, so listing mp4
  // first meant Chrome/Android recorded MP4 — the opposite of this file's
  // intent, and a far less battle-tested path than Opus/WebM.
  // Safari is the only engine that needs mp4, so ask for WebM first and let
  // Safari fall through to mp4.
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)
  const order = isSafari
    ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const m of order) if (MediaRecorder.isTypeSupported(m)) return m
  return ''
}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recRef    = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastErrorRef = useRef<string>('')

  const cleanup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    recRef.current = null
    setRecording(false)
  }

  const start = async (): Promise<boolean> => {
    try {
      if (typeof MediaRecorder === 'undefined') throw new Error('unsupported-browser')
      if (!navigator.mediaDevices?.getUserMedia) {
        // getUserMedia is undefined on insecure origins — a common silent failure
        throw new Error(window.isSecureContext ? 'unsupported-browser' : 'insecure-context')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.start(250)
      recRef.current = rec
      setSeconds(0)
      setRecording(true)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
      return true
    } catch (err: any) {
      cleanup()
      lastErrorRef.current =
        err?.name === 'NotAllowedError'  ? 'Microphone permission was denied. Allow it in your browser settings.'
      : err?.name === 'NotFoundError'    ? 'No microphone found on this device.'
      : err?.message === 'insecure-context'   ? 'Voice notes need a secure (https) connection.'
      : err?.message === 'unsupported-browser'? 'This browser cannot record audio.'
      : `Could not start recording (${err?.name ?? 'unknown error'}).`
      return false
    }
  }

  /** Stops recording; resolves with the blob + mime + duration (null if cancelled/empty). */
  const stop = (): Promise<{ blob: Blob; mime: string; duration: number } | null> =>
    new Promise(resolve => {
      const rec = recRef.current
      const dur = seconds
      if (!rec || rec.state === 'inactive') { cleanup(); resolve(null); return }
      rec.onstop = () => {
        const mime = rec.mimeType || pickMime() || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mime })
        cleanup()
        resolve(blob.size > 0 ? { blob, mime, duration: dur } : null)
      }
      rec.stop()
    })

  const cancel = () => {
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop() }
    cleanup()
  }

  useEffect(() => () => cancel(), []) // unmount safety
  return { recording, seconds, start, stop, cancel, lastError: () => lastErrorRef.current }
}

export function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Playback bubble ─────────────────────────────────────────
export function VoicePlayer({ url, isMe, label }: { url: string; isMe: boolean; label?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying]   = useState(false)
  const [progress, setProgress] = useState(0)   // 0..1
  const [dur, setDur]           = useState(0)

  useEffect(() => {
    const a = new Audio(url)
    a.preload = 'metadata'
    audioRef.current = a
    const onTime = () => { if (a.duration && isFinite(a.duration)) setProgress(a.currentTime / a.duration) }
    const onMeta = () => { if (isFinite(a.duration)) setDur(Math.round(a.duration)) }
    const onEnd  = () => { setPlaying(false); setProgress(0) }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    return () => { a.pause(); a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('ended', onEnd) }
  }, [url])

  // Fall back to the duration encoded in the label ("Voice note (0:12)")
  const labelDur = label?.match(/\((\d+):(\d\d)\)/)
  const shownDur = dur || (labelDur ? Number(labelDur[1]) * 60 + Number(labelDur[2]) : 0)

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  }

  const fg    = isMe ? 'white' : '#17294A'
  const sub   = isMe ? 'rgba(255,255,255,.7)' : '#718096'
  const track = isMe ? 'rgba(255,255,255,.3)' : '#E2E8F0'
  const fill  = isMe ? 'white' : '#17B8D0'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, padding: '2px 0' }}>
      <button onClick={toggle} aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
          background: isMe ? 'rgba(255,255,255,.25)' : '#EBF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`ti ti-player-${playing ? 'pause' : 'play'}-filled`} style={{ fontSize: 15, color: isMe ? 'white' : '#17B8D0' }} />
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 3, borderRadius: 2, background: track, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${progress * 100}%`, background: fill, borderRadius: 2, transition: 'width .2s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 10, color: sub }}><i className="ti ti-microphone" style={{ fontSize: 10 }} /> Voice note</span>
          <span style={{ fontSize: 10, color: fg, fontWeight: 600 }}>{fmtDur(shownDur)}</span>
        </div>
      </div>
    </div>
  )
}
