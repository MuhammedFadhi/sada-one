import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useSalesData, useUploadSales, useClearSales, useFeatureEnabled } from '@/hooks/useData'
import { StatusBar, PageContent, EmptyState, formatSAR, SkeletonList } from '@/components/ui'
import { GRANULARITIES, bucketize, byBranch, type Granularity, type Bucket } from '@/lib/features'
import { downloadSalesTemplate, parseSalesFile } from '@/lib/salesXlsx'
import toast from 'react-hot-toast'

const COLORS = ['#17B8D0', '#C8A96E', '#1D9E75', '#7F77DD', '#E67E22', '#E24B4A', '#3B82F6', '#EC4899']
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`

function BarChart({ data, color = '#17B8D0', currency = false }: { data: Bucket[]; metric?: string; color?: string; currency?: boolean }) {
  const vals = data.map(d => d.revenue)
  const max = Math.max(1, ...vals)
  const W = Math.max(data.length * 56, 280), H = 200, pad = 28
  const bw = Math.min(38, (W - pad) / data.length - 10)
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <line x1={0} y1={H - pad} x2={W} y2={H - pad} stroke="#EDF1F7" strokeWidth={1} />
        {data.map((d, i) => {
          const h = ((d.revenue / max) * (H - pad - 24))
          const x = pad + i * ((W - pad) / data.length)
          const y = H - pad - h
          return (
            <g key={d.key}>
              <rect x={x} y={y} width={bw} height={h} rx={4} fill={color} opacity={0.92} />
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#1A202C">{fmtK(d.revenue)}</text>
              <text x={x + bw / 2} y={H - pad + 13} textAnchor="middle" fontSize={9} fill="#718096">{d.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function SalesAnalyticsPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const enabled = useFeatureEnabled('sales_analytics')
  const canView = ['finance', 'admin', 'manager', 'hr_officer'].includes(profile?.role ?? '')
  const canEdit = ['finance', 'admin'].includes(profile?.role ?? '')

  const { data: rows, isLoading } = useSalesData()
  const uploadMut = useUploadSales()
  const clearMut = useClearSales()
  const fileRef = useRef<HTMLInputElement>(null)

  const [gran, setGran] = useState<Granularity>('month')
  const [branch, setBranch] = useState<string>('all')

  const branches = useMemo(() => [...new Set((rows ?? []).map(r => r.branch))].sort(), [rows])
  const filtered = useMemo(() => (rows ?? []).filter(r => branch === 'all' || r.branch === branch), [rows, branch])
  const buckets = useMemo(() => bucketize(filtered, gran), [filtered, gran])
  const branchTotals = useMemo(() => byBranch(rows ?? []), [rows])

  const kpi = useMemo(() => filtered.reduce((a, r) => ({
    revenue: a.revenue + r.revenue, units: a.units + r.units, tx: a.tx + r.transactions,
  }), { revenue: 0, units: 0, tx: 0 }), [filtered])
  const aov = kpi.tx ? kpi.revenue / kpi.tx : 0

  if (!enabled) return <Blocked navigate={navigate} title="Sales Analytics is turned off" sub="An administrator has disabled this feature for your role." />
  if (!canView) return <Blocked navigate={navigate} title="No access" sub="Sales analytics is available to Finance, Admin, HR and Managers." />

  const onPick = async (f?: File | null) => {
    if (!f) return
    const t = toast.loading('Reading file…')
    try {
      const { rows: parsed, errors, total } = await parseSalesFile(f)
      if (!parsed.length) { toast.error(`No valid rows found${errors[0] ? `: ${errors[0]}` : ''}`, { id: t }); return }
      const n = await uploadMut.mutateAsync(parsed)
      toast.success(`Imported ${n} of ${total} rows${errors.length ? ` (${errors.length} skipped)` : ''}`, { id: t })
    } catch (e: any) { toast.error(e.message ?? 'Import failed', { id: t }) }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 14 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Sales Analytics</h1>
          {canEdit && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={downloadSalesTemplate} title="Download template" style={iconBtn}><i className="ti ti-file-download" /></button>
              <button onClick={() => fileRef.current?.click()} style={{ ...iconBtn, background: '#17B8D0' }}><i className="ti ti-upload" /> Import</button>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => onPick(e.target.files?.[0])} />
      </div>

      <PageContent>
        {isLoading && <SkeletonList />}
        {!isLoading && !rows?.length && (
          <div>
            <EmptyState icon="chart-bar-off" title="No sales data yet" subtitle={canEdit ? 'Download the template, fill it, and import.' : 'Ask Finance to upload sales data.'} />
            {canEdit && (
              <button onClick={downloadSalesTemplate} style={{ width: '100%', marginTop: 12, background: '#17294A', color: 'white', border: 'none', borderRadius: 12, padding: 13, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                <i className="ti ti-file-download" /> Download Excel Template
              </button>
            )}
          </div>
        )}

        {!isLoading && !!rows?.length && (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <Kpi label="Revenue" value={formatSAR(kpi.revenue)} color="#1D9E75" icon="coin" />
              <Kpi label="Transactions" value={kpi.tx.toLocaleString()} color="#17B8D0" icon="receipt" />
              <Kpi label="Units Sold" value={kpi.units.toLocaleString()} color="#C8A96E" icon="package" />
              <Kpi label="Avg Order" value={formatSAR(aov)} color="#7F77DD" icon="trending-up" />
            </div>

            {/* Branch filter */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
              <Chip active={branch === 'all'} onClick={() => setBranch('all')} label="All branches" />
              {branches.map(b => <Chip key={b} active={branch === b} onClick={() => setBranch(b)} label={b} />)}
            </div>

            {/* Granularity */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
              {GRANULARITIES.map(g => <Chip key={g.key} active={gran === g.key} onClick={() => setGran(g.key)} label={g.label} tone="#17294A" />)}
            </div>

            {/* Revenue over time */}
            <Card title={`Revenue · ${GRANULARITIES.find(g => g.key === gran)!.label}${branch !== 'all' ? ` · ${branch}` : ''}`}>
              {buckets.length ? <BarChart data={buckets} color="#17B8D0" currency /> : <Muted>No data for this period.</Muted>}
            </Card>

            {/* Branch comparison */}
            <Card title="Branch vs Branch (total revenue)">
              {branchTotals.length ? (
                <div>
                  {branchTotals.map((b, i) => {
                    const max = Math.max(...branchTotals.map(x => x.revenue), 1)
                    return (
                      <div key={b.key} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: '#1A202C' }}>{b.label}</span>
                          <span style={{ color: '#718096' }}>{formatSAR(b.revenue)}</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 6, background: '#EDF1F7', overflow: 'hidden' }}>
                          <div style={{ width: `${(b.revenue / max) * 100}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 6 }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#A0AEC0', marginTop: 2 }}>{b.transactions.toLocaleString()} tx · {b.units.toLocaleString()} units</div>
                      </div>
                    )
                  })}
                </div>
              ) : <Muted>No branches.</Muted>}
            </Card>

            {/* Period table */}
            <Card title="Breakdown">
              <div style={{ fontSize: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr .8fr', gap: 4, padding: '6px 0', borderBottom: '1px solid #EDF1F7', color: '#A0AEC0', fontWeight: 600, fontSize: 10 }}>
                  <span>PERIOD</span><span style={{ textAlign: 'right' }}>REVENUE</span><span style={{ textAlign: 'right' }}>TX</span><span style={{ textAlign: 'right' }}>UNITS</span>
                </div>
                {buckets.map(b => (
                  <div key={b.key} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr .8fr', gap: 4, padding: '7px 0', borderBottom: '1px solid #F7FAFC' }}>
                    <span style={{ fontWeight: 600, color: '#1A202C' }}>{b.label}</span>
                    <span style={{ textAlign: 'right', color: '#1D9E75', fontWeight: 600 }}>{formatSAR(b.revenue)}</span>
                    <span style={{ textAlign: 'right', color: '#718096' }}>{b.transactions.toLocaleString()}</span>
                    <span style={{ textAlign: 'right', color: '#718096' }}>{b.units.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>

            {canEdit && (
              <button onClick={() => { if (confirm('Delete ALL sales records? This cannot be undone.')) clearMut.mutate(undefined, { onSuccess: () => toast.success('Sales data cleared') }) }}
                style={{ width: '100%', marginTop: 4, background: '#E24B4A12', color: '#E24B4A', border: '1px solid #E24B4A33', borderRadius: 12, padding: 12, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                <i className="ti ti-trash" /> Clear all sales data
              </button>
            )}
          </>
        )}
      </PageContent>
    </div>
  )
}

const iconBtn: React.CSSProperties = { background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }
const Muted = ({ children }: any) => <div style={{ textAlign: 'center', color: '#A0AEC0', fontSize: 12, padding: 16 }}>{children}</div>

function Kpi({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <i className={`ti ti-${icon}`} style={{ color, fontSize: 15 }} />
        <span style={{ fontSize: 10, color: '#A0AEC0', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#1A202C' }}>{value}</div>
    </div>
  )
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A202C', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}
function Chip({ active, onClick, label, tone = '#17B8D0' }: { active: boolean; onClick: () => void; label: string; tone?: string }) {
  return (
    <button onClick={onClick} style={{ whiteSpace: 'nowrap', background: active ? tone : '#F1F5F9', color: active ? 'white' : '#475569', border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>{label}</button>
  )
}
function Blocked({ navigate, title, sub }: { navigate: any; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 14 }}><StatusBar /><div style={{ padding: '4px 16px 0' }}><h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Sales Analytics</h1></div></div>
      <PageContent><EmptyState icon="lock" title={title} subtitle={sub} />
        <button onClick={() => navigate(-1)} style={{ width: '100%', marginTop: 12, background: '#17294A', color: 'white', border: 'none', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Go back</button>
      </PageContent>
    </div>
  )
}
