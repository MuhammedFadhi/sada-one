// Geolocation helpers for geofenced attendance.

export interface LatLng { lat: number; lng: number }

/** Great-circle (Haversine) distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface GeoFix { lat?: number; lng?: number; accuracy?: number }

/** Resolve current position with accuracy. Never rejects — returns {} on failure/denied. */
export function getGeoFix(timeout = 8000): Promise<GeoFix> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) return resolve({})
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    )
  })
}

export interface WorkSite { id: string; name: string; latitude: number; longitude: number; radius_m: number; is_active: boolean }

export interface GeofenceResult { ok: boolean; site?: WorkSite; distance?: number; reason?: 'no_fix' | 'outside' }

/**
 * Check a fix against active sites. Passes if within (radius + GPS accuracy)
 * of any active site. With no active sites, geofencing is considered off → ok.
 */
export function checkGeofence(fix: GeoFix, sites: WorkSite[]): GeofenceResult {
  const active = sites.filter(s => s.is_active)
  if (active.length === 0) return { ok: true }
  if (fix.lat == null || fix.lng == null) return { ok: false, reason: 'no_fix' }

  const tolerance = Math.min(fix.accuracy ?? 0, 75) // cap GPS slack at 75m
  let nearest: WorkSite | undefined
  let nearestDist = Infinity
  for (const s of active) {
    const d = distanceMeters({ lat: fix.lat, lng: fix.lng }, { lat: s.latitude, lng: s.longitude })
    if (d < nearestDist) { nearestDist = d; nearest = s }
    if (d <= s.radius_m + tolerance) return { ok: true, site: s, distance: Math.round(d) }
  }
  return { ok: false, reason: 'outside', site: nearest, distance: Math.round(nearestDist) }
}
