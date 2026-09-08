import { useEffect, useState } from 'react'

/**
 * Returns the height (px) the on-screen keyboard overlaps the layout viewport.
 * Uses VisualViewport so it works on iOS Safari (where `interactive-widget`
 * and `100dvh` do NOT shrink for the keyboard) as well as Android.
 * Returns 0 on desktop / when no keyboard is open.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop
      setInset(overlap > 40 ? Math.round(overlap) : 0) // ignore browser-chrome jitter
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
