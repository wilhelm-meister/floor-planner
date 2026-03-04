'use client'

import { useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import { useViewer } from '@pascal-app/viewer'
import { useScene } from '@pascal-app/core'

/**
 * LockCursor — zeigt ein Schloss-Icon neben dem Cursor wenn über einem gelockte Node gehovert wird.
 */
export function LockCursor() {
  const hoveredId = useViewer((state) => state.hoveredId)
  const nodes = useScene((state) => state.nodes)
  const containerRef = useRef<HTMLDivElement>(null)

  const hoveredNode = hoveredId ? nodes[hoveredId as keyof typeof nodes] : null
  const isLocked = !!(hoveredNode as any)?.locked

  useEffect(() => {
    if (!isLocked) return

    const onMove = (e: MouseEvent) => {
      if (containerRef.current) {
        containerRef.current.style.left = `${e.clientX + 14}px`
        containerRef.current.style.top = `${e.clientY - 10}px`
      }
    }

    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [isLocked])

  if (!isLocked) return null

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed z-50 flex items-center justify-center"
      style={{ left: -999, top: -999 }}
    >
      <div className="bg-black/70 text-amber-400 rounded-md p-1 shadow-lg backdrop-blur-sm">
        <Lock className="w-3.5 h-3.5" />
      </div>
    </div>
  )
}
