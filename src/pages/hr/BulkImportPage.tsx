// ============================================================
// SA'DA ONE — Bulk employee import (/hr/employees/import)
// Parse a CSV, validate each row, and insert valid rows in bulk.
// New employees are auto-joined to their chat channels by the DB trigger.
// ============================================================
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, PageContent } from '@/components/ui'
import toast from 'react-hot-toast'

const COLS = ['employee_number', 'full_name_en', 'full_name_ar', 'work_email', 'job_title_en', 'job_title_ar', 'nationality', 'gender', 'join_date', 'contract_type', 'mobile', 'division'] as const
const CONTRACTS = ['permanent', 'fixed_term', 'probation', 'contractor']

// Minimal RFC-4180-ish CSV parser (handles quoted fields, commas, CRLF).
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1]
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++ }
      else if (c === '"') inQ = false
      else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

interface ParsedRow { data: Record<string, string>; errors: string[]; line: number }

export function BulkImportPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ ok: number; fail: number; errors: string[] } | null>(null)

  const company_id = profile?.employee?.company_id
  const { data: divisions } = useQuery({
    queryKey: ['divisions', company_id],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('id, name_en').eq('company_id', company_id)
      return data ?? []
    },
    enabled: !!company_id,
  })
  const divByName = useMemo(() => {
    const m = new Map<string, string>()
    ;(divisions ?? []).forEach((d: any) => m.set(d.name_en.trim().toLowerCase(), d.id))
    return m
  }, [divisions])

  const validate = (r: Record<string, string>, line: number): ParsedRow => {
    const errors: string[] = []
    if (!r.full_name_en?.trim()) errors.push('full_name_en required')
    if (!r.work_email?.includes('@')) errors.push('valid work_email required')
    if (!r.employee_number?.trim()) errors.push('employee_number required')
    if (!r.job_title_en?.trim()) errors.push('job_title_en required')
    if (r.gender && !['male', 'female'].includes(r.gender.trim().toLowerCase())) errors.push('gender must be male/female')
    if (r.contract_type && !CONTRACTS.includes(r.contract_type.trim().toLowerCase())) errors.push('bad contract_type')
    if (r.join_date && !/^\d{4}-\d{2}-\d{2}$/.test(r.join_date.trim())) errors.push('join_date must be YYYY-MM-DD')
    if (r.division?.trim() && !divByName.has(r.division.trim().toLowerCase())) errors.push(`unknown division "${r.division}"`)
    return { data: r, errors, line }
  }

  const onPick = async (file?: File) => {
    if (!file) return
    setDone(null); setFileName(file.name)
    const text = await file.text()
    const grid = parseCSV(text)
    if (grid.length < 2) { toast.error('CSV has no data rows'); setRows([]); return }
    const header = grid[0].map(h => h.trim().toLowerCase())
    const parsed = grid.slice(1).map((cells, idx) => {
      const rec: Record<string, string> = {}
      header.forEach((h, i) => { if ((COLS as readonly string[]).includes(h)) rec[h] = (cells[i] ?? '').trim() })
      return validate(rec, idx + 2)
    })
    setRows(parsed)
  }

  const valid = rows.filter(r => r.errors.length === 0)

  const runImport = async () => {
    if (!company_id) { toast.error('Cannot determine company. Re-login.'); return }
    if (!valid.length) return
    setImporting(true)
    let ok = 0; const errors: string[] = []
    for (const r of valid) {
      const d = r.data
      const payload: Record<string, any> = {
        company_id,
        employee_number: d.employee_number.trim(),
        full_name_en: d.full_name_en.trim(),
        full_name_ar: (d.full_name_ar || d.full_name_en).trim(),
        job_title_en: d.job_title_en.trim(),
        job_title_ar: (d.job_title_ar || d.job_title_en).trim(),
        work_email: d.work_email.trim().toLowerCase(),
        nationality: d.nationality?.trim() || 'Saudi',
        gender: (d.gender || 'male').trim().toLowerCase(),
        join_date: d.join_date?.trim() || new Date().toISOString().split('T')[0],
        contract_type: (d.contract_type || 'permanent').trim().toLowerCase(),
        status: 'active',
      }
      if (d.mobile?.trim()) payload.mobile = d.mobile.trim()
      const divId = d.division?.trim() ? divByName.get(d.division.trim().toLowerCase()) : undefined
      if (divId) payload.division_id = divId
      const { error } = await supabase.from('employees').insert(payload)
      if (error) {
        const m = error.message.includes('duplicate') ? 'duplicate email/number' : error.message.slice(0, 60)
        errors.push(`Line ${r.line} (${d.full_name_en}): ${m}`)
      } else ok++
    }
    setImporting(false)
    setDone({ ok, fail: errors.length, errors })
    if (ok) toast.success(`Imported ${ok} employee${ok !== 1 ? 's' : ''}`)
  }

  const downloadTemplate = () => {
    const header = COLS.join(',')
    const example = [
      'EMP-1001,Mohammed Al-Otaibi,محمد العتيبي,m.alotaibi@sada.co,Sales Executive,مندوب مبيعات,Saudi,male,2026-07-01,permanent,0551234567,Operations',
      'EMP-1002,Sara Khan,سارة خان,s.khan@sada.co,Accountant,محاسبة,Pakistani,female,2026-07-01,permanent,,Finance',
    ]
    const blob = new Blob([[header, ...example].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'SADA-employees-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F6F9', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: '#0D1B2A' }}>
        <StatusBar />
        <div style={{ padding: '6px 16px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button aria-label="Back" onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', color: 'white' }}>
            <i className="ti ti-chevron-left" style={{ fontSize: 20 }} />
          </button>
          <h1 style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Import Employees</h1>
        </div>
      </div>

      <PageContent>
        {/* Step 1: pick file */}
        <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 12, lineHeight: 1.5 }}>
            Upload a CSV with columns: <b>{COLS.join(', ')}</b>. Required: employee_number, full_name_en, work_email, job_title_en.
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => onPick(e.target.files?.[0])} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ background: '#17B8D0', color: 'white', border: 'none', borderRadius: 11, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <i className="ti ti-upload" /> Choose CSV
            </button>
            <button onClick={downloadTemplate}
              style={{ background: '#F4F6F9', color: '#2D3748', border: '1px solid #E2E8F0', borderRadius: 11, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <i className="ti ti-file-download" /> Template
            </button>
          </div>
          {fileName && <div style={{ fontSize: 12, color: '#718096', marginTop: 10 }}><i className="ti ti-file-text" /> {fileName} · {rows.length} rows · {valid.length} valid</div>}
        </div>

        {/* Step 2: preview */}
        {rows.length > 0 && !done && (
          <div style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A202C', marginBottom: 10 }}>Preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: r.errors.length ? '#FFF5F5' : '#F0FBF6' }}>
                  <i className={`ti ti-${r.errors.length ? 'alert-circle' : 'circle-check'}`} style={{ color: r.errors.length ? '#E24B4A' : '#1D9E75', fontSize: 16, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#2D3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.data.full_name_en || `Line ${r.line}`}</div>
                    {r.errors.length > 0 && <div style={{ fontSize: 10.5, color: '#E24B4A' }}>{r.errors.join(' · ')}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={runImport} disabled={importing || valid.length === 0}
              style={{ width: '100%', marginTop: 12, background: valid.length ? '#1D9E75' : '#CBD5E0', color: 'white', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: valid.length && !importing ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {importing ? 'Importing…' : `Import ${valid.length} employee${valid.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Step 3: results */}
        {done && (
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A202C', marginBottom: 6 }}>Import complete</div>
            <div style={{ fontSize: 13, color: '#1D9E75', marginBottom: done.fail ? 8 : 0 }}>✓ {done.ok} imported</div>
            {done.fail > 0 && (<>
              <div style={{ fontSize: 13, color: '#E24B4A', marginBottom: 6 }}>✗ {done.fail} failed:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                {done.errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: '#718096' }}>{e}</div>)}
              </div>
            </>)}
            <button onClick={() => navigate('/hr/employees')}
              style={{ width: '100%', marginTop: 14, background: '#17B8D0', color: 'white', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Done
            </button>
          </div>
        )}
      </PageContent>
    </div>
  )
}
