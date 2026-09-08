import React, { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  children: React.ReactNode
}

export function ShimmerButton({
  shimmerColor = '#ffffff',
  shimmerSize = '0.1em',
  shimmerDuration = '2s',
  borderRadius = '14px',
  background = 'linear-gradient(135deg, #C8A96E 0%, #A8894E 100%)',
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={
        {
          '--spread':   '90deg',
          '--shimmer-color': shimmerColor,
          '--radius':   borderRadius,
          '--speed':    shimmerDuration,
          '--cut':      shimmerSize,
          '--bg':       background,
        } as CSSProperties
      }
      className={cn(
        'group relative z-0 flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap px-6 py-3.5',
        'rounded-[var(--radius)] border border-white/10',
        'text-white text-sm font-semibold',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl',
        'active:scale-[0.98]',
        '[background:var(--bg)]',
        className
      )}
      {...props}
    >
      {/* Shimmer overlay */}
      <div
        className={cn(
          'absolute inset-0 overflow-hidden rounded-[var(--radius)]',
          'before:absolute before:inset-0',
          'before:[background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]',
          'before:animate-shimmer before:[background-size:300%_300%]',
          'before:opacity-30'
        )}
      />
      {children}
    </button>
  )
}
