import { StatusBar } from '@/components/ui'
import { HeaderActions } from '@/components/HeaderActions'

/**
 * Shared dark-header title row for role dashboards.
 * Renders StatusBar + label/title + HeaderActions (bell + logout).
 * The role page keeps its own outer dark wrapper (backgrounds/extra tiles vary).
 */
export function DashHeader({ label, title, variant }: {
  label: string
  title: React.ReactNode
  variant?: 'admin'
}) {
  const isAdmin = variant === 'admin'
  return (
    <>
      <StatusBar />
      <div style={{ padding: isAdmin ? '4px 16px 0' : '4px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: isAdmin ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.45)', fontSize: isAdmin ? 11 : 12, marginBottom: 2 }}>{label}</p>
          <h1 style={{ color: 'white', fontSize: isAdmin ? 20 : 19, fontWeight: 700 }}>{title}</h1>
        </div>
        <HeaderActions />
      </div>
    </>
  )
}
