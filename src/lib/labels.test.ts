import { describe, it, expect } from 'vitest'
import {
  humanize, roleLabel, statusLabel, contractTypeLabel,
  leaveTypeLabel, requestTypeLabel, urgencyLabel, genderLabel, label,
} from '@/lib/labels'

describe('humanize (generic fallback)', () => {
  it('title-cases snake_case', () => expect(humanize('study_leave')).toBe('Study Leave'))
  it('title-cases kebab-case', () => expect(humanize('half-day')).toBe('Half Day'))
  it('preserves known acronyms', () => {
    expect(humanize('hr_officer')).toBe('HR Officer')
    expect(humanize('eos')).toBe('EOS')
  })
  it('returns em dash for empty/null/undefined', () => {
    expect(humanize('')).toBe('—')
    expect(humanize(null)).toBe('—')
    expect(humanize(undefined)).toBe('—')
  })
})

describe('mapped labels (curated wording)', () => {
  it('roles', () => {
    expect(roleLabel('hr_officer')).toBe('HR Officer')
    expect(roleLabel('admin')).toBe('Admin')
  })
  it('statuses', () => {
    expect(statusLabel('on_leave')).toBe('On Leave')
    expect(statusLabel('in_review')).toBe('In Review')
    expect(statusLabel('processing')).toBe('In Review') // both normalise to review stage
    expect(statusLabel('todo')).toBe('To Do')
  })
  it('contract types', () => expect(contractTypeLabel('fixed_term')).toBe('Fixed Term'))
  it('leave types append "Leave"', () => expect(leaveTypeLabel('annual')).toBe('Annual Leave'))
  it('request types', () => expect(requestTypeLabel('experience_letter')).toBe('Experience Letter'))
  it('urgency', () => expect(urgencyLabel('urgent')).toBe('Urgent'))
  it('gender', () => expect(genderLabel('female')).toBe('Female'))
})

describe('unmapped values never leak raw', () => {
  it('falls back to humanize for unknown enum', () => {
    expect(statusLabel('quantum_pending')).toBe('Quantum Pending')
    expect(roleLabel('super_admin')).toBe('Super Admin')
  })
  it('generic label === humanize', () => expect(label('some_value')).toBe('Some Value'))
})
