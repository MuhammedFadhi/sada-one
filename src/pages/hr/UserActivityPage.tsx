// ============================================================
// Users & Activity — HR / Finance / Admin
// Who has an account, who is online now, and when everyone was last seen.
// Access is enforced by get_user_directory() server-side: any other role
// receives an empty set, so hiding the nav entry is not the control.
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBar, PageContent, SearchBar, Avatar, EmptyState, SkeletonList, Tabs } from '@/components/ui'
import { useUserDirectory, usePresenceHeartbeat } from '@/hooks/useData'
import { roleLabel } from '@/lib/labels'
import { formatDateTime, formatRelative } from '@/lib/dates'

type Filter = 'all' | 'online' | 'never'

export default function UserActivityPage() {
  const navigate = useNavigate()
  usePresenceHeartbeat()
  const { data: users, isLoading } = useUserDirectory()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const q = search.toLowerCase()
  const rows = (users ?? []).filter((u: any) => {
    if (q && !(`${u.full_name_en} ${u.work_email} ${u.job_title_en ?? ''}`.toLowerCase().includes(q))) return false
    if (filter === 'online') return u.is_online
    if (filter === 'never')  return !u.last_login_at
    return true
  })

  const onlineCount = (users ?? []).filter((u: any) => u.is_online).length
  const neverCount  = (users ?? []).filter((u: any) => !u.last_login_at).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 14 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0' }}>
          <h1 style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Users &amp; Activity</h1>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 2 }}>
            {users?.length ?? 0} accounts · <span style={{ color: '#4ADE80' }}>{onlineCount} online now</span>
            {neverCount > 0 && <> · {neverCount} never signed in</>}
          </p>
        </div>
      </div>

      <PageContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search people..." />
        <Tabs
          tabs={[
            { key: 'all',    label: `All (${users?.length ?? 0})` },
            { key: 'online', label: `Online (${onlineCount})` },
            { key: 'never',  label: `Never signed in (${neverCount})` },
          ]}
          active={filter}
          onChange={k => setFilter(k as Filter)}
        />

        {isLoading && <SkeletonList rows={6} />}
        {!isLoading && !rows.length && (
          <EmptyState icon="users" title="Nobody here"
            subtitle={filter === 'online' ? 'No one is using the app right now.' : 'Try a different search.'} />
        )}

        {rows.map((u: any) => (
          <button key={u.employee_id}
            onClick={() => u.employee_id && navigate(`/hr/employees/${u.employee_id}`)}
            style={{ width: '100%', background: 'white', borderRadius: 12, padding: '11px 13px', border: 'none',
                     cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6,
                     boxShadow: '0 1px 4px rgba(0,0,0,.06)', textAlign: 'left' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar name={u.full_name_en} size={40} />
              {/* green dot = seen in the last 2 minutes */}
              <span style={{ position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: '50%',
                             border: '2px solid white', background: u.is_online ? '#22C55E' : '#CBD5E0' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1A202C', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.full_name_en}
              </div>
              <div style={{ fontSize: 11, color: '#718096', marginTop: 2, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.job_title_en || '—'}{u.role && <> · {roleLabel(u.role)}</>}
              </div>
              <div style={{ fontSize: 10.5, marginTop: 3, color: u.is_online ? '#1D9E75' : '#A0AEC0' }}>
                {u.is_online
                  ? 'Online now'
                  : u.last_seen_at
                    ? `Last seen ${formatRelative(u.last_seen_at)}`
                    : u.last_login_at
                      ? `Last login ${formatDateTime(u.last_login_at)}`
                      : 'Never signed in'}
              </div>
            </div>

            {!u.onboarded && (
              <span className="badge" style={{ background: '#FFF3E0', color: '#E67E22', fontSize: 9, flexShrink: 0 }}>
                Setup pending
              </span>
            )}
          </button>
        ))}
      </PageContent>
    </div>
  )
}
