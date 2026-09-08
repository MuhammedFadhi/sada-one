import { useState } from 'react'
import { useFeatureFlags, useSetFeatureFlag } from '@/hooks/useData'
import { StatusBar, PageContent, SkeletonList } from '@/components/ui'
import { FEATURES, TOGGLE_ROLES, ROLE_LABEL } from '@/lib/features'
import toast from 'react-hot-toast'

export function FeatureFlagsPage() {
  const { data: flags, isLoading } = useFeatureFlags()
  const setFlag = useSetFeatureFlag()
  const [busy, setBusy] = useState<string | null>(null)

  const isOn = (role: string, key: string) => {
    const row = flags?.find(f => f.role === role && f.feature_key === key)
    return row ? row.enabled : true
  }
  const toggle = async (role: string, key: string) => {
    const next = !isOn(role, key)
    setBusy(role + key)
    try { await setFlag.mutateAsync({ role, feature_key: key, enabled: next }) }
    catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setBusy(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 14 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0' }}>
          <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Features & Access</h1>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 2 }}>Turn features on or off per role. Changes apply instantly.</p>
        </div>
      </div>

      <PageContent>
        {isLoading && <SkeletonList />}
        {!isLoading && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 380 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, background: '#F7FAFC', zIndex: 1 }}>Feature</th>
                  {TOGGLE_ROLES.map(r => <th key={r} style={th}>{ROLE_LABEL[r]}</th>)}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={f.key} style={{ background: i % 2 ? '#FBFDFF' : 'white' }}>
                    <td style={{ ...td, textAlign: 'left', position: 'sticky', left: 0, background: i % 2 ? '#FBFDFF' : 'white', fontWeight: 600, color: '#1A202C' }}>
                      <i className={`ti ti-${f.icon}`} style={{ color: '#17B8D0', marginRight: 6 }} />{f.label}
                    </td>
                    {TOGGLE_ROLES.map(role => {
                      const on = isOn(role, f.key)
                      const loading = busy === role + f.key
                      return (
                        <td key={role} style={td}>
                          <button onClick={() => toggle(role, f.key)} disabled={loading}
                            aria-label={`${f.label} for ${ROLE_LABEL[role]}`}
                            style={{ width: 40, height: 23, borderRadius: 12, border: 'none', background: on ? '#1D9E75' : '#CBD5E0', position: 'relative', cursor: 'pointer', opacity: loading ? .5 : 1, transition: 'background .15s' }}>
                            <span style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: '50%', background: 'white', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.3)' }} />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ fontSize: 11, color: '#A0AEC0', marginTop: 14 }}>
          Disabling a feature hides it from that role's navigation and blocks the page if opened directly. Admin retains full access.
        </p>
      </PageContent>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 8px', fontSize: 11, fontWeight: 700, color: '#475569', textAlign: 'center', borderBottom: '1px solid #E2E8F0', background: '#F7FAFC' }
const td: React.CSSProperties = { padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }
