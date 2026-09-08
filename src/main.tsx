import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { initOfflineQueue } from './lib/offlineQueue'
import './styles/globals.css'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'

// Replay any attendance/leave writes that were queued while offline.
initOfflineQueue()

// Reveal icon glyphs only once the Tabler webfont has actually loaded.
// Before that the browser substitutes a fallback and PUA/CJK-block codepoints
// render as tofu boxes or Chinese characters — the "broken icons" report.
const markFontsReady = () => document.documentElement.classList.add('fonts-ready')
if (document.fonts?.status === 'loaded') markFontsReady()
else document.fonts?.ready.then(markFontsReady).catch(markFontsReady)

// autoUpdate + skipWaiting/clientsClaim (see vite.config) means a new SW takes
// control immediately. We also poll so an always-open installed PWA still picks
// up new builds, and reload once the fresh SW is controlling to avoid stale UI.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { updateSW(true) },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => { registration.update().catch(() => {}) }, 60_000)
    }
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
