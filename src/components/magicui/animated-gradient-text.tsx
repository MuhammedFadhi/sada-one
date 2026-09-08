import { cn } from '@/lib/utils'
import type { ReactNode, CSSProperties } from 'react'

export function AnimatedGradientText({
  children,
  className,
  speed = 3,
}: {
  children: ReactNode
  className?: string
  speed?: number
}) {
  return (
    <span
      style={
        {
          '--speed': `${speed}s`,
          backgroundImage: 'linear-gradient(90deg, #17B8D0, #C8A96E, #7F77DD, #17B8D0)',
          backgroundSize: '300% 100%',
          animation: 'gradient var(--speed) infinite linear',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        } as CSSProperties
      }
      className={cn('font-bold', className)}
    >
      {children}
    </span>
  )
}
