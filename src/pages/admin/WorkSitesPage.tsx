import { useState } from 'react'
import { useWorkSites, useSaveWorkSite, useDeleteWorkSite, useSetting, useUpdateSetting } from '@/hooks/useData'
import { getGeoFix } from '@/lib/geo'
import { StatusBar, PageContent, BottomSheet, EmptyState, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'

type SiteForm = { id?: string; name: string; city: string; latitude: string; longitude: string; radius_m: number; is_active: boolean }
const EMPTY: SiteForm = { name: '', city: 'Al Khobar', latitude: '', longitude: '', radius_m: 150, is_active: true }

export function WorkSitesPage() {
  const { data: sites, isLoading } = useWorkSites()
  const saveMut = useSaveWorkSite()
  const delMut = useDeleteWorkSite()
  const geofenceOn = useSetting<boolean>('attendance.geofence_enabled', false)
  const updateSetting = useUpdateSetting()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SiteForm>(EMPTY)
  const [locating, setLocating] = useState(false)

  const openNew = () => { setForm(EMPTY); setOpen(true) }
  const openEdit = (s: any) => { setForm({ id: s.id, name: s.name, city: s.city ?? 'Al Khobar', latitude: String(s.latitude), longitude: String(s.longitude), radius_m: s.radius_m, is_active: s.is_active }); setOpen(true) }

  const useMyLocation = async () => {
    setLocating(true)
    const fix = await getGeoFix()
    setLocating(false)
    if (fix.lat == null) return toast.error('Could not get location — enable GPS and allow access.')
    setForm(p => ({ ...p, latitude: fix.lat!.toFixed(6), longitude: fix.lng!.toFixed(6) }))
    toast.success(`Pinned to your location${fix.accuracy ? ` (±${Math.round(fix.accuracy)}m)` : ''}`)
  }

  const save = async () => {
    const lat = Number(form.latitude), lng = Number(form.longitude)
    if (!form.name.trim()) return toast.error('Site name required')
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180)
      return toast.error('Enter valid coordinates (use “My location”)')
    try {
      await saveMut.mutateAsync({ id: form.id, name: form.name.trim(), city: form.city, latitude: lat, longitude: lng, radius_m: form.radius_m, is_active: form.is_active })
      toast.success(form.id ? 'Site updated' : 'Site added'); setOpen(false)
    } catch (e: any) { toast.error(e.message ?? 'Save failed') }
  }

  const remove = async (id: string) => {
    try { await delMut.mutateAsync(id); toast.success('Site removed') }
    catch (e: any) { toast.error(e.message ?? 'Delete failed') }
  }

  const toggleGeofence = async (v: boolean) => {
    try { await updateSetting.mutateAsync({ key: 'attendance.geofence_enabled', value: v }); toast.success(v ? 'Geofencing ON' : 'Geofencing OFF') }
    catch { toast.error('Could not update setting') }
  }

  const lat = Number(form.latitude), lng = Number(form.longitude)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
  const d = 0.01
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#0D1B2A', paddingBottom: 16 }}>
        <StatusBar />
        <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Work Sites</h1>
          <button onClick={openNew} style={{ background: '#17B8D0', border: 'none', borderRadius: 8, padding: '6px 14px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-plus" /> Add
          </button>
        </div>
      </div>

      <PageContent>
        {/* Geofence master switch */}
        <div style={{ background: geofenceOn ? '#1D9E7512' : 'white', border: `1px solid ${geofenceOn ? '#1D9E7544' : '#EDF1F7'}`, borderRadius: 14, padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: (geofenceOn ? '#1D9E75' : '#718096') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-map-pin-cog" style={{ color: geofenceOn ? '#1D9E75' : '#718096', fontSize: 20 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A202C' }}>Geofenced check-in</div>
            <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>{geofenceOn ? 'Check-in only inside an active site radius' : 'Check-in allowed from anywhere'}</div>
          </div>
          <button onClick={() => toggleGeofence(!geofenceOn)} disabled={updateSetting.isPending}
            style={{ width: 46, height: 27, borderRadius: 14, border: 'none', background: geofenceOn ? '#1D9E75' : '#CBD5E0', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: geofenceOn ? 22 : 3, width: 21, height: 21, borderRadius: '50%', background: 'white', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </button>
        </div>

        {geofenceOn && !sites?.some(s => s.is_active) && (
          <div style={{ background: '#E67E2212', border: '1px solid #E67E2244', borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 12, color: '#9C5510' }}>
            ⚠️ Geofencing is on but no site is active — check-in stays open until you activate a site below.
          </div>
        )}

        {isLoading && <SkeletonList />}
        {!isLoading && !sites?.length && <EmptyState icon="map-pin-off" title="No work sites" subtitle="Add an office location and radius." />}

        {sites?.map((s: any) => (
          <div key={s.id} style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: (s.is_active ? '#17B8D0' : '#CBD5E0') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-map-pin" style={{ color: s.is_active ? '#17B8D0' : '#A0AEC0', fontSize: 22 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A202C' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>{s.city ? s.city + ' · ' : ''}r {s.radius_m}m · {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: s.is_active ? '#1D9E75' : '#A0AEC0', background: (s.is_active ? '#1D9E75' : '#A0AEC0') + '15', padding: '3px 8px', borderRadius: 6 }}>{s.is_active ? 'ACTIVE' : 'OFF'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => openEdit(s)} style={{ flex: 1, background: '#F7FAFC', border: '1px solid #EDF1F7', borderRadius: 9, padding: '8px 0', fontSize: 12, fontWeight: 600, color: '#1A202C', cursor: 'pointer', fontFamily: 'inherit' }}><i className="ti ti-edit" /> Edit</button>
              <button onClick={() => remove(s.id)} style={{ background: '#E24B4A12', border: '1px solid #E24B4A33', borderRadius: 9, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#E24B4A', cursor: 'pointer', fontFamily: 'inherit' }}><i className="ti ti-trash" /></button>
            </div>
          </div>
        ))}
      </PageContent>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Work Site' : 'Add Work Site'}>
        <div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div><div className="form-label">Site Name</div><input className="input" placeholder="Head Office" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><div className="form-label">City</div>
              <select className="input" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}>
                {['Al Khobar', 'Dammam', 'Jubail', 'Dhahran', 'Riyadh', 'Jeddah'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button onClick={useMyLocation} disabled={locating}
            style={{ width: '100%', background: '#17294A', color: 'white', border: 'none', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i className="ti ti-current-location" /> {locating ? 'Locating…' : 'Use my current location'}
          </button>

          <div className="form-row" style={{ marginBottom: 12 }}>
            <div><div className="form-label">Latitude</div><input className="input" inputMode="decimal" placeholder="26.2794" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} /></div>
            <div><div className="form-label">Longitude</div><input className="input" inputMode="decimal" placeholder="50.2083" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Radius</span><span style={{ color: '#17B8D0', fontWeight: 700 }}>{form.radius_m} m</span></div>
            <input type="range" min={25} max={1000} step={25} value={form.radius_m} onChange={e => setForm(p => ({ ...p, radius_m: Number(e.target.value) }))} style={{ width: '100%', accentColor: '#17B8D0' }} />
            <div style={{ fontSize: 10, color: '#A0AEC0', marginTop: 2 }}>100–200 m suits most offices (GPS drifts 20–50 m).</div>
          </div>

          {mapSrc && (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #EDF1F7', marginBottom: 12, height: 180 }}>
              <iframe title="map" src={mapSrc} style={{ width: '100%', height: '100%', border: 0 }} loading="lazy" />
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, cursor: 'pointer' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>Active</span>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#1D9E75' }} />
          </label>

          <button onClick={save} disabled={saveMut.isPending}
            style={{ width: '100%', background: '#17B8D0', color: 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saveMut.isPending ? .7 : 1 }}>
            {saveMut.isPending ? 'Saving…' : form.id ? 'Save Changes' : 'Add Site'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
