// ============================================================
// SA'DA ONE — Task Detail Page
// ============================================================
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTask, useUpdateTask, useAddTaskComment, useEmployees, useTasksRealtime, useDeleteTask } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, TopBar, PageContent, Avatar, BottomSheet } from '@/components/ui'
import { PRIORITY_META, STATUS_META } from './TasksHomePage'
import toast from 'react-hot-toast'
import { formatDayMonth, formatDayMonthTime, formatDayName } from '@/lib/dates'

export function TaskDetailPage() {
  useTasksRealtime()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { data: task, isLoading } = useTask(id!)
  const { data: employees } = useEmployees({ status: 'active' })
  const updateTask   = useUpdateTask()
  const addComment   = useAddTaskComment()
  const deleteTask   = useDeleteTask()
  const { role }     = useAuthStore()
  const canDelete    = role === 'admin' || role === 'manager' || role === 'hr_officer' || task?.reporter_id === profile?.employee_id

  const handleDelete = async () => {
    if (!confirm('Delete this task? It moves to Task History and can be restored.')) return
    try {
      await deleteTask.mutateAsync(id!)
      toast.success('Task deleted')
      navigate('/tasks')
    } catch { toast.error('Failed to delete task') }
  }

  const [comment, setComment]   = useState('')
  const [statusOpen, setStatusOpen]   = useState(false)
  const [assignOpen, setAssignOpen]   = useState(false)
  const [editDesc, setEditDesc]       = useState(false)
  const [descDraft, setDescDraft]     = useState('')

  if (isLoading || !task) return (
    <div style={{ background: '#0D1B2A', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <i className="ti ti-loader-2" style={{ color: '#17B8D0', fontSize: 32, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.normal
  const sm = STATUS_META[task.status]     ?? STATUS_META.todo
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  const handleStatusChange = async (status: string) => {
    try {
      await updateTask.mutateAsync({ id: id!, data: { status } })
      setStatusOpen(false)
      toast.success(`Status: ${STATUS_META[status]?.label}`)
    } catch { toast.error('Failed to update') }
  }

  const handleAssign = async (assignee_id: string) => {
    try {
      await updateTask.mutateAsync({ id: id!, data: { assignee_id } })
      setAssignOpen(false)
      toast.success('Assignee updated')
    } catch { toast.error('Failed to assign') }
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    try {
      await addComment.mutateAsync({ task_id: id!, content: comment })
      setComment('')
    } catch { toast.error('Failed to post comment') }
  }

  const handleSaveDesc = async () => {
    try {
      await updateTask.mutateAsync({ id: id!, data: { description: descDraft } })
      setEditDesc(false)
      toast.success('Description updated')
    } catch { toast.error('Failed to update') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 14 }}>
        <StatusBar />
        <TopBar title="Task" onBack={() => navigate(-1)}
          rightIcon="dots" onRight={() => {}} />

        {/* Status pill row */}
        <div style={{ padding: '0 16px', display: 'flex', gap: 8 }}>
          <button onClick={() => setStatusOpen(true)}
            style={{ background: sm.bg, border: 'none', borderRadius: 20, padding: '5px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: sm.color, fontFamily: 'inherit' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: sm.color }} />
            {sm.label}
            <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
          </button>
          <span className="badge" style={{ background: pm.bg, color: pm.color }}>
            <i className={`ti ti-${pm.icon}`} style={{ fontSize: 9 }} /> {pm.label}
          </span>
          {isOverdue && (
            <span className="badge badge-danger">Overdue</span>
          )}
        </div>
      </div>

      <PageContent>
        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A202C', marginBottom: 16, lineHeight: 1.3 }}>
          {task.title}
        </h2>

        {/* Meta grid */}
        <div style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          {/* Assignee */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #F0F0F0' }}>
            <span style={{ fontSize: 12, color: '#718096' }}>Assignee</span>
            <button onClick={() => setAssignOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {task.assignee
                ? <><Avatar name={task.assignee.full_name_en} size={22} /><span style={{ fontSize: 12, color: '#1A202C' }}>{task.assignee.full_name_en}</span></>
                : <span style={{ fontSize: 12, color: '#17B8D0' }}>+ Assign</span>
              }
            </button>
          </div>

          {/* Reporter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #F0F0F0' }}>
            <span style={{ fontSize: 12, color: '#718096' }}>Reporter</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {task.reporter && <Avatar name={task.reporter.full_name_en} size={22} />}
              <span style={{ fontSize: 12, color: '#1A202C' }}>{task.reporter?.full_name_en}</span>
            </div>
          </div>

          {/* Due date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #F0F0F0' }}>
            <span style={{ fontSize: 12, color: '#718096' }}>Due Date</span>
            <span style={{ fontSize: 12, color: isOverdue ? '#E24B4A' : '#1A202C', fontWeight: 500 }}>
              {task.due_date
                ? formatDayName(task.due_date + 'T00:00')
                : <span style={{ color: '#CBD5E0' }}>Not set</span>
              }
            </span>
          </div>

          {/* Project */}
          {task.project && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 12, color: '#718096' }}>Project</span>
              <span style={{ fontSize: 12, color: task.project.color, background: task.project.color + '18', borderRadius: 6, padding: '2px 8px', fontWeight: 500 }}>
                {task.project.name}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>Description</span>
            <button onClick={() => { setEditDesc(true); setDescDraft(task.description ?? '') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#17B8D0', fontSize: 12 }}>
              <i className="ti ti-edit" />
            </button>
          </div>
          {!editDesc && (
            <p style={{ fontSize: 13, color: task.description ? '#4A5568' : '#CBD5E0', lineHeight: 1.6, margin: 0 }}>
              {task.description || 'No description yet. Click edit to add one.'}
            </p>
          )}
          {editDesc && (
            <>
              <textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} rows={4}
                style={{ width: '100%', border: '1.5px solid #17B8D0', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8, resize: 'none', color: '#1A202C', background: '#FAFBFC' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => setEditDesc(false)} style={{ background: '#F4F6F9', color: '#718096', border: 'none', borderRadius: 8, padding: 9, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleSaveDesc} style={{ background: '#17B8D0', color: 'white', border: 'none', borderRadius: 8, padding: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
              </div>
            </>
          )}
        </div>

        {/* Comments */}
        <div style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', marginBottom: 12 }}>
            Comments {task.comments?.length > 0 && `(${task.comments.length})`}
          </div>

          {task.comments?.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Avatar name={c.author?.full_name_en ?? '?'} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1A202C' }}>{c.author?.full_name_en}</span>
                  <span style={{ fontSize: 10, color: '#CBD5E0' }}>
                    {formatDayMonth(c.created_at)}
                  </span>
                </div>
                <div style={{ background: '#F4F6F9', borderRadius: '4px 12px 12px 12px', padding: '8px 12px', fontSize: 13, color: '#4A5568', lineHeight: 1.5 }}>
                  {c.content}
                </div>
              </div>
            </div>
          ))}

          {/* Comment input */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Avatar name={profile?.employee?.full_name_en ?? '?'} size={30} />
            <div style={{ flex: 1, display: 'flex', gap: 6 }}>
              <input value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                placeholder="Add a comment..."
                style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#FAFBFC', color: '#1A202C' }} />
              <button onClick={handleComment} disabled={!comment.trim() || addComment.isPending}
                style={{ background: '#17B8D0', border: 'none', borderRadius: 10, width: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !comment.trim() ? .4 : 1 }}>
                <i className="ti ti-send" style={{ color: 'white', fontSize: 16 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Activity log */}
        {task.activity?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', marginBottom: 10 }}>Activity</div>
            {task.activity.slice(0, 5).map((act: any) => (
              <div key={act.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#F4F6F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-history" style={{ color: '#CBD5E0', fontSize: 12 }} />
                </div>
                <div>
                  <span style={{ fontSize: 12, color: '#1A202C', fontWeight: 500 }}>{act.actor?.full_name_en} </span>
                  <span style={{ fontSize: 12, color: '#718096' }}>
                    {act.action === 'status_changed' && `moved to ${STATUS_META[act.new_value]?.label}`}
                    {act.action === 'assigned' && 'updated assignee'}
                    {act.action === 'created' && 'created this task'}
                    {act.action === 'commented' && 'added a comment'}
                  </span>
                  <div style={{ fontSize: 10, color: '#CBD5E0', marginTop: 1 }}>
                    {formatDayMonthTime(act.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {canDelete && (
          <button onClick={handleDelete} disabled={deleteTask.isPending}
            style={{ width: '100%', marginTop: 16, background: '#FFF5F5', color: '#E24B4A', border: '1px solid #FEB2B2', borderRadius: 12, padding: 13, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i className="ti ti-trash" /> {deleteTask.isPending ? 'Deleting…' : 'Delete Task'}
          </button>
        )}
      </PageContent>

      {/* Status change sheet */}
      <BottomSheet open={statusOpen} onClose={() => setStatusOpen(false)} title="Move to…">
        <div>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button key={key} onClick={() => handleStatusChange(key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', background: task.status === key ? meta.bg : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', marginBottom: 4, fontFamily: 'inherit' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
              <span style={{ fontSize: 14, color: '#1A202C', flex: 1, textAlign: 'left' }}>{meta.label}</span>
              {task.status === key && <i className="ti ti-check" style={{ color: meta.color }} />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Assign sheet */}
      <BottomSheet open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign to…">
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          <button onClick={() => handleAssign('')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', marginBottom: 4, fontFamily: 'inherit' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F0F0F0', border: '1.5px dashed #CBD5E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-user-off" style={{ color: '#CBD5E0', fontSize: 16 }} />
            </div>
            <span style={{ fontSize: 13, color: '#718096' }}>Unassign</span>
          </button>
          {employees?.map(emp => (
            <button key={emp.id} onClick={() => handleAssign(emp.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px', background: task.assignee?.id === emp.id ? '#EBF8FF' : 'none', border: 'none', borderRadius: 10, cursor: 'pointer', marginBottom: 4, fontFamily: 'inherit' }}>
              <Avatar name={emp.full_name_en} size={34} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, color: '#1A202C' }}>{emp.full_name_en}</div>
                <div style={{ fontSize: 11, color: '#718096' }}>{emp.job_title_en}</div>
              </div>
              {task.assignee?.id === emp.id && <i className="ti ti-check" style={{ color: '#17B8D0' }} />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
