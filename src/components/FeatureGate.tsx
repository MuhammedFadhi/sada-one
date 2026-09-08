import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeatureEnabled } from '@/hooks/useData'
import { StatusBar, PageContent, EmptyState } from '@/components/ui'

/** Blocks a route if the named feature is disabled for the current role. */
export function FeatureGate({ feature, children }: { feature: string; children: ReactNode }) {
  const enabled = useFeatureEnabled(feature)
  const navigate = useNavigate()
  if (enabled) return <>{children}</>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 14 }}><StatusBar /></div>
      <PageContent>
        <EmptyState icon="lock" title="Feature unavailable" subtitle="This feature has been turned off for your role by an administrator." />
        <button onClick={() => navigate('/')} style={{ width: '100%', marginTop: 12, background: '#17294A', color: 'white', border: 'none', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Go home</button>
      </PageContent>
    </div>
  )
}
