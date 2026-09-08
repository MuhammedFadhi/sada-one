// ============================================================
// Task History — completed, still open, and deleted tasks.
// Deletion is a soft delete (migration 039), so removed tasks
// remain here and can be restored.
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBar, PageContent, Tabs, EmptyState, Avatar, SkeletonList, formatDate } from '@/components/ui'
import { useTaskHistory, useRestoreTask } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { statusLabel } from '@/lib/labels'
import toast from 'react-hot-toast'

type Filter = 'all' | 'completed' | 'open' | 'deleted'

export default function TaskHistoryPage() {
  const navigate = useNavigate()
  const { role } = useAuthStore()
  const [filter, setFilter] = useState<Filter>('all')
  const { data: tasks, isLoading } = useTaskHistory(filter)
  const restore = useRestoreTask()
  const canRestore = role === 'admin' || role === 'manager' || role === 'hr_officer'

  const tone = (t: any) =>
    t.deleted_at ? { bg: '#FFF0F0', fg: '#E24B4A', label: 'Deleted' }
    : t.status === 'done' ? { bg: '#E6FAF0', fg: '#1D9E75', label: 'Completed' }
    : { bg: '#EBF8FF', fg: '#17B8D0', label: statusLabel(t.status) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 16 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <i className="ti ti-chevron-left" style={{ fontSize: 20 }} />
          </button>
          <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700, flex: 1 }}>Task History</h1>
        </div>
      </div>

      <PageContent>
        <Tabs
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
            { key: 'open', label: 'Open' },
            { key: 'deleted', label: 'Deleted' },
          ]}
          active={filter}
          onChange={k => setFilter(k as Filter)}
        />

        {isLoading && <SkeletonList rows={4} />}
        {!isLoading && !tasks?.length && (
          <EmptyState icon="history" title="Nothing here yet"
            subtitle={filter === 'deleted' ? 'No tasks have been deleted.' : 'Tasks will show up here as they progress.'} />
        )}

        {tasks?.map((t: any) => {
          const c = tone(t)
          const people = (t.assignees ?? []).map((a: any) => a.employee).filter(Boolean)
          return (
            <div key={t.id}
              style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,.06)', opacity: t.deleted_at ? .78 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1A202C', textDecoration: t.deleted_at ? 'line-through' : 'none' }}>
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                    <span className="badge" style={{ background: c.bg, color: c.fg, fontSize: 9 }}>{c.label}</span>
                    {t.project?.name && (
                      <span className="badge" style={{ background: '#F4F6F9', color: '#718096', fontSize: 9 }}>{t.project.name}</span>
                    )}
                    {t.due_date && (
                      <span style={{ fontSize: 10.5, color: '#A0AEC0' }}>due {formatDate(t.due_date)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#718096', marginTop: 7, lineHeight: 1.5 }}>
                    {t.reporter?.full_name_en && <>Raised by {t.reporter.full_name_en}</>}
                    {people.length > 0 && <> · Assigned to {people.map((p: any) => p.full_name_en).join(', ')}</>}
                    {t.deleted_at && (
                      <> · Deleted {formatDate(t.deleted_at)}{t.deleter?.full_name_en ? ` by ${t.deleter.full_name_en}` : ''}</>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  {people.slice(0, 3).map((p: any) => <Avatar key={p.id} name={p.full_name_en} size={26} />)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {!t.deleted_at && (
                  <button onClick={() => navigate(`/tasks/${t.id}`)}
                    style={{ flex: 1, background: '#F4F6F9', border: 'none', borderRadius: 9, padding: 9, fontSize: 12, fontWeight: 600, color: '#4A5568', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Open
                  </button>
                )}
                {t.deleted_at && canRestore && (
                  <button
                    onClick={async () => {
                      try { await restore.mutateAsync(t.id); toast.success('Task restored') }
                      catch { toast.error('Could not restore task') }
                    }}
                    style={{ flex: 1, background: '#E6FAF0', border: 'none', borderRadius: 9, padding: 9, fontSize: 12, fontWeight: 600, color: '#1D9E75', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <i className="ti ti-arrow-back-up" /> Restore
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </PageContent>
    </div>
  )
}
