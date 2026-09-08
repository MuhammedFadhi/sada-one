import { describe, it, expect } from 'vitest'
import {
  formatDate, formatDateShort, formatDayMonth, formatDateLong,
  formatMonthYear, formatTime, formatDateTime, formatDayName, formatRelative,
} from '@/lib/dates'

// 25 August 2026, 14:30 local
const D = new Date(2026, 7, 25, 14, 30)

describe('Gregorian dd/mm/yyyy formatting', () => {
  it('formats the house format', () => expect(formatDate(D)).toBe('25/08/2026'))
  it('zero-pads single digits', () => expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026'))
  it('short form', () => expect(formatDateShort(D)).toBe('25 Aug 2026'))
  it('day + month', () => expect(formatDayMonth(D)).toBe('25 Aug'))
  it('long form', () => expect(formatDateLong(D)).toBe('25 August 2026'))
  it('month + year', () => expect(formatMonthYear(D)).toBe('Aug 2026'))
  it('24-hour time', () => expect(formatTime(D)).toBe('14:30'))
  it('date + time', () => expect(formatDateTime(D)).toBe('25/08/2026 14:30'))
  it('weekday', () => expect(formatDayName(D)).toBe('Tue, 25 Aug'))
})

describe('never renders a Hijri year', () => {
  // The Hijri year for Aug 2026 is 1447/1448. If a locale calendar ever
  // sneaks back in, these catch it.
  it('year is Gregorian', () => {
    for (const out of [formatDate(D), formatDateShort(D), formatDateLong(D), formatDateTime(D)]) {
      expect(out).toContain('2026')
      expect(out).not.toMatch(/14[45]\d/)
    }
  })
  it('is independent of the ambient locale', () => {
    // Built from getDate/getMonth/getFullYear, so no Intl involvement at all.
    expect(formatDate('2026-08-25T10:00:00')).toBe('25/08/2026')
  })
})

describe('bad input is handled', () => {
  it('null / undefined / empty', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
  it('unparseable string', () => expect(formatDate('not-a-date')).toBe('—'))
})

describe('relative time', () => {
  it('recent', () => expect(formatRelative(new Date(Date.now() - 30_000))).toBe('just now'))
  it('minutes', () => expect(formatRelative(new Date(Date.now() - 5 * 60_000))).toBe('5m ago'))
  it('hours', () => expect(formatRelative(new Date(Date.now() - 3 * 3600_000))).toBe('3h ago'))
  it('yesterday', () => expect(formatRelative(new Date(Date.now() - 30 * 3600_000))).toBe('yesterday'))
})
