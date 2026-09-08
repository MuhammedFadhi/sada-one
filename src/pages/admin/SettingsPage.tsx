// ============================================================
// SA'DA ONE — Admin Settings (data-driven customization hub)
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSettings, useUpdateSetting } from '@/hooks/useData'
import { StatusBar, PageContent } from '@/components/ui'
import { Card } from '@/components/shadcn/card'
import { Input } from '@/components/shadcn/input'
import { Switch } from '@/components/shadcn/switch'
import { Skeleton } from '@/components/shadcn/skeleton'
import { BlurFade } from '@/components/magicui/blur-fade'
import toast from 'react-hot-toast'

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  branding: { label: 'Branding',  icon: 'palette',    color: '#C8A96E' },
  leave:    { label: 'Leave',     icon: 'beach',      color: '#17B8D0' },
  features: { label: 'Features',  icon: 'apps',       color: '#7F77DD' },
  company:  { label: 'Company',   icon: 'building',   color: '#1D9E75' },
  attendance: { label: 'Attendance', icon: 'clock-check', color: '#E67E22' },
  general:  { label: 'General',   icon: 'settings',   color: '#718096' },
}

const QUICK_LINKS = [
  { label: 'Features & Access',        icon: 'toggle-right',  color: '#E24B4A', path: '/admin/features' },
  { label: 'Sales Analytics',          icon: 'chart-bar',     color: '#17B8D0', path: '/analytics' },
  { label: 'Divisions & Departments', icon: 'sitemap',       color: '#1D9E75', path: '/admin/divisions' },
  { label: 'Work Sites (Geofence)',   icon: 'map-pin-cog',   color: '#17B8D0', path: '/admin/work-sites' },
  { label: 'Roles & Permissions',     icon: 'shield-lock',   color: '#7F77DD', path: '/admin/roles' },
  { label: 'Users',                   icon: 'users',         color: '#17B8D0', path: '/admin/users' },
  { label: 'Audit Log',               icon: 'history',       color: '#E67E22', path: '/admin/audit' },
]

function isColor(v: any) { return typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v) }
function isBool(v: any)  { return typeof v === 'boolean' }
function isNum(v: any)   { return typeof v === 'number' }

function SettingRow({ row, onSave }: { row: any; onSave: (key: string, value: any) => Promise<void> }) {
  const [val, setVal] = useState(row.value)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setVal(row.value); setDirty(false) }, [row.value])

  const commit = async (next: any) => {
    setSaving(true)
    try { await onSave(row.key, next); setDirty(false) } finally { setSaving(false) }
  }

  if (isBool(row.value)) {
    return (
      <div className="flex items-center justify-between py-3">
        <div className="min-w-0 pr-3">
          <div className="text-[13px] font-medium text-slate-800">{row.label ?? row.key}</div>
          {row.description && <div className="text-[11px] text-slate-400 mt-0.5">{row.description}</div>}
        </div>
        <Switch checked={!!val} onCheckedChange={(c) => { setVal(c); commit(c) }} />
      </div>
    )
  }

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[13px] font-medium text-slate-800">{row.label ?? row.key}</div>
        {dirty && (
          <button onClick={() => commit(val)} disabled={saving}
            className="text-[11px] font-semibold text-teal disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      {row.description && <div className="text-[11px] text-slate-400 mb-2">{row.description}</div>}
      <div className="flex items-center gap-2">
        {isColor(row.value) && (
          <input type="color" value={val} onChange={e => { setVal(e.target.value); setDirty(true) }}
            onBlur={() => dirty && commit(val)}
            className="h-9 w-10 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5" />
        )}
        <Input
          type={isNum(row.value) ? 'number' : 'text'}
          value={String(val ?? '')}
          onChange={e => {
            const next = isNum(row.value) ? Number(e.target.value) : e.target.value
            setVal(next); setDirty(true)
          }}
          onKeyDown={e => { if (e.key === 'Enter' && dirty) commit(val) }}
          className="flex-1"
        />
      </div>
    </div>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useSettings()
  const updateSetting = useUpdateSetting()

  const save = async (key: string, value: any) => {
    try {
      await updateSetting.mutateAsync({ key, value })
      toast.success('Saved')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save')
      throw e
    }
  }

  const grouped = (data?.rows ?? []).reduce((acc: Record<string, any[]>, r: any) => {
    (acc[r.category] ??= []).push(r); return acc
  }, {})
  const categories = Object.keys(grouped).sort((a, b) =>
    Object.keys(CATEGORY_META).indexOf(a) - Object.keys(CATEGORY_META).indexOf(b))

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-gradient-to-br from-navy to-navy-light pb-4 flex-shrink-0">
        <StatusBar />
        <div className="px-4 pt-1">
          <div className="text-[11px] text-white/50 mb-0.5">Administrator</div>
          <h1 className="text-white text-xl font-bold tracking-tight">Settings</h1>
        </div>
      </div>

      <PageContent>
        {/* Quick management links */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {QUICK_LINKS.map((l, i) => (
            <BlurFade key={l.path} delay={i * 0.04}>
              <button onClick={() => navigate(l.path)}
                className="w-full bg-white rounded-2xl p-3.5 flex items-center gap-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: l.color + '18' }}>
                  <i className={`ti ti-${l.icon} text-[18px]`} style={{ color: l.color }} />
                </div>
                <span className="text-[12px] font-semibold text-slate-700 leading-tight">{l.label}</span>
              </button>
            </BlurFade>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        )}

        {categories.map((cat, ci) => {
          const meta = CATEGORY_META[cat] ?? CATEGORY_META.general
          return (
            <BlurFade key={cat} delay={0.1 + ci * 0.05}>
              <Card className="mb-3 overflow-hidden border-slate-100">
                <div className="flex items-center gap-2.5 px-4 pt-4 pb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: meta.color + '18' }}>
                    <i className={`ti ti-${meta.icon} text-[15px]`} style={{ color: meta.color }} />
                  </div>
                  <div className="text-[13px] font-bold text-slate-800">{meta.label}</div>
                </div>
                <div className="px-4 pb-2 divide-y divide-slate-100">
                  {grouped[cat].map((row: any) => (
                    <SettingRow key={row.key} row={row} onSave={save} />
                  ))}
                </div>
              </Card>
            </BlurFade>
          )
        })}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-center text-[10px] text-slate-300 mt-2 mb-1">
          Changes apply instantly across the app
        </motion.div>
      </PageContent>
    </div>
  )
}
