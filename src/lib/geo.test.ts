import { describe, it, expect } from 'vitest'
import { distanceMeters, checkGeofence, type WorkSite } from '@/lib/geo'

// Points offset north of a fixed origin; reference distances computed
// independently (Python Haversine, R=6371000): 50m→49.94, 200m→199.78.
const O   = { lat: 26.2800, lng: 50.2000 }
const p50 = { lat: 26.2800 + 50 / 111320,  lng: 50.2000 }
const p130= { lat: 26.2800 + 130 / 111320, lng: 50.2000 }
const p200= { lat: 26.2800 + 200 / 111320, lng: 50.2000 }

const siteHQ = (over: Partial<WorkSite> = {}): WorkSite =>
  ({ id: 'A', name: 'HQ', latitude: O.lat, longitude: O.lng, radius_m: 100, is_active: true, ...over })

describe('distanceMeters (Haversine)', () => {
  it('is 0 for identical points', () => expect(distanceMeters(O, O)).toBeCloseTo(0, 5))
  it('~50m north', () => expect(distanceMeters(O, p50)).toBeCloseTo(49.94, 1))
  it('~200m north', () => expect(distanceMeters(O, p200)).toBeCloseTo(199.78, 1))
  it('~19.7km Khobar→Dammam', () =>
    expect(distanceMeters({ lat: 26.2794, lng: 50.2083 }, { lat: 26.4207, lng: 50.0888 }))
      .toBeGreaterThan(19000))
})

describe('checkGeofence (attendance gate)', () => {
  it('OFF when no active sites → ok', () => {
    expect(checkGeofence(p200, []).ok).toBe(true)
    expect(checkGeofence(p200, [siteHQ({ is_active: false })]).ok).toBe(true)
  })
  it('blocks when active sites exist but no GPS fix', () => {
    const r = checkGeofence({ accuracy: 20 }, [siteHQ()])
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('no_fix')
  })
  it('passes inside the radius', () => {
    const r = checkGeofence({ ...p50, accuracy: 0 }, [siteHQ()])
    expect(r.ok).toBe(true)
    expect(r.site?.id).toBe('A')
    expect(r.distance).toBeLessThan(100)
  })
  it('fails outside all radii, reports nearest', () => {
    const r = checkGeofence({ ...p200, accuracy: 0 }, [siteHQ()])
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('outside')
    expect(r.site?.id).toBe('A')
    expect(r.distance).toBeGreaterThan(150)
  })
  it('GPS accuracy slack lets a near-miss pass (130m from 100m site, ±50m)', () => {
    expect(checkGeofence({ ...p130, accuracy: 50 }, [siteHQ()]).ok).toBe(true)
  })
  it('caps GPS slack at 75m so a spoofed huge accuracy cannot bypass', () => {
    // 200m out, radius 100 + capped 75 = 175 < 200 → still blocked
    expect(checkGeofence({ ...p200, accuracy: 9999 }, [siteHQ()]).ok).toBe(false)
  })
  it('ignores inactive sites even if you are inside them', () => {
    const inactiveHere = siteHQ({ id: 'X', is_active: false, radius_m: 500 })
    const activeFar    = siteHQ({ id: 'Y', latitude: 26.5, longitude: 50.5, radius_m: 100 })
    const r = checkGeofence({ ...O, accuracy: 0 }, [inactiveHere, activeFar])
    expect(r.ok).toBe(false)
    expect(r.site?.id).toBe('Y')
  })
})
