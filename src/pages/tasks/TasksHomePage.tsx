// ============================================================
// SA'DA ONE — Task Manager (Slack-style tasks)
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskProjects, useMyTasks, useCreateTask, useCreateTaskProject, useEmployees, useTasksRealtime, useUpdateTask } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, PageContent, Avatar, BottomSheet, EmptyState, Tabs } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDayMonth } from '@/lib/dates'

const PRIORITY_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  low:    { color: '#CBD5E0', bg: '#F4F6F9', icon: 'flag-2',    label: 'Low'    },
  normal: { color: '#17B8D0', bg: '#EBF8FF', icon: 'flag',      label: 'Normal' },
  high:   { color: '#E67E22', bg: '#FFF3E0', icon: 'flag-3',    label: 'High'   },
  urgent: { color: '#E24B4A', bg: '#FFF0F0', icon: 'flag-exclamation', label: 'Urgent' },
}

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  todo:        { color: '#718096', bg: '#F4F6F9', label: 'To Do'      },
  in_progress: { color: '#17B8D0', bg: '#EBF8FF', label: 'In Progress' },
  in_review:   { color: '#C8A96E', bg: '#FFF8EC', label: 'In Review'  },
  done:        { color: '#1D9E75', bg: '#E6FAF0', label: 'Done'       },
  cancelled:   { color: '#E24B4A', bg: '#FFF0F0', label: 'Cancelled'  },
}

const PROJECT_COLORS = ['#17B8D0','#C8A96E','#1D9E75','#7F77DD','#E67E22','#E24B4A','#17294A']
const PROJECT_ICONS  = ['briefcase','code','chart-bar','users','settings','rocket','star']

export function TasksHomePage() {
  useTasksRealtime()
  const navigate = useNavigate()
  const { role, profile } = useAuthStore()
  const simple = role === 'employee'   // simplified task experience for employees
  const updateTask = useUpdateTask()
  const { data: projects } = useTaskProjects()
  const { data: myTasks  } = useMyTasks()
  const { data: assignableEmployees } = useEmployees({ status: 'active' })
  const createTask    = useCreateTask()
  const createProject = useCreateTaskProject()
  const [tab, setTab]           = useState('my')
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newProjOpen, setNewProjOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [taskForm, setTaskForm] = useState<{ title: string; description: string; priority: string; due_date: string; project_id: string; assignee_ids: string[] }>({ title: '', description: '', priority: 'normal', due_date: '', project_id: '', assignee_ids: [] })
  const [projForm, setProjForm] = useState({ name: '', description: '', color: '#17B8D0', icon: 'briefcase' })

  const overdue = myTasks?.filter((t: any) => t.due_date && new Date(t.due_date) < new Date()) ?? []
  const dueToday = myTasks?.filter((t: any) => {
    if (!t.due_date) return false
    const d = new Date(t.due_date); const n = new Date()
    return d.toDateString() === n.toDateString()
  }) ?? []

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return toast.error('Task title required')
    try {
      await createTask.mutateAsync({
        ...taskForm,
        project_id: taskForm.project_id || undefined,
        // Employees create tasks for themselves (so they land in "My Tasks")
        assignee_id: simple ? profile?.employee_id : (taskForm.assignee_ids[0] ?? undefined),
        assignee_ids: simple ? [profile?.employee_id].filter(Boolean) as string[] : taskForm.assignee_ids,
      })
      toast.success('Task created')
      setNewTaskOpen(false)
      setTaskForm({ title: '', description: '', priority: 'normal', due_date: '', project_id: '', assignee_ids: [] })
      setAssigneeSearch('')
    } catch { toast.error('Failed to create task') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ background: '#0D1B2A', paddingBottom: 16 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Tasks</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {!simple && <button onClick={() => setNewProjOpen(true)}
              style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,.7)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-folder-plus" style={{ fontSize: 15 }} />
            </button>}
            <button onClick={() => navigate('/tasks/history')} title="Task history"
              style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,.7)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-history" style={{ fontSize: 15 }} />
            </button>
            <button onClick={() => setNewTaskOpen(true)}
              style={{ background: '#17B8D0', border: 'none', borderRadius: 8, padding: '6px 14px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-plus" /> Task
            </button>
          </div>
        </div>
      </div>

      <PageContent>
        {!simple && <Tabs tabs={[
          { key: 'my',       label: 'My Tasks', count: myTasks?.length },
          { key: 'projects', label: 'Projects',  count: projects?.length },
        ]} active={tab} onChange={setTab} />}

        {/* ── SIMPLE MODE (employees): grouped board with one-tap advance ── */}
        {simple && (
          <>
            {!myTasks?.length && (
              <EmptyState icon="circle-check" title="All caught up!" subtitle="Tasks assigned to you will appear here. Tap + Task to add your own." />
            )}
            {(['todo', 'in_progress'] as const).map(group => {
              const items = myTasks?.filter((t: any) => group === 'todo'
                ? (t.status === 'todo' || t.status === 'in_review')
                : t.status === 'in_progress') ?? []
              if (!items.length) return null
              const gm = group === 'todo'
                ? { label: 'TO DO', color: '#718096', next: 'in_progress', nextLabel: 'Start', nextIcon: 'player-play' }
                : { label: 'DOING', color: '#17B8D0', next: 'done', nextLabel: 'Mark Done', nextIcon: 'check' }
              return (
                <div key={group} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: gm.color, letterSpacing: '.8px', marginBottom: 8 }}>
                    {gm.label} <span style={{ opacity: .6 }}>({items.length})</span>
                  </div>
                  {items.map((t: any) => {
                    const late = t.due_date && new Date(t.due_date) < new Date()
                    return (
                      <div key={t.id} style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                        <div onClick={() => navigate(`/tasks/${t.id}`)} style={{ cursor: 'pointer' }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A202C', marginBottom: 4 }}>{t.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#A0AEC0' }}>
                            {t.due_date && (
                              <span style={{ color: late ? '#E24B4A' : '#A0AEC0', fontWeight: late ? 600 : 400 }}>
                                <i className="ti ti-calendar" style={{ fontSize: 11, marginRight: 3 }} />
                                {late ? 'Overdue — ' : 'Due '}{formatDayMonth(t.due_date)}
                              </span>
                            )}
                            {t.project?.name && <span><i className="ti ti-folder" style={{ fontSize: 11, marginRight: 3 }} />{t.project.name}</span>}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await updateTask.mutateAsync({ id: t.id, data: { status: gm.next } })
                              toast.success(gm.next === 'done' ? 'Task completed 🎉' : 'Task started')
                            } catch { toast.error('Failed to update') }
                          }}
                          style={{
                            marginTop: 10, width: '100%', border: 'none', borderRadius: 10, padding: 11,
                            background: group === 'todo' ? '#EBF8FF' : '#1D9E75',
                            color: group === 'todo' ? '#17B8D0' : 'white',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}>
                          <i className={`ti ti-${gm.nextIcon}`} style={{ fontSize: 15 }} /> {gm.nextLabel}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        )}

        {/* MY TASKS TAB */}
        {!simple && tab === 'my' && (
          <>
            {/* Overdue alert */}
            {overdue.length > 0 && (
              <div style={{ background: '#FFF0F0', border: '1px solid rgba(226,75,74,.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#E24B4A' }}>
                <i className="ti ti-alert-circle" />
                {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}
              </div>
            )}

            {/* Due today */}
            {dueToday.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', letterSpacing: '.5px', marginBottom: 6 }}>DUE TODAY</div>
                {dueToday.map((t: any) => (
                  <TaskCard key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />
                ))}
              </>
            )}

            {/* All my tasks */}
            {myTasks && myTasks.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', letterSpacing: '.5px', marginBottom: 6, marginTop: dueToday.length ? 12 : 0 }}>
                  ALL OPEN TASKS
                </div>
                {myTasks.filter((t: any) => !dueToday.includes(t)).map((t: any) => (
                  <TaskCard key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />
                ))}
              </>
            )}

            {!myTasks?.length && (
              <EmptyState icon="circle-check" title="All caught up!" subtitle="No open tasks assigned to you." />
            )}
          </>
        )}

        {/* PROJECTS TAB */}
        {!simple && tab === 'projects' && (
          <>
            {!projects?.length && (
              <EmptyState icon="folders" title="No projects yet" subtitle="Create a project to organize tasks with your team." />
            )}
            {projects?.map((proj: any) => (
              <button key={proj.id} onClick={() => navigate(`/tasks/project/${proj.id}`)}
                style={{ width: '100%', background: 'white', borderRadius: 14, padding: 14, border: 'none', cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: proj.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ti-${proj.icon ?? 'briefcase'}`} style={{ color: proj.color, fontSize: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A202C' }}>{proj.name}</div>
                  {proj.description && (
                    <div style={{ fontSize: 11, color: '#718096', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.description}</div>
                  )}
                  <div style={{ fontSize: 10, color: '#CBD5E0', marginTop: 2 }}>
                    {proj.members?.length ?? 0} member{proj.members?.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: '#CBD5E0', fontSize: 18 }} />
              </button>
            ))}
          </>
        )}
      </PageContent>

      {/* NEW TASK SHEET */}
      <BottomSheet open={newTaskOpen} onClose={() => setNewTaskOpen(false)} title="New Task">
        <div>
          <div className="form-label">Task Title *</div>
          <input className="input" placeholder="What needs to be done?" value={taskForm.title}
            onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} style={{ marginBottom: 12 }} />

          <div className="form-label">Description</div>
          <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} rows={2}
            placeholder="Optional details..."
            style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 12, resize: 'none', background: '#FAFBFC', color: '#1A202C' }} />

          {simple ? (
            <div style={{ marginBottom: 16 }}>
              <div className="form-label">Due Date (optional)</div>
              <input className="input" type="date" value={taskForm.due_date}
                onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          ) : (
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div>
              <div className="form-label">Priority</div>
              <select className="input" value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                {Object.entries(PRIORITY_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="form-label">Due Date</div>
              <input className="input" type="date" value={taskForm.due_date}
                onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>
          )}

          {!simple && (
            <div style={{ marginBottom: 12 }}>
              <div className="form-label">
                Assignees <span style={{ color: '#A0AEC0', fontWeight: 400 }}>· pick one or more</span>
              </div>
              <input
                value={assigneeSearch}
                onChange={e => setAssigneeSearch(e.target.value)}
                placeholder="Search people..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 13, marginBottom: 6, fontFamily: 'inherit', background: '#fff' }} />
              <div style={{ maxHeight: 176, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10, background: '#FAFBFC', padding: 4 }}>
                {(() => {
                  const qq = assigneeSearch.trim().toLowerCase()
                  // people already ticked stay pinned so a search can never hide a selection
                  const list = (assignableEmployees ?? []).filter((e: any) =>
                    taskForm.assignee_ids.includes(e.id) || !qq ||
                    (e.full_name_en ?? '').toLowerCase().includes(qq) ||
                    (e.job_title_en ?? '').toLowerCase().includes(qq))
                  return list.length ? list.map((emp: any) => {
                  const on = taskForm.assignee_ids.includes(emp.id)
                  return (
                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', cursor: 'pointer', fontSize: 13, borderRadius: 8, background: on ? '#EBF8FF' : 'transparent' }}>
                      <input type="checkbox" checked={on} style={{ accentColor: '#17B8D0', width: 15, height: 15 }}
                        onChange={() => setTaskForm(p => ({
                          ...p,
                          assignee_ids: on ? p.assignee_ids.filter(x => x !== emp.id) : [...p.assignee_ids, emp.id],
                        }))} />
                      <span style={{ flex: 1, minWidth: 0, color: on ? '#1A202C' : '#4A5568', fontWeight: on ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {emp.full_name_en}
                        {emp.job_title_en && <span style={{ color: '#A0AEC0', fontWeight: 400 }}> · {emp.job_title_en}</span>}
                      </span>
                    </label>
                  )
                  }) : <div style={{ fontSize: 12, color: '#718096', padding: 8 }}>No one matches that search</div>
                })()}
              </div>
              <div style={{ fontSize: 11, color: '#718096', marginTop: 5 }}>
                {taskForm.assignee_ids.length === 0 ? 'Unassigned' : `${taskForm.assignee_ids.length} person${taskForm.assignee_ids.length > 1 ? 's' : ''} assigned`}
              </div>
            </div>
          )}

          {!simple && <div className="form-row" style={{ marginBottom: 16 }}>
            <div>
              <div className="form-label">Project</div>
              <select className="input" value={taskForm.project_id} onChange={e => setTaskForm(p => ({ ...p, project_id: e.target.value }))}>
                <option value="">No project</option>
                {projects?.map((proj: any) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>
          </div>}

          <button onClick={handleCreateTask} disabled={createTask.isPending}
            style={{ width: '100%', background: '#17B8D0', color: 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: createTask.isPending ? .7 : 1 }}>
            {createTask.isPending ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </BottomSheet>

      {/* NEW PROJECT SHEET */}
      <BottomSheet open={newProjOpen} onClose={() => setNewProjOpen(false)} title="New Project">
        <div>
          <div className="form-label">Project Name *</div>
          <input className="input" placeholder="e.g. Q3 Marketing Campaign" value={projForm.name}
            onChange={e => setProjForm(p => ({ ...p, name: e.target.value }))} style={{ marginBottom: 12 }} />

          <div className="form-label">Description</div>
          <input className="input" placeholder="What's this project about?" value={projForm.description}
            onChange={e => setProjForm(p => ({ ...p, description: e.target.value }))} style={{ marginBottom: 12 }} />

          <div className="form-label">Color</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {PROJECT_COLORS.map(c => (
              <button key={c} onClick={() => setProjForm(p => ({ ...p, color: c }))}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${projForm.color === c ? 'white' : 'transparent'}`, outline: projForm.color === c ? `2px solid ${c}` : 'none', cursor: 'pointer' }} />
            ))}
          </div>

          <div className="form-label">Icon</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {PROJECT_ICONS.map(ic => (
              <button key={ic} onClick={() => setProjForm(p => ({ ...p, icon: ic }))}
                style={{ width: 36, height: 36, borderRadius: 10, background: projForm.icon === ic ? projForm.color + '22' : '#F4F6F9', border: `2px solid ${projForm.icon === ic ? projForm.color : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ti-${ic}`} style={{ color: projForm.icon === ic ? projForm.color : '#718096', fontSize: 17 }} />
              </button>
            ))}
          </div>

          <button onClick={async () => {
            if (!projForm.name.trim()) return toast.error('Project name required')
            try {
              await createProject.mutateAsync(projForm)
              toast.success('Project created')
              setNewProjOpen(false)
              setProjForm({ name: '', description: '', color: '#17B8D0', icon: 'briefcase' })
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to create project')
            }
          }} disabled={createProject.isPending}
            style={{ width: '100%', background: projForm.color, color: 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: createProject.isPending ? .7 : 1 }}>
            {createProject.isPending ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

// ── Task Card Component ───────────────────────────────────
export function TaskCard({ task, onClick }: { task: any; onClick: () => void }) {
  const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.normal
  const sm = STATUS_META[task.status]    ?? STATUS_META.todo
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div onClick={onClick} style={{ background: 'white', borderRadius: 12, padding: '12px 14px', marginBottom: 6, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.06)', borderLeft: isOverdue ? '3px solid #E24B4A' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Status dot */}
        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${sm.color}`, background: task.status === 'done' ? sm.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          {task.status === 'done' && <i className="ti ti-check" style={{ color: 'white', fontSize: 10 }} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: task.status === 'done' ? '#CBD5E0' : '#1A202C', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
            {task.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
            {task.project && (
              <span style={{ fontSize: 10, color: task.project.color, background: task.project.color + '15', borderRadius: 5, padding: '2px 6px', fontWeight: 500 }}>
                {task.project.name}
              </span>
            )}
            <span className="badge" style={{ background: pm.bg, color: pm.color, fontSize: 9 }}>
              <i className={`ti ti-${pm.icon}`} style={{ fontSize: 9 }} /> {pm.label}
            </span>
            {task.due_date && (
              <span style={{ fontSize: 10, color: isOverdue ? '#E24B4A' : '#718096' }}>
                <i className="ti ti-calendar" style={{ fontSize: 10 }} />{' '}
                {formatDayMonth(task.due_date + 'T00:00')}
                {isOverdue && ' — Overdue'}
              </span>
            )}
            {(task.comments_count?.[0]?.count > 0) && (
              <span style={{ fontSize: 10, color: '#CBD5E0', display: 'flex', alignItems: 'center', gap: 3 }}>
                <i className="ti ti-message-circle" style={{ fontSize: 10 }} /> {task.comments_count[0].count}
              </span>
            )}
          </div>
        </div>

        {task.assignee && (
          <Avatar name={task.assignee.full_name_en} size={24} />
        )}
      </div>
    </div>
  )
}

export { PRIORITY_META, STATUS_META }
