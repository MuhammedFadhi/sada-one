// xlsx (SheetJS) is ~400 KB. It is imported dynamically so it is NOT bundled
// into the SalesAnalyticsPage chunk — it loads only when the user actually
// downloads the template or uploads a file.
import type { SaleRow } from '@/lib/features'

const HEADERS = ['Date', 'Branch', 'Revenue', 'Units', 'Transactions', 'Category']

/** Download a pre-formatted Excel template with example rows. (async: loads xlsx on demand) */
export async function downloadSalesTemplate() {
  const XLSX = await import('xlsx')
  const example = [
    { Date: '2026-06-01', Branch: 'Al Khobar', Revenue: 15400, Units: 120, Transactions: 85, Category: 'RO Filters' },
    { Date: '2026-06-01', Branch: 'Dammam',    Revenue: 9800,  Units: 75,  Transactions: 60, Category: 'RO Filters' },
    { Date: '2026-06-02', Branch: 'Al Khobar', Revenue: 17250, Units: 134, Transactions: 92, Category: 'Service' },
  ]
  const ws = XLSX.utils.json_to_sheet(example, { header: HEADERS })
  ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 18 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sales')
  XLSX.writeFile(wb, 'SADA-Sales-Template.xlsx')
}

function toISODate(v: any): string | null {
  if (!v) return null
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0 }
const int = (v: any) => Math.round(num(v))

export interface ParseResult { rows: SaleRow[]; errors: string[]; total: number }

/** Parse an uploaded .xlsx/.csv into validated sales rows. (async: loads xlsx on demand) */
export async function parseSalesFile(file: File): Promise<ParseResult> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return { rows: [], errors: ['The file has no sheets.'], total: 0 }
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })
  const rows: SaleRow[] = []
  const errors: string[] = []
  json.forEach((r, i) => {
    const branch = String(r.Branch ?? r.branch ?? '').trim()
    const date = toISODate(r.Date ?? r.date)
    if (!branch || !date) { errors.push(`Row ${i + 2}: missing Branch or Date`); return }
    rows.push({
      branch, date,
      revenue: num(r.Revenue ?? r.revenue),
      units: int(r.Units ?? r.units),
      transactions: int(r.Transactions ?? r.transactions),
      category: String(r.Category ?? r.category ?? '').trim() || null,
    })
  })
  return { rows, errors, total: json.length }
}
