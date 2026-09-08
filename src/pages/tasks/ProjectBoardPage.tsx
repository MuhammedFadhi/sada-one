// ============================================================
// SA'DA ONE — Kanban Board (Project View)
// ============================================================
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTasks, useUpdateTask, useCreateTask, useTasksRealtime } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, TopBar, BottomSheet, Avatar } from '@/components/ui'
import { PRIORITY_META, STATUS_META, TaskCard } from './TasksHomePage'
import toast from 'react-hot-toast'
import { formatDayMonth } from '@/lib/dates'

const COLUMNS = [
  { key: 'todo',        label: 'To Do'       },
  { key: 'in_progress', label: 'In Progress'  },
  { key: 'in_review',   label: 'In Review'   },
  { key: 'done',        label: 'Done'         },
]

export function ProjectBoardPage() {
  useTasksRealtime()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: tasks } = useTasks({ project_id: id })
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const { profile } = useAuthStore()

  const [view, setView]     = useState<'kanban' | 'list'>('list')
  const [addOpen, setAddOpen] = useState<string | null>(null) // column key
  const [newTitle, setNewTitle] = useState('')

  const byStatus = (status: string) => tasks?.filter((t: any) => t.status === status) ?? []

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { status: newStatus } })
      toast.success(`Moved to ${STATUS_META[newStatus]?.label}`)
    } catch { toast.error('Failed to update') }
  }

  const handleQuickAdd = async (status: string) => {
    if (!newTitle.trim()) return
    try {
      await createTask.mutateAsync({
        title: newTitle,
        project_id: id,
        priority: 'normal',
      })
      toast.success('Task added')
      setNewTitle('')
      setAddOpen(null)
    } catch { toast.error('Failed to create task') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F4F6F9' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 12 }}>
        <StatusBar />
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <TopBar onBack={() => navigate('/tasks')} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setView('list')}
              style={{ background: view === 'list' ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
              <i className="ti ti-list" style={{ color: 'white', fontSize: 16 }} />
            </button>
            <button onClick={() => setView('kanban')}
              style={{ background: view === 'kanban' ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
              <i className="ti ti-layout-columns" style={{ color: 'white', fontSize: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          {COLUMNS.map(col => {
            const colTasks = byStatus(col.key)
            const sm = STATUS_META[col.key]
            return (
              <div key={col.key} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sm.color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#718096', letterSpacing: '.5px' }}>
                      {col.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, background: sm.bg, color: sm.color, borderRadius: 10, padding: '1px 6px', fontWeight: 600 }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <button onClick={() => setAddOpen(col.key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E0', fontSize: 16, display: 'flex' }}>
                    <i className="ti ti-plus" />
                  </button>
                </div>
                {colTasks.map((t: any) => (
                  <TaskCard key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />
                ))}
                {colTasks.length === 0 && (
                  <div style={{ padding: '12px 0', textAlign: 'center', color: '#CBD5E0', fontSize: 12 }}>
                    No tasks here
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* KANBAN VIEW (horizontal scroll) */}
      {view === 'kanban' && (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: 10, padding: 14 }}>
          {COLUMNS.map(col => {
            const colTasks = byStatus(col.key)
            const sm = STATUS_META[col.key]
            return (
              <div key={col.key} style={{ flexShrink: 0, width: 240, display: 'flex', flexDirection: 'column', background: '#EAECF0', borderRadius: 14, padding: 10, maxHeight: '100%' }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: sm.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#4A5568', flex: 1 }}>{col.label}</span>
                  <span style={{ fontSize: 10, background: sm.bg, color: sm.color, borderRadius: 8, padding: '1px 6px', fontWeight: 700 }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {colTasks.map((t: any) => (
                    <KanbanCard key={t.id} task={t}
                      onOpen={() => navigate(`/tasks/${t.id}`)}
                      onMove={(status: string) => handleStatusChange(t.id, status)} />
                  ))}
                </div>

                {/* Add card */}
                <button onClick={() => setAddOpen(col.key)}
                  style={{ width: '100%', background: 'rgba(0,0,0,.05)', border: '1.5px dashed #CBD5E0', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#718096', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 }}>
                  <i className="ti ti-plus" /> Add task
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick add sheet */}
      <BottomSheet open={!!addOpen} onClose={() => setAddOpen(null)} title={`Add to ${STATUS_META[addOpen ?? 'todo']?.label}`}>
        <div>
          <div className="form-label">Task Title</div>
          <input className="input" placeholder="Task title" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickAdd(addOpen!)}
            style={{ marginBottom: 14 }} autoFocus />
          <button onClick={() => handleQuickAdd(addOpen!)}
            style={{ width: '100%', background: '#17B8D0', color: 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Add Task
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

// ── Kanban Card ───────────────────────────────────────────
function KanbanCard({ task, onOpen, onMove }: { task: any; onOpen: () => void; onMove: (s: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.normal
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div style={{ background: 'white', borderRadius: 10, padding: 10, marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.08)', borderLeft: isOverdue ? '3px solid #E24B4A' : `3px solid ${pm.color}` }}>
      <div onClick={onOpen} style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1A202C', lineHeight: 1.4 }}>{task.title}</div>
        {task.due_date && (
          <div style={{ fontSize: 10, color: isOverdue ? '#E24B4A' : '#718096', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-calendar" style={{ fontSize: 10 }} />
            {formatDayMonth(task.due_date + 'T00:00')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {task.assignee
          ? <Avatar name={task.assignee.full_name_en} size={20} />
          : <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F0F0F0', border: '1.5px dashed #CBD5E0' }} />
        }
        {/* Move menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E0', padding: 2 }}>
            <i className="ti ti-dots" style={{ fontSize: 14 }} />
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', bottom: 24, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,.12)', padding: 4, zIndex: 10, minWidth: 130 }}
              onClick={e => e.stopPropagation()}>
              {COLUMNS.filter(c => c.key !== task.status).map(c => (
                <button key={c.key} onClick={() => { onMove(c.key); setMenuOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#1A202C', borderRadius: 6, textAlign: 'left' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_META[c.key].color }} />
                  Move to {c.label}
                </button>
              ))}
              <button onClick={() => { onOpen(); setMenuOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#718096', borderRadius: 6, textAlign: 'left', borderTop: '0.5px solid #F0F0F0', marginTop: 2 }}>
                <i className="ti ti-external-link" style={{ fontSize: 12 }} />
                Open task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
