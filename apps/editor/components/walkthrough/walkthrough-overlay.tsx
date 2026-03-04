'use client'

import { useViewer } from '@pascal-app/viewer'
import { DoorOpen } from 'lucide-react'
import useEditor from '@/store/use-editor'

/**
 * WalkthroughOverlay — HTML overlay rendered outside the Canvas.
 * Shows the "Exit Walkthrough" button and a crosshair when walkthrough is active.
 */
export function WalkthroughOverlay() {
  const walkthroughActive = useEditor((state) => state.walkthroughActive)
  const setWalkthroughActive = useEditor((state) => state.setWalkthroughActive)
  const setWalkthroughPosition = useEditor((state) => state.setWalkthroughPosition)
  const previousWallMode = useEditor((state) => state.previousWallMode)
  const setPreviousWallMode = useEditor((state) => state.setPreviousWallMode)
  const setWallMode = useViewer((state) => state.setWallMode)

  if (!walkthroughActive) return null

  const handleExit = () => {
    // Unlock pointer if active
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }

    setWalkthroughActive(false)
    setWalkthroughPosition(null)
    if (previousWallMode) {
      setWallMode(previousWallMode)
      setPreviousWallMode(null)
    }
    useEditor.getState().setMode('select')
  }

  return (
    <>
      {/* Crosshair */}
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
        <div className="relative h-6 w-6">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/70" />
          <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-white/70" />
        </div>
      </div>

      {/* Exit button */}
      <div className="pointer-events-auto fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={handleExit}
          className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-600/90 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition-all hover:bg-violet-500 hover:scale-105 active:scale-95"
        >
          <DoorOpen className="h-4 w-4" />
          <span>Exit Walkthrough</span>
          <kbd className="ml-1 rounded bg-white/20 px-1 py-0.5 text-xs">ESC</kbd>
        </button>
      </div>
    </>
  )
}
