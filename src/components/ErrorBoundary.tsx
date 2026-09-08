import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

const CHUNK_RE = /dynamically imported module|Loading chunk|Importing a module script failed|ChunkLoadError/i

/**
 * App-level error boundary.
 * - Stale-chunk recovery: after a deploy, an installed PWA may hold an old
 *   index that requests chunk hashes which now 404. We reload once (guarded
 *   against loops) to pull fresh assets.
 * - Otherwise shows a branded fallback with a manual reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (CHUNK_RE.test(error.message)) {
      const KEY = 'sada-chunk-reloaded'
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, '1')
        window.location.reload()
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        height: '100dvh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0D1B2A', padding: 24, textAlign: 'center',
      }}>
        <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'rgba(226,75,74,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-alert-triangle" style={{ color: '#E24B4A', fontSize: 28 }} />
          </div>
          <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, lineHeight: 1.5 }}>
            The app hit an unexpected error. Reloading usually fixes it.
          </div>
          <button
            onClick={() => { sessionStorage.removeItem('sada-chunk-reloaded'); window.location.reload() }}
            style={{
              marginTop: 4, background: '#17B8D0', color: 'white', border: 'none', borderRadius: 12,
              padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
