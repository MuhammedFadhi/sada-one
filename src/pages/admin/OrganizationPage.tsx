// ============================================================
// SA'DA ONE — Admin: Organization (master control)
// Companies → Divisions → Departments CRUD + move employees.
// ============================================================
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBar, PageContent, EmptyState, BottomSheet, Button, Avatar, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'

type Sheet =
  | { kind: 'company'; row?: any }
  | { kind: 'division'; row?: any; company_id: string }
  | { kind: 'department'; row?: any; division_id: string; company_id: string }
  | { kind: 'move'; employee: any }
  | null

export function OrganizationPage() {
  const qc = useQueryClient()
  const [companyId, setCompanyId] = useState<string>('')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [moveForm, setMoveForm] = useState<any>({})

  const { data, isLoading } = useQuery({
    queryKey: ['admin-organization'],
    queryFn: async () => {
      const [c, d, dep, e] = await Promise.all([
        supabase.from('companies').select('*').order('name_en'),
        supabase.from('divisions').select('*').order('name_en'),
        supabase.from('departments').select('*').order('name_en'),
        supabase.from('employees').select('id,full_name_en,job_title_en,company_id,division_id,department_id,manager_id,status').eq('status', 'active').order('full_name_en'),
      ])
      return { companies: c.data ?? [], divisions: d.data ?? [], departments: dep.data ?? [], employees: e.data ?? [] }
    }
  })

  const activeCompany = companyId || data?.companies?.[0]?.id || ''
  const divisions   = data?.divisions?.filter((d: any) => d.company_id === activeCompany) ?? []
  const employees   = data?.employees ?? []
  const empCount    = (f: (e: any) => boolean) => employees.filter(f).length

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-organization'] })
    qc.invalidateQueries({ queryKey: ['admin-org-lists'] })
    qc.invalidateQueries({ queryKey: ['employees'] })
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!sheet || sheet.kind === 'move') return
      if (!nameEn.trim()) throw new Error('English name is required')
      const table = sheet.kind === 'company' ? 'companies' : sheet.kind === 'division' ? 'divisions' : 'departments'
      const base: any = { name_en: nameEn.trim(), name_ar: nameAr.trim() || nameEn.trim() }
      if (sheet.kind === 'division')   base.company_id = sheet.company_id
      if (sheet.kind === 'department') base.division_id = sheet.division_id
      if (sheet.row) {
        const { error } = await supabase.from(table).update(base).eq('id', sheet.row.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from(table).insert(base)
        if (error) throw error
      }
    },
    onSuccess: () => { toast.success('Saved ✓'); setSheet(null); invalidate() },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save')
  })

  const deleteMut = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); setSheet(null); invalidate() },
    onError: () => toast.error('Cannot delete — move its employees/sub-units first')
  })

  const moveMut = useMutation({
    mutationFn: async () => {
      const s = sheet as Extract<Sheet, { kind: 'move' }>
      const { error } = await supabase.from('employees').update({
        company_id:    moveForm.company_id || null,
        division_id:   moveForm.division_id || null,
        department_id: moveForm.department_id || null,
        manager_id:    moveForm.manager_id || null,
      }).eq('id', s.employee.id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Employee moved ✓'); setSheet(null); invalidate() },
    onError: () => toast.error('Failed to move employee')
  })

  const openEdit = (s: Sheet) => {
    setNameEn((s as any)?.row?.name_en ?? '')
    setNameAr((s as any)?.row?.name_ar ?? '')
    setSheet(s)
  }
  const openMove = (employee: any) => {
    setMoveForm({
      company_id: employee.company_id ?? '', division_id: employee.division_id ?? '',
      department_id: employee.department_id ?? '', manager_id: employee.manager_id ?? '',
    })
    setSheet({ kind: 'move', employee })
  }

  const iconBtn = (icon: string, color: string, onClick: () => void, label: string) => (
    <button aria-label={label} onClick={e => { e.stopPropagation(); onClick() }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 15, color }} />
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 14 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Organization</h1>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>Companies · Divisions · Departments · People</p>
          </div>
          <button onClick={() => openEdit({ kind: 'company' })}
            style={{ background: 'linear-gradient(135deg,#C8A96E,#A8894E)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> Company
          </button>
        </div>
        {/* Company chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 4px', WebkitOverflowScrolling: 'touch' }}>
          {data?.companies?.map((c: any) => (
            <button key={c.id} onClick={() => setCompanyId(c.id)}
              style={{
                flexShrink: 0, background: activeCompany === c.id ? 'white' : 'rgba(255,255,255,.08)',
                color: activeCompany === c.id ? '#0D1B2A' : 'rgba(255,255,255,.7)',
                border: 'none', borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <i className="ti ti-building-skyscraper" style={{ fontSize: 13 }} />
              {c.name_en}
              <span style={{ fontSize: 10, opacity: .6 }}>({empCount(e => e.company_id === c.id)})</span>
            </button>
          ))}
        </div>
      </div>

      <PageContent>
        {isLoading && <SkeletonList rows={6} />}

        {!isLoading && !data?.companies?.length && (
          <EmptyState icon="building-skyscraper" title="No companies yet" subtitle="Create your first company to start structuring the organization." />
        )}

        {activeCompany && (
          <>
            {/* Company actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A202C' }}>
                {data?.companies?.find((c: any) => c.id === activeCompany)?.name_en}
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {iconBtn('pencil', '#17B8D0', () => openEdit({ kind: 'company', row: data?.companies?.find((c: any) => c.id === activeCompany) }), 'Edit company')}
                {iconBtn('trash', '#E24B4A', () => {
                  if (empCount(e => e.company_id === activeCompany)) { toast.error('Move its employees first'); return }
                  if (confirm('Delete this company and all its divisions/departments?')) deleteMut.mutate({ table: 'companies', id: activeCompany })
                }, 'Delete company')}
              </div>
            </div>

            {/* Divisions + departments */}
            {!divisions.length && (
              <div style={{ background: 'white', borderRadius: 14, padding: 20, textAlign: 'center', color: '#A0AEC0', fontSize: 12, marginBottom: 10 }}>
                No divisions in this company yet.
              </div>
            )}
            {divisions.map((div: any) => {
              const deps = data?.departments?.filter((d: any) => d.division_id === div.id) ?? []
              return (
                <div key={div.id} style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EBF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-building" style={{ color: '#17B8D0', fontSize: 16 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>{div.name_en}</div>
                      <div style={{ fontSize: 10, color: '#A0AEC0' }}>{empCount(e => e.division_id === div.id)} employees · {deps.length} departments</div>
                    </div>
                    {iconBtn('pencil', '#17B8D0', () => openEdit({ kind: 'division', row: div, company_id: activeCompany }), 'Edit division')}
                    {iconBtn('trash', '#E24B4A', () => {
                      if (empCount(e => e.division_id === div.id)) { toast.error('Move its employees first'); return }
                      if (confirm(`Delete division "${div.name_en}"?`)) deleteMut.mutate({ table: 'divisions', id: div.id })
                    }, 'Delete division')}
                  </div>

                  {/* Departments */}
                  <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid #F0F4F8', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {deps.map((dep: any) => (
                      <div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="ti ti-corner-down-right" style={{ fontSize: 12, color: '#CBD5E0' }} />
                        <span style={{ flex: 1, fontSize: 12, color: '#4A5568' }}>{dep.name_en}
                          <span style={{ fontSize: 10, color: '#A0AEC0' }}> · {empCount(e => e.department_id === dep.id)}</span>
                        </span>
                        {iconBtn('pencil', '#A0AEC0', () => openEdit({ kind: 'department', row: dep, division_id: div.id, company_id: activeCompany }), 'Edit department')}
                        {iconBtn('trash', '#F0A5A5', () => {
                          if (empCount(e => e.department_id === dep.id)) { toast.error('Move its employees first'); return }
                          deleteMut.mutate({ table: 'departments', id: dep.id })
                        }, 'Delete department')}
                      </div>
                    ))}
                    <button onClick={() => openEdit({ kind: 'department', division_id: div.id, company_id: activeCompany })}
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#17B8D0', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
                      <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add department
                    </button>
                  </div>
                </div>
              )
            })}
            <button onClick={() => openEdit({ kind: 'division', company_id: activeCompany })}
              style={{ width: '100%', background: 'white', border: '1.5px dashed #CBD5E0', borderRadius: 12, padding: 12, color: '#17B8D0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18 }}>
              <i className="ti ti-plus" style={{ marginRight: 5 }} />Add Division
            </button>

            {/* People in this company */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A202C', marginBottom: 8 }}>People in this company</div>
            {employees.filter((e: any) => e.company_id === activeCompany).map((e: any) => (
              <div key={e.id} style={{ background: 'white', borderRadius: 12, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                <Avatar name={e.full_name_en} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1A202C' }}>{e.full_name_en}</div>
                  <div style={{ fontSize: 10, color: '#A0AEC0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {data?.divisions?.find((d: any) => d.id === e.division_id)?.name_en ?? 'No division'}
                    {e.department_id ? ` · ${data?.departments?.find((d: any) => d.id === e.department_id)?.name_en}` : ''}
                  </div>
                </div>
                <button onClick={() => openMove(e)}
                  style={{ background: '#F4F6F9', border: 'none', borderRadius: 8, padding: '7px 11px', fontSize: 11, fontWeight: 600, color: '#17B8D0', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Move
                </button>
              </div>
            ))}
          </>
        )}
      </PageContent>

      {/* Create/edit sheet */}
      <BottomSheet open={!!sheet && sheet.kind !== 'move'} onClose={() => setSheet(null)}
        title={sheet && sheet.kind !== 'move' ? `${(sheet as any).row ? 'Edit' : 'New'} ${sheet.kind}` : ''}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>Name (English)</div>
            <input className="input" value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="e.g. Operations" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>Name (Arabic)</div>
            <input className="input" dir="rtl" value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: العمليات" />
          </div>
          <Button fullWidth loading={saveMut.isPending} disabled={!nameEn.trim()} onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </BottomSheet>

      {/* Move employee sheet */}
      <BottomSheet open={!!sheet && sheet.kind === 'move'} onClose={() => setSheet(null)}
        title={sheet?.kind === 'move' ? `Move ${sheet.employee.full_name_en}` : ''}>
        {sheet?.kind === 'move' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>Company</div>
              <select className="input" value={moveForm.company_id}
                onChange={e => setMoveForm({ ...moveForm, company_id: e.target.value, division_id: '', department_id: '' })}>
                {data?.companies?.map((c: any) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>Division</div>
              <select className="input" value={moveForm.division_id}
                onChange={e => setMoveForm({ ...moveForm, division_id: e.target.value, department_id: '' })}>
                <option value="">— None —</option>
                {data?.divisions?.filter((d: any) => d.company_id === moveForm.company_id).map((d: any) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>Department</div>
              <select className="input" value={moveForm.department_id}
                onChange={e => setMoveForm({ ...moveForm, department_id: e.target.value })}>
                <option value="">— None —</option>
                {data?.departments?.filter((d: any) => d.division_id === moveForm.division_id).map((d: any) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>Manager (reports to)</div>
              <select className="input" value={moveForm.manager_id}
                onChange={e => setMoveForm({ ...moveForm, manager_id: e.target.value })}>
                <option value="">— No manager —</option>
                {employees.filter((x: any) => x.id !== sheet.employee.id).map((x: any) => <option key={x.id} value={x.id}>{x.full_name_en}</option>)}
              </select>
            </div>
            <Button fullWidth loading={moveMut.isPending} onClick={() => moveMut.mutate()}>
              {moveMut.isPending ? 'Moving…' : 'Move Employee'}
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
