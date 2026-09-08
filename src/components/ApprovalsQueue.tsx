// ============================================================
// SA'DA ONE — ApprovalsQueue (shared)
// Renders the pending queue for all 4 request types.
// Managers see stage 1 (status='pending', their team).
// HR & Finance see stage 2 (status='processing').
// ============================================================
import { useState } from 'react'
import { usePendingApprovals, useApproveRequest } from '@/hooks/useData'
import { useAuthStore } from '@/store/auth.store'
import { Tabs, Avatar, EmptyState, SkeletonList, formatSAR } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDayMonth } from '@/lib/dates'

// Hoisted: declared inside render it was rebuilt on every keystroke, which
// remounted every approval card while someone typed a rejection reason.
// The values it used from the closure are now explicit props.
function Card({ item, table, children, selected, toggleSel, isManager, act, setRejecting }: any) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <input type="checkbox" aria-label="Select request" checked={selected.has(item.id)} onChange={() => toggleSel(item.id)}
          style={{ width: 18, height: 18, accentColor: '#17B8D0', cursor: 'pointer', flexShrink: 0 }} />
        <Avatar name={item.employee?.full_name_en ?? '?'} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>{item.employee?.full_name_en}</div>
          <div style={{ fontSize: 11, color: '#718096' }}>{item.employee?.job_title_en}{item.employee?.division?.name_en ? ` · ${item.employee.division.name_en}` : ''}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap',
          background: isManager ? '#FEF5EC' : '#EBF8FF', color: isManager ? '#E67E22' : '#17B8D0' }}>
          {isManager ? 'AWAITING MANAGER' : 'AWAITING HR & FIN'}
        </span>
      </div>
      {children}
      {!isManager && item.manager_approved_at && (
        <div style={{ fontSize: 11, color: '#1D9E75', margin: '2px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 13 }} /> Manager approved {fmtD(item.manager_approved_at.slice(0, 10))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => act(table, item.id, item.status, 'approve')}
          style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <i className="ti ti-check" /> {isManager ? 'Approve' : 'Final Approve'}
        </button>
        <button onClick={() => setRejecting({ table, id: item.id, status: item.status })}
          style={{ background: '#FFF0F0', color: '#E24B4A', border: '1px solid #E24B4A', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <i className="ti ti-x" /> Reject
        </button>
      </div>
    </div>
  )
}


// Hoisted out of the component: declaring these inside render gave them a
// new identity on every keystroke, remounting every approval card while
// someone typed a rejection reason.
function Row ({ label, value }: { label: string; value: React.ReactNode }) { return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: '#718096' }}>{label}</span>
      <span style={{ fontWeight: 500, color: '#1A202C', textTransform: 'capitalize', textAlign: 'right' }}>{value}</span>
    </div>
  ) }

function Box ({ children }: { children: React.ReactNode }) { return (
    <div style={{ background: '#F4F6F9', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>{children}</div>
  ) }


type ReqTable = 'leave_requests' | 'loans' | 'exit_reentry' | 'expense_claims'

const fmtD = (d?: string) => d ? formatDayMonth(d + 'T00:00') : '—'

export function ApprovalsQueue() {
  const { role } = useAuthStore()
  const { data: approvals, isLoading, refetch } = usePendingApprovals()
  const approve = useApproveRequest()
  const [tab, setTab] = useState('leave')
  const [rejecting, setRejecting] = useState<{ table: ReqTable; id: string; status: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const tabTable: Record<string, ReqTable> = { leave: 'leave_requests', loans: 'loans', exit: 'exit_reentry', expenses: 'expense_claims' }
  const tabItems = (t: string): any[] => ({ leave: approvals?.leave, loans: approvals?.loans, exit: approvals?.exit, expenses: approvals?.expenses }[t] ?? [])
  const switchTab = (t: string) => { setSelected(new Set()); setTab(t) }
  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const bulkApprove = async () => {
    const table = tabTable[tab]
    const items = tabItems(tab).filter(i => selected.has(i.id))
    if (!items.length) return
    setBulkBusy(true)
    let ok = 0
    for (const it of items) {
      try { await approve.mutateAsync({ table, id: it.id, action: 'approve', currentStatus: it.status }); ok++ } catch { /* keep going */ }
    }
    setBulkBusy(false); setSelected(new Set())
    toast.success(`Approved ${ok} request${ok !== 1 ? 's' : ''}${ok < items.length ? ` · ${items.length - ok} failed` : ' ✓'}`)
    refetch()
  }

  const counts = {
    leave:    approvals?.leave?.length ?? 0,
    loans:    approvals?.loans?.length ?? 0,
    exit:     approvals?.exit?.length ?? 0,
    expenses: approvals?.expenses?.length ?? 0,
  }
  const isManager = role === 'manager'

  const act = async (table: ReqTable, id: string, status: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      await approve.mutateAsync({ table, id, action, currentStatus: status, rejection_reason: reason })
      toast.success(action === 'reject' ? 'Request rejected'
        : isManager ? 'Approved — sent to HR & Finance ✓' : 'Approved ✓')
      setRejecting(null); setRejectReason(''); refetch()
    } catch { toast.error('Failed to update') }
  }



  return (
    <>
      <Tabs
        tabs={[
          { key: 'leave',    label: 'Leave',    count: counts.leave },
          { key: 'loans',    label: 'Loans',    count: counts.loans },
          { key: 'exit',     label: 'Exit/Re-entry', count: counts.exit },
          { key: 'expenses', label: 'Expenses', count: counts.expenses },
        ]}
        active={tab} onChange={switchTab} />

      {selected.size > 0 && (
        <div style={{ position: 'sticky', top: 8, zIndex: 5, display: 'flex', gap: 8, alignItems: 'center', background: '#0D1B2A', borderRadius: 12, padding: '10px 12px', marginBottom: 10, boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 600, flex: 1 }}>{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())}
            style={{ background: 'rgba(255,255,255,.12)', color: 'white', border: 'none', borderRadius: 9, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
          <button onClick={bulkApprove} disabled={bulkBusy}
            style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: bulkBusy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: bulkBusy ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-checks" /> {bulkBusy ? 'Approving…' : `Approve ${selected.size}`}
          </button>
        </div>
      )}

      {isLoading && <SkeletonList />}

      {!isLoading && tab === 'leave' && (<>
        {!counts.leave && <EmptyState icon="circle-check" title="All caught up!" subtitle="No leave requests waiting on you." />}
        {approvals?.leave?.map((req: any) => (
          <Card key={req.id} item={req} table="leave_requests" selected={selected} toggleSel={toggleSel} isManager={isManager} act={act} setRejecting={setRejecting}>
            <Box>
              <Row label="Type" value={`${String(req.leave_type).replace(/_/g, ' ')} Leave`} />
              <Row label="Dates" value={`${fmtD(req.start_date)} – ${fmtD(req.end_date)}`} />
              <Row label="Duration" value={`${req.days_count} day${req.days_count !== 1 ? 's' : ''}`} />
              {req.reason && <div style={{ fontSize: 11, color: '#718096', marginTop: 6, paddingTop: 6, borderTop: '0.5px solid #E8EDF5' }}>"{req.reason}"</div>}
            </Box>
          </Card>
        ))}
      </>)}

      {!isLoading && tab === 'loans' && (<>
        {!counts.loans && <EmptyState icon="circle-check" title="All caught up!" subtitle="No loan requests waiting on you." />}
        {approvals?.loans?.map((loan: any) => (
          <Card key={loan.id} item={loan} table="loans" selected={selected} toggleSel={toggleSel} isManager={isManager} act={act} setRejecting={setRejecting}>
            <Box>
              <Row label="Amount" value={formatSAR(loan.amount_requested)} />
              <Row label="Repay over" value={`${loan.repayment_months} months`} />
              <Row label="Type" value={String(loan.loan_type ?? '').replace(/_/g, ' ')} />
              {loan.reason && <div style={{ fontSize: 11, color: '#718096', marginTop: 6, paddingTop: 6, borderTop: '0.5px solid #E8EDF5' }}>"{loan.reason}"</div>}
            </Box>
          </Card>
        ))}
      </>)}

      {!isLoading && tab === 'exit' && (<>
        {!counts.exit && <EmptyState icon="circle-check" title="All caught up!" subtitle="No exit/re-entry requests waiting on you." />}
        {approvals?.exit?.map((x: any) => (
          <Card key={x.id} item={x} table="exit_reentry" selected={selected} toggleSel={toggleSel} isManager={isManager} act={act} setRejecting={setRejecting}>
            <Box>
              <Row label="Permit" value={String(x.permit_type ?? 'single').replace(/_/g, ' ')} />
              <Row label="Destination" value={x.destination_country} />
              <Row label="Travel" value={`${fmtD(x.departure_date)} – ${fmtD(x.return_date)}`} />
            </Box>
          </Card>
        ))}
      </>)}

      {!isLoading && tab === 'expenses' && (<>
        {!counts.expenses && <EmptyState icon="circle-check" title="All caught up!" subtitle="No expense claims waiting on you." />}
        {approvals?.expenses?.map((c: any) => (
          <Card key={c.id} item={c} table="expense_claims" selected={selected} toggleSel={toggleSel} isManager={isManager} act={act} setRejecting={setRejecting}>
            <Box>
              <Row label="Amount" value={formatSAR(c.amount)} />
              <Row label="Category" value={String(c.category ?? '').replace(/_/g, ' ')} />
              <Row label="Date" value={fmtD(c.expense_date)} />
              <div style={{ fontSize: 11, color: '#718096', marginTop: 6, paddingTop: 6, borderTop: '0.5px solid #E8EDF5' }}>"{c.description}"</div>
              {c.receipt_url && (
                <a href={c.receipt_url} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: '#17B8D0', textDecoration: 'none', fontWeight: 600 }}>
                  <i className="ti ti-receipt" style={{ fontSize: 14 }} /> View receipt
                </a>
              )}
            </Box>
          </Card>
        ))}
      </>)}

      {/* Rejection reason sheet */}
      {rejecting && (
        <div className="sheet-overlay" onClick={() => setRejecting(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1A202C', marginBottom: 14 }}>Reason for Rejection</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} placeholder="Enter reason (sent to the employee)…"
              style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 16, fontFamily: 'inherit', outline: 'none', marginBottom: 14, resize: 'none', background: '#FAFBFC', color: '#1A202C' }} />
            <button onClick={() => act(rejecting.table, rejecting.id, rejecting.status, 'reject', rejectReason)}
              style={{ width: '100%', background: '#E24B4A', color: 'white', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Confirm Rejection
            </button>
          </div>
        </div>
      )}
    </>
  )
}
