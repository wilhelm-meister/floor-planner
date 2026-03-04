import { create } from 'zustand'

type AiRenderStore = {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useAiRenderStore = create<AiRenderStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
