'use client'

import NextImage from 'next/image'
import { ActionButton } from "./action-button";

import { cn } from '@/lib/utils'
import useEditor, { CatalogCategory, StructureTool, Tool } from '@/store/use-editor'
import { useContextualTools } from '@/hooks/use-contextual-tools'
import { LevelNode, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useState, useEffect, useRef } from 'react'

export type ToolConfig = {
   id: StructureTool; iconSrc: string; label: string; catalogCategory?: CatalogCategory }

export const tools: ToolConfig[] = [
  { id: 'wall', iconSrc: '/icons/wall.png', label: 'Wall' },
  { id: 'slab', iconSrc: '/icons/floor.png', label: 'Slab' },
  { id: 'ceiling', iconSrc: '/icons/ceiling.png', label: 'Ceiling' },
  { id: 'roof', iconSrc: '/icons/roof.png', label: 'Gable Roof' },
  { id: 'door', iconSrc: '/icons/door.png', label: 'Door' },
  { id: 'window', iconSrc: '/icons/window.png', label: 'Window' },
  { id: 'zone', iconSrc: '/icons/zone.png', label: 'Zone' },
]

/** Auto-switch to the top level when roof tool is selected.
 *  Creates a second level if only one exists. */
function ensureRoofLevel(toastRef: React.MutableRefObject<((msg: string) => void) | null>) {
  const { nodes } = useScene.getState()
  const { selection, setSelection } = useViewer.getState()
  const { createNode } = useScene.getState()

  // Find the building
  const building = selection.buildingId ? nodes[selection.buildingId] : null
  if (!building || building.type !== 'building') return

  const levels = building.children
    .map((id) => nodes[id])
    .filter((n): n is LevelNode => n?.type === 'level')

  if (levels.length === 0) return

  if (levels.length === 1) {
    // Auto-create level 2
    const newLevel = LevelNode.parse({
      level: 1,
      children: [],
      parentId: building.id,
    })
    createNode(newLevel, building.id)
    setSelection({ levelId: newLevel.id })
    toastRef.current?.('Level 2 wurde automatisch angelegt.')
  } else {
    // Switch to the highest level
    const topLevel = levels[levels.length - 1]!
    if (selection.levelId !== topLevel.id) {
      setSelection({ levelId: topLevel.id })
      toastRef.current?.('Zur obersten Ebene gewechselt.')
    }
  }
}

export function StructureTools() {
  const activeTool = useEditor((state) => state.tool)
  const catalogCategory = useEditor((state) => state.catalogCategory)
  const structureLayer = useEditor((state) => state.structureLayer)
  const setTool   = useEditor((state) => state.setTool)
  const setCatalogCategory = useEditor((state) => state.setCatalogCategory)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastRef = useRef<((msg: string) => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  toastRef.current = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastMsg(msg)
    timerRef.current = setTimeout(() => setToastMsg(null), 3000)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const contextualTools = useContextualTools()

  const visibleTools = structureLayer === 'zones'
    ? tools.filter((t) => t.id === 'zone')
    : tools.filter((t) => t.id !== 'zone')

  return (
    <>
      {/* Roof level toast */}
      {toastMsg && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
          {toastMsg}
        </div>
      )}

      <div className="flex items-center gap-1.5 px-1">
        {visibleTools.map((tool, index) => {
          const isActive =
            activeTool === tool.id &&
            (tool.catalogCategory ? catalogCategory === tool.catalogCategory : true)

          const isContextual = contextualTools.includes(tool.id)

          return (
            <ActionButton
              key={`${tool.id}-${tool.catalogCategory ?? index}`}
              label={tool.label}
              className={cn(
                'rounded-lg duration-300',
                isActive ? 'bg-black/40 hover:bg-black/40 scale-110 z-10' : 'bg-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0 hover:bg-black/20 scale-95',
              )}
              onClick={() => {
                if (!isActive) {
                  setTool(tool.id)
                  setCatalogCategory(tool.catalogCategory ?? null)

                  if (useEditor.getState().mode !== 'build') {
                    useEditor.getState().setMode('build')
                  }

                  // No auto-level switch needed — roof auto-fits to walls
                }
              }}
              size="icon"
              variant="ghost"
            >
              <NextImage
                alt={tool.label}
                className="size-full object-contain"
                height={28}
                src={tool.iconSrc}
                width={28}
              />
            </ActionButton>
          )
        })}
      </div>
    </>
  )
}
