'use client'

import { create } from 'zustand'
import type { Interactive } from '../schema/nodes/item'
import type { AnyNodeId } from '../schema/types'
import { useScene } from './use-scene'

// Runtime value for each control (matches discriminated union kinds)
export type ControlValue = boolean | number

export type ItemInteractiveState = {
  // Indexed by control position in asset.interactive.controls[]
  controlValues: ControlValue[]
}

type InteractiveStore = {
  items: Record<AnyNodeId, ItemInteractiveState>

  /** Initialize a node's interactive state from its asset definition (idempotent).
   *  If savedValues are provided (loaded from Supabase), they take precedence over defaults. */
  initItem: (itemId: AnyNodeId, interactive: Interactive, savedValues?: (boolean | number)[]) => void

  /** Set a single control value */
  setControlValue: (itemId: AnyNodeId, index: number, value: ControlValue) => void

  /** Remove a node's state (e.g. on unmount) */
  removeItem: (itemId: AnyNodeId) => void
}

const defaultControlValue = (interactive: Interactive, index: number): ControlValue => {
  const control = interactive.controls[index]
  if (!control) return false
  switch (control.kind) {
    case 'toggle':
      return control.default ?? false
    case 'slider':
      return control.default ?? control.min
    case 'temperature':
      return control.default ?? control.min
  }
}

export const useInteractive = create<InteractiveStore>((set, get) => ({
  items: {},

  initItem: (itemId, interactive, savedValues?) => {
    const { controls } = interactive
    if (controls.length === 0) return

    // If savedValues match length, use them (persisted state from Supabase)
    // Otherwise fall back to defaults (new item or schema mismatch)
    const controlValues = savedValues && savedValues.length === controls.length
      ? savedValues
      : controls.map((_, i) => defaultControlValue(interactive, i))

    set((state) => ({
      items: {
        ...state.items,
        [itemId]: { controlValues },
      },
    }))
  },

  setControlValue: (itemId, index, value) => {
    set((state) => {
      const item = state.items[itemId]
      if (!item) return state
      const next = [...item.controlValues]
      next[index] = value
      // Persist to scene (triggers Supabase auto-save)
      try {
        useScene.getState().updateNode(itemId, { controlValues: next } as any)
      } catch {
        // Scene might not be ready (e.g. viewer-only mode)
      }
      return { items: { ...state.items, [itemId]: { controlValues: next } } }
    })
  },

  removeItem: (itemId) => {
    set((state) => {
      const { [itemId]: _, ...rest } = state.items
      return { items: rest }
    })
  },
}))
