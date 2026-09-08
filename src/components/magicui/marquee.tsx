import { cn } from '@/lib/utils'
import type { ReactNode, CSSProperties } from 'react'

interface MarqueeProps {
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  children?: ReactNode
  vertical?: boolean
  repeat?: number
  speed?: number
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  speed = 40,
}: MarqueeProps) {
  return (
    <div
      style={{ '--duration': `${speed}s`, '--gap': '1rem' } as CSSProperties}
      className={cn(
        'group flex overflow-hidden [gap:var(--gap)]',
        vertical ? 'flex-col' : 'flex-row',
        className
      )}
    >
      {Array(repeat).fill(0).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex shrink-0 justify-around [gap:var(--gap)]',
            vertical
              ? 'animate-marquee-vert flex-col'
              : 'animate-marquee flex-row',
            reverse && '[animation-direction:reverse]',
            pauseOnHover && 'group-hover:[animation-play-state:paused]'
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
