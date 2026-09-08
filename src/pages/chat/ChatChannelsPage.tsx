// ============================================================
// SA'DA ONE — Messages: Chats · Groups · People
//
// Groups behave like WhatsApp groups, not Slack channels:
//   • a group is private to its members — there is no public/private
//     choice and no "browse and join" directory
//   • you pick the members when you create it
//   • the name is free text: capitals, spaces and duplicates are fine
//     (groups are identified by id, never by name)
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatChannels, useCreateChannel, useEmployees, useCreateDM, useChatChannelsRealtime } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, Avatar, SearchBar, BottomSheet, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDayMonth, formatTime } from '@/lib/dates'

// Module scope on purpose: a component declared inside render gets a new
// identity every render, so React unmounts and remounts its whole subtree.
function GroupIcon({ size = 42 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 3, background: '#EBF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <i className="ti ti-users" style={{ color: '#17B8D0', fontSize: size * 0.46 }} />
    </div>
  )
}

export function ChatChannelsPage() {
  const navigate    = useNavigate()
  const { profile } = useAuthStore()
  useChatChannelsRealtime()
  const { data: myChannels, isLoading } = useChatChannels()
  const { data: employees }             = useEmployees({ status: 'active' })
  const createChannel = useCreateChannel()
  const createDM      = useCreateDM()

  const [search, setSearch] = useState('')
  const [tab, setTabState] = useState<'chats' | 'groups' | 'people'>(() => {
    const saved = localStorage.getItem('sada-chat-tab')
    return saved === 'groups' || saved === 'people' || saved === 'chats' ? saved : 'chats'
  })
  const setTab = (t: 'chats' | 'groups' | 'people') => {
    setTabState(t); localStorage.setItem('sada-chat-tab', t)
  }

  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [form, setForm] = useState({ name: '', description: '', member_ids: [] as string[] })

  const q = search.toLowerCase()
  const isGroup = (c: any) => c.type !== 'direct'

  const conversations = (myChannels ?? []).filter((c: any) =>
    !q || (c.name ?? '').toLowerCase().includes(q))
  const myGroups = (myChannels ?? []).filter((c: any) =>
    isGroup(c) && (!q || (c.name ?? '').toLowerCase().includes(q)))

  const selectable = (employees ?? []).filter(e => e.id !== profile?.employee_id)
  const filteredPeople = selectable.filter(e => e.full_name_en.toLowerCase().includes(q))

  const handleStartDM = async (employeeId: string) => {
    try { navigate(`/chat/${(await createDM.mutateAsync(employeeId)).id}`) }
    catch { toast.error('Failed to open conversation') }
  }

  const handleCreateGroup = async () => {
    if (!form.name.trim()) return toast.error('Give the group a name')
    if (!form.member_ids.length) return toast.error('Add at least one member')
    try {
      // 'private' = members only. Every group is member-only, like WhatsApp.
      const channel = await createChannel.mutateAsync({ ...form, name: form.name.trim(), type: 'private' })
      setNewGroupOpen(false)
      setForm({ name: '', description: '', member_ids: [] })
      setMemberSearch('')
      navigate(`/chat/${channel.id}`)
    } catch { toast.error('Failed to create group') }
  }

  const getDMPartner = (channel: any) => {
    if (channel.type !== 'direct') return null
    const other = (channel.members ?? []).find((m: any) => m.employee_id !== profile?.employee_id)
    return employees?.find(e => e.id === other?.employee_id)
  }
  const getUnread = (channel: any) => {
    const mine = channel.members?.find((m: any) => m.employee_id === profile?.employee_id)
    if (!mine || !channel.last_message_at) return 0
    return new Date(channel.last_message_at) > new Date(mine.last_read_at ?? 0) ? 1 : 0
  }
  const memberCount = (c: any) => (c.members ?? []).length


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#17294A', paddingBottom: 12 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Messages</h1>
          <button onClick={() => { setTab('groups'); setMemberSearch(''); setNewGroupOpen(true) }} title="New group"
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: '7px 10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <i className="ti ti-users-plus" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div style={{ display: 'flex', padding: '10px 14px 0', gap: 0 }}>
          {[{ key: 'chats', label: 'Chats' }, { key: 'groups', label: 'Groups' }, { key: 'people', label: 'People' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{ flex: 1, padding: '7px 0', background: 'none', border: 'none', cursor: 'pointer', color: tab === t.key ? 'white' : 'rgba(255,255,255,.4)', fontSize: 13, fontWeight: tab === t.key ? 600 : 400, borderBottom: `2px solid ${tab === t.key ? '#C8A96E' : 'transparent'}`, fontFamily: 'inherit', transition: 'all .15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#F4F6F9', padding: '10px 14px' }}>
        <SearchBar value={search} onChange={setSearch}
          placeholder={tab === 'people' ? 'Search people...' : tab === 'groups' ? 'Search groups...' : 'Search...'} />

        {/* ── CHATS: everything, DMs and groups together ── */}
        {tab === 'chats' && (<>
          {isLoading && <SkeletonList />}
          {!isLoading && !conversations.length && (
            <div style={{ textAlign: 'center', padding: 32, color: '#718096' }}>
              <i className="ti ti-message-off" style={{ fontSize: 36, color: '#CBD5E0', display: 'block', marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>No conversations yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Message someone from People, or create a group</p>
            </div>
          )}
          {conversations.map((c: any) => {
            const dm = c.type === 'direct'
            const partner = dm ? getDMPartner(c) : null
            const unread = getUnread(c)
            const title = dm ? (partner?.full_name_en ?? 'Direct Message') : (c.name ?? 'Group')
            const sub = dm ? (partner?.job_title_en ?? '') : `${memberCount(c)} members`
            return (
              <button key={c.id} onClick={() => navigate(`/chat/${c.id}`)}
                style={{ width: '100%', background: 'white', borderRadius: 12, padding: '12px 14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, boxShadow: '0 1px 4px rgba(0,0,0,.06)', textAlign: 'left' }}>
                {dm && partner ? <Avatar name={partner.full_name_en} size={42} /> : <GroupIcon />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: unread ? 700 : 500, color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{title}</span>
                    <span style={{ fontSize: 10, color: '#CBD5E0', flexShrink: 0 }}>
                      {c.last_message_at ? formatMessageTime(c.last_message_at) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {c.last_message ?? sub}
                    </span>
                    {unread > 0 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#17B8D0', flexShrink: 0, marginLeft: 8 }} />}
                  </div>
                </div>
              </button>
            )
          })}
        </>)}

        {/* ── GROUPS: only the groups I'm in ── */}
        {tab === 'groups' && (<>
          <button onClick={() => { setMemberSearch(''); setNewGroupOpen(true) }}
            style={{ width: '100%', background: 'white', borderRadius: 12, padding: '12px 14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,.06)', textAlign: 'left' }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: '#17B8D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-users-plus" style={{ color: 'white', fontSize: 20 }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A202C' }}>New group</span>
          </button>

          {isLoading && <SkeletonList />}
          {!isLoading && !myGroups.length && (
            <div style={{ textAlign: 'center', padding: 28, color: '#718096' }}>
              <i className="ti ti-users" style={{ fontSize: 34, color: '#CBD5E0', display: 'block', marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>You're not in any groups yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Create one and choose who's in it</p>
            </div>
          )}
          {myGroups.map((c: any) => (
            <button key={c.id} onClick={() => navigate(`/chat/${c.id}`)}
              style={{ width: '100%', background: 'white', borderRadius: 12, padding: '12px 14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, boxShadow: '0 1px 4px rgba(0,0,0,.06)', textAlign: 'left' }}>
              <GroupIcon />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name ?? 'Group'}</div>
                <div style={{ fontSize: 11.5, color: '#718096', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {memberCount(c)} members{c.description ? ` · ${c.description}` : ''}
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ color: '#CBD5E0', fontSize: 18 }} />
            </button>
          ))}
        </>)}

        {/* ── PEOPLE ── */}
        {tab === 'people' && (<>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', letterSpacing: '.5px', marginBottom: 8 }}>COLLEAGUES</div>
          {filteredPeople.map(emp => (
            <button key={emp.id} onClick={() => handleStartDM(emp.id)}
              style={{ width: '100%', background: 'white', borderRadius: 12, padding: '12px 14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, boxShadow: '0 1px 4px rgba(0,0,0,.06)', textAlign: 'left' }}>
              <Avatar name={emp.full_name_en} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A202C' }}>{emp.full_name_en}</div>
                <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>{emp.job_title_en}{emp.division?.name_en ? ` · ${emp.division.name_en}` : ''}</div>
              </div>
              <i className="ti ti-message-circle" style={{ color: '#17B8D0', fontSize: 18 }} />
            </button>
          ))}
        </>)}
      </div>

      {/* ── New group ── */}
      <BottomSheet open={newGroupOpen} onClose={() => setNewGroupOpen(false)} title="New Group">
        <div>
          <div className="form-label">Group name</div>
          <input className="input" placeholder="e.g. Dammam Site Team" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ marginBottom: 12 }} />

          <div className="form-label">Description (optional)</div>
          <input className="input" placeholder="What's this group for?" value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ marginBottom: 14 }} />

          <div className="form-label">
            Members <span style={{ color: '#A0AEC0', fontWeight: 400 }}>· {form.member_ids.length} selected</span>
          </div>
          <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search people..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 13, marginBottom: 6, fontFamily: 'inherit', background: '#fff' }} />
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10, background: '#FAFBFC', padding: 4, marginBottom: 16 }}>
            {(() => {
              const ms = memberSearch.trim().toLowerCase()
              // people already ticked stay visible so a search can't hide a selection
              const list = selectable.filter(e =>
                form.member_ids.includes(e.id) || !ms ||
                (e.full_name_en ?? '').toLowerCase().includes(ms) ||
                (e.job_title_en ?? '').toLowerCase().includes(ms))
              return list.length ? list.map(emp => {
                const on = form.member_ids.includes(emp.id)
                return (
                  <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px', cursor: 'pointer', fontSize: 13, borderRadius: 8, background: on ? '#EBF8FF' : 'transparent' }}>
                    <input type="checkbox" checked={on} style={{ accentColor: '#17B8D0', width: 15, height: 15 }}
                      onChange={() => setForm(p => ({
                        ...p,
                        member_ids: on ? p.member_ids.filter(x => x !== emp.id) : [...p.member_ids, emp.id],
                      }))} />
                    <Avatar name={emp.full_name_en} size={24} />
                    <span style={{ flex: 1, minWidth: 0, color: on ? '#1A202C' : '#4A5568', fontWeight: on ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.full_name_en}
                      {emp.job_title_en && <span style={{ color: '#A0AEC0', fontWeight: 400 }}> · {emp.job_title_en}</span>}
                    </span>
                  </label>
                )
              }) : <div style={{ fontSize: 12, color: '#718096', padding: 8 }}>No one matches that search</div>
            })()}
          </div>

          <button onClick={handleCreateGroup} disabled={createChannel.isPending}
            style={{ width: '100%', background: '#17B8D0', color: 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: createChannel.isPending ? .7 : 1 }}>
            {createChannel.isPending ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

function formatMessageTime(iso: string) {
  const d = new Date(iso), now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return formatTime(d)
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return formatDayMonth(d)
}
