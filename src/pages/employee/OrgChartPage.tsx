import { useMemo, useState } from 'react'
import { useEmployees } from '@/hooks/useData'
import { StatusBar, PageContent, Avatar, SkeletonList } from '@/components/ui'

type Emp = {
  id: string
  full_name_en: string
  job_title_en?: string | null
  avatar_url?: string | null
  manager_id?: string | null
  division?: { name_en?: string } | null
}

type Node = Emp & { children: Node[] }

function buildTree(employees: Emp[]): Node[] {
  const byId = new Map<string, Node>()
  employees.forEach(e => byId.set(e.id, { ...e, children: [] }))
  const roots: Node[] = []
  byId.forEach(node => {
    const parent = node.manager_id ? byId.get(node.manager_id) : undefined
    if (parent && parent.id !== node.id) parent.children.push(node)
    else roots.push(node)
  })
  const sort = (arr: Node[]) => {
    arr.sort((a, b) => a.full_name_en.localeCompare(b.full_name_en))
    arr.forEach(n => sort(n.children))
  }
  sort(roots)
  return roots
}

function countReports(node: Node): number {
  return node.children.reduce((sum, c) => sum + 1 + countReports(c), 0)
}

function OrgNode({ node, depth, expandedAll }: { node: Node; depth: number; expandedAll: boolean }) {
  const [open, setOpen] = useState(depth < 1)
  const isOpen = expandedAll || open
  const hasChildren = node.children.length > 0
  const reports = hasChildren ? countReports(node) : 0

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(o => !o)}
        aria-expanded={hasChildren ? isOpen : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
          background: 'white', border: '1px solid rgba(13,27,42,.05)', borderRadius: 14,
          padding: '10px 12px', marginBottom: 8, marginLeft: depth * 16,
          cursor: hasChildren ? 'pointer' : 'default',
          boxShadow: '0 1px 2px rgba(13,27,42,.04), 0 4px 12px rgba(13,27,42,.04)',
          fontFamily: 'inherit',
        }}>
        <Avatar name={node.full_name_en} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.full_name_en}
          </div>
          <div style={{ fontSize: 11, color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.job_title_en || '—'}{node.division?.name_en ? ` · ${node.division.name_en}` : ''}
          </div>
        </div>
        {hasChildren && (
          <>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#17B8D0', background: '#EBF8FF',
              borderRadius: 20, padding: '2px 8px', flexShrink: 0,
            }}>{reports}</span>
            <i className={`ti ti-chevron-${isOpen ? 'down' : 'right'}`}
              style={{ color: '#A0AEC0', fontSize: 16, flexShrink: 0 }} />
          </>
        )}
      </button>
      {hasChildren && isOpen && node.children.map(c => (
        <OrgNode key={c.id} node={c} depth={depth + 1} expandedAll={expandedAll} />
      ))}
    </div>
  )
}

export function OrgChartPage() {
  const { data: employees, isLoading, isError } = useEmployees({ status: 'active' })
  const [query, setQuery] = useState('')
  const [expandedAll, setExpandedAll] = useState(false)

  const tree = useMemo(() => buildTree((employees as Emp[]) ?? []), [employees])

  const filtered = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    return ((employees as Emp[]) ?? []).filter(e =>
      e.full_name_en.toLowerCase().includes(q) ||
      (e.job_title_en ?? '').toLowerCase().includes(q) ||
      (e.division?.name_en ?? '').toLowerCase().includes(q)
    )
  }, [employees, query])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 16 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Org Chart</h1>
          <button onClick={() => setExpandedAll(v => !v)}
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: 'white', fontSize: 11, fontWeight: 600, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {expandedAll ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </div>

      <PageContent>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', fontSize: 16 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people…"
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white' }}
          />
        </div>

        {isLoading && <SkeletonList rows={6} />}
        {isError && <div style={{ textAlign: 'center', color: '#E24B4A', padding: 40, fontSize: 13 }}>Couldn't load employees.</div>}

        {!isLoading && !isError && filtered && (
          filtered.length === 0
            ? <div style={{ textAlign: 'center', color: '#A0AEC0', padding: 40, fontSize: 13 }}>No matches for “{query}”.</div>
            : filtered.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid rgba(13,27,42,.05)', borderRadius: 14, padding: '10px 12px', marginBottom: 8, boxShadow: '0 1px 2px rgba(13,27,42,.04)' }}>
                  <Avatar name={e.full_name_en} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A202C' }}>{e.full_name_en}</div>
                    <div style={{ fontSize: 11, color: '#718096' }}>{e.job_title_en || '—'}{e.division?.name_en ? ` · ${e.division.name_en}` : ''}</div>
                  </div>
                </div>
              ))
        )}

        {!isLoading && !isError && !filtered && (
          tree.length === 0
            ? <div style={{ textAlign: 'center', color: '#A0AEC0', padding: 40, fontSize: 13 }}>No employees yet.</div>
            : tree.map(root => <OrgNode key={root.id} node={root} depth={0} expandedAll={expandedAll} />)
        )}
      </PageContent>
    </div>
  )
}
