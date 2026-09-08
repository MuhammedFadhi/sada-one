'use client'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactElement } from 'react'

export function AnimatedList({
  className,
  children,
  delay = 1000,
}: {
  className?: string
  children: ReactElement | ReactElement[]
  delay?: number
}) {
  const [index, setIndex] = useState(0)
  const childrenArray = useMemo(() => (Array.isArray(children) ? children : [children]).flat(), [children])

  useEffect(() => {
    if (index < childrenArray.length - 1) {
      const t = setTimeout(() => setIndex(i => i + 1), delay)
      return () => clearTimeout(t)
    }
  }, [index, delay, childrenArray.length])

  const itemsToShow = useMemo(() => childrenArray.slice(0, index + 1).reverse(), [index, childrenArray])

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ''}`}>
      <AnimatePresence>
        {itemsToShow.map(item => (
          <AnimatedListItem key={(item as ReactElement).key}>
            {item}
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  )
}

function AnimatedListItem({ children }: { children: ReactElement }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, originY: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 40 }}
      className="mx-auto w-full"
    >
      {children}
    </motion.div>
  )
}
