import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/ui'

describe('<StatusBadge> (render + labels integration)', () => {
  it('humanises the raw status via labels.ts', () => {
    render(<StatusBadge status="on_leave" />)
    expect(screen.getByText('On Leave')).toBeInTheDocument()
  })
  it('an explicit label overrides the mapped one', () => {
    render(<StatusBadge status="pending" label="Awaiting HR" />)
    expect(screen.getByText('Awaiting HR')).toBeInTheDocument()
  })
  it('applies the status → CSS class mapping', () => {
    const { container } = render(<StatusBadge status="approved" />)
    expect(container.querySelector('.badge-success')).toBeTruthy()
  })
})
