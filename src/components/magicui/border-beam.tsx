import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

interface BorderBeamProps {
  size?: number
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
  className?: string
}

export function BorderBeam({
  size = 200,
  duration = 8,
  delay = 0,
  colorFrom = '#17B8D0',
  colorTo = '#C8A96E',
  className,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          '--size':     size,
          '--duration': duration,
          '--delay':    `-${delay}s`,
          '--color-from': colorFrom,
          '--color-to':   colorTo,
          '--angle':    '0turn',
        } as CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:1.5px_solid_transparent]',
        '[background:linear-gradient(var(--bg,white),var(--bg,white))_padding-box,',
        'conic-gradient(from_var(--angle),transparent_25%,var(--color-from),var(--color-to),transparent_75%)_border-box]',
        '[animation:spin-slow_var(--duration,8s)_linear_infinite]',
        '[animation-delay:var(--delay,0s)]',
        className
      )}
    />
  )
}
