import { cn } from '@/lib/utils'

interface MeteorsProps {
  number?: number
  className?: string
}

export function Meteors({ number = 20, className }: MeteorsProps) {
  const meteors = new Array(number).fill(true)
  return (
    <>
      {meteors.map((_, idx) => (
        <span
          key={idx}
          className={cn(
            'animate-meteor pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-0.5 rotate-[215deg] rounded-full bg-white shadow-[0_0_0_1px_#ffffff10]',
            'before:absolute before:top-1/2 before:h-px before:w-[50px] before:-translate-y-1/2 before:transform before:bg-gradient-to-r before:from-[#64748b] before:to-transparent before:content-[\'\']',
            className
          )}
          style={{
            top:  `${Math.floor(Math.random() * 100)}%`,
            left: `${Math.floor(Math.random() * 100)}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.floor(Math.random() * 8) + 4}s`,
          }}
        />
      ))}
    </>
  )
}
