'use client'

import { useEffect, useRef } from 'react'
import { PersonStanding } from 'lucide-react'
import useEditor from '@/store/use-editor'

/**
 * WalkthroughCursor — HTML overlay that shows a mannequin icon next to the mouse cursor
 * when in walkthrough placement mode.
 */
export function WalkthroughCursor() {
  const mode = useEditor((state) => state.mode)
  const walkthroughActive = useEditor((state) => state.walkthroughActive)
  const containerRef = useRef<HTMLDivElement>(null)

  const isPlacement = mode === 'walkthrough' && !walkthroughActive

  useEffect(() => {
    if (!isPlacement) return

    const onMove = (e: MouseEvent) => {
      if (containerRef.current) {
        containerRef.current.style.left = `${e.clientX + 16}px`
        containerRef.current.style.top = `${e.clientY + 4}px`
      }
    }

    document.addEventListener('mousemove', onMove)
    
    // Hide default cursor on canvas
    const canvas = document.querySelector('canvas')
    if (canvas) canvas.style.cursor = 'none'

    return () => {
      document.removeEventListener('mousemove', onMove)
      if (canvas) canvas.style.cursor = ''
    }
  }, [isPlacement])

  if (!isPlacement) return null

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed z-50"
      style={{ left: -100, top: -100 }}
    >
      <div className="flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-600/80 px-1.5 py-1 shadow-lg backdrop-blur-sm">
        <PersonStanding className="h-5 w-5 text-white" />
        <span className="text-xs font-medium text-white/90 whitespace-nowrap">Click to place</span>
      </div>
    </div>
  )
}
