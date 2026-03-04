'use client'

import { Sparkles } from 'lucide-react'
import { AiRenderModal } from './ai-render-modal'
import { useAiRenderStore } from './ai-render-store'

export function AiRenderButton() {
  const isOpen = useAiRenderStore((s) => s.isOpen)
  const open = useAiRenderStore((s) => s.open)
  const close = useAiRenderStore((s) => s.close)

  return (
    <>
      <button
        onClick={open}
        className="group flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-600/90 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition-all hover:bg-indigo-500 hover:shadow-indigo-500/25 hover:scale-105 active:scale-95"
      >
        <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
        <span className="hidden sm:inline whitespace-nowrap">AI Render</span>
      </button>
      <AiRenderModal isOpen={isOpen} onClose={close} />
    </>
  )
}
