import { usePendingApprovals } from '@/hooks/useData'
import { StatusBar, PageContent } from '@/components/ui'
import { ApprovalsQueue } from '@/components/ApprovalsQueue'

export function ApprovalsPage() {
  const { data: approvals } = usePendingApprovals()
  const total = (approvals?.leave?.length ?? 0) + (approvals?.loans?.length ?? 0)
    + (approvals?.exit?.length ?? 0) + (approvals?.expenses?.length ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 16 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Approvals</h1>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>Stage 1 of 2 — your approval sends it to HR & Finance</p>
          </div>
          {total > 0 && <span style={{ background: '#E24B4A', color: 'white', borderRadius: 10, fontSize: 11, fontWeight: 700, padding: '3px 9px' }}>{total}</span>}
        </div>
      </div>
      <PageContent>
        <ApprovalsQueue />
      </PageContent>
    </div>
  )
}
