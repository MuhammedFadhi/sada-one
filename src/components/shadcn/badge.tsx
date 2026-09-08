import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-teal/15 text-teal',
        gold:        'border-transparent bg-gold/15 text-gold-dark',
        success:     'border-transparent bg-green-100 text-green-700',
        warning:     'border-transparent bg-orange-100 text-orange-700',
        destructive: 'border-transparent bg-red-100 text-red-700',
        purple:      'border-transparent bg-purple-100 text-purple-700',
        outline:     'border-current text-foreground',
        navy:        'border-transparent bg-navy/10 text-navy',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
