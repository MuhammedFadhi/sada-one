'use client'
import { cn } from '@/lib/utils'
import type { CSSProperties, ReactNode } from 'react'

type TColorProp = string | string[]

interface ShineBorderProps {
  borderRadius?: number
  borderWidth?: number
  duration?: number
  color?: TColorProp
  className?: string
  children: ReactNode
}

export function ShineBorder({
  borderRadius = 16,
  borderWidth = 1.5,
  duration = 6,
  color = ['#17B8D0', '#C8A96E', '#7F77DD'],
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={
        {
          '--border-radius': `${borderRadius}px`,
          '--border-width':  `${borderWidth}px`,
          '--border-color':  Array.isArray(color) ? color.join(', ') : color,
          '--duration':      `${duration}s`,
          '--mask':          `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          '--shine':         `conic-gradient(from calc(270deg - (90deg/2)), transparent 0, var(--border-color), transparent 90deg)`,
        } as CSSProperties
      }
      className={cn(
        'relative w-full overflow-hidden rounded-[var(--border-radius)] bg-card p-[var(--border-width)]',
        'before:absolute before:inset-0 before:z-0',
        'before:[background:var(--shine)] before:[background-size:300%_300%]',
        'before:animate-shine',
        'before:[WebkitMask:var(--mask)] before:[mask:var(--mask)]',
        'before:[WebkitMask-composite:xor] before:[mask-composite:exclude]',
        className
      )}
    >
      <div className="relative z-10 h-full rounded-[calc(var(--border-radius)-var(--border-width))] bg-card">{children}</div>
    </div>
  )
}
