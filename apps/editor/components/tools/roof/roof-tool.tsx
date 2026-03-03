'use client'

import {
  type AnyNode,
  type AnyNodeId,
  emitter,
  type GridEvent,
  type LevelNode,
  RoofNode,
  type WallNode,
  useScene,
} from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useRef, useState } from 'react'
import { BufferGeometry, DoubleSide, type Group, Vector3 } from 'three'
import { sfxEmitter } from '@/lib/sfx-bus'
import useEditor from '@/store/use-editor'
import { CursorSphere } from '../shared/cursor-sphere'

const DEFAULT_HEIGHT = 1.5
const DEFAULT_WALL_HEIGHT = 2.5
const BASE_HEIGHT = 0.5 // knee wall height from roof-system (must match)
const GRID_OFFSET = 0.02
const PADDING = 0.3 // small padding around wall bounding box

/**
 * Calculates the bounding box of all walls in a level.
 * Returns null if no walls found.
 */
function getWallBoundingBox(levelId: string): {
  minX: number; maxX: number; minZ: number; maxZ: number
  centerX: number; centerZ: number
  length: number; width: number
  wallHeight: number
} | null {
  const { nodes } = useScene.getState()
  const level = nodes[levelId as AnyNodeId] as LevelNode | undefined
  if (!level) return null

  const walls = level.children
    .map((id) => nodes[id as AnyNodeId])
    .filter((n): n is WallNode => n?.type === 'wall')

  if (walls.length === 0) return null

  let minX = Infinity, maxX = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  let wallHeight = DEFAULT_WALL_HEIGHT

  for (const w of walls) {
    minX = Math.min(minX, w.start[0], w.end[0])
    maxX = Math.max(maxX, w.start[0], w.end[0])
    minZ = Math.min(minZ, w.start[1], w.end[1])
    maxZ = Math.max(maxZ, w.start[1], w.end[1])
    if (w.height) wallHeight = w.height
  }

  // Add padding
  minX -= PADDING; maxX += PADDING
  minZ -= PADDING; maxZ += PADDING

  return {
    minX, maxX, minZ, maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    length: maxX - minX,
    width: maxZ - minZ,
    wallHeight,
  }
}

/**
 * Places a roof auto-fitted to the walls of the given level.
 * roofBaseY: the floor Y of the level (from grid click).
 */
function commitAutoFitRoof(levelId: string, roofBaseY: number): RoofNode['id'] {
  const { createNode, nodes } = useScene.getState()
  const bbox = getWallBoundingBox(levelId)

  // Roof Y: position so base sits at top of walls
  const level = nodes[levelId as AnyNodeId] as LevelNode | undefined
  const walls = level ? level.children
    .map((id) => nodes[id as AnyNodeId])
    .filter((n): n is WallNode => n?.type === 'wall') : []
  const wallHeight = walls.find((w) => w.height)?.height ?? DEFAULT_WALL_HEIGHT
  // roofY = floorY + wallHeight - BASE_HEIGHT so that roof base = floorY + wallHeight
  const roofY = roofBaseY + wallHeight - BASE_HEIGHT

  let centerX = 0, centerZ = 0, length = 8, slopeWidth = 3

  if (bbox) {
    centerX = bbox.centerX
    centerZ = bbox.centerZ
    length = Math.max(bbox.length, 1)
    slopeWidth = Math.max(bbox.width / 2, 0.5)
  }

  const roofCount = Object.values(nodes).filter((n) => n.type === 'roof').length
  const name = `Roof ${roofCount + 1}`

  const roof = RoofNode.parse({
    name,
    position: [centerX, roofY, centerZ],
    length,
    height: DEFAULT_HEIGHT,
    leftWidth: slopeWidth,
    rightWidth: slopeWidth,
  })

  createNode(roof, levelId as AnyNodeId)
  sfxEmitter.emit('sfx:structure-build')
  return roof.id
}

export const RoofTool: React.FC = () => {
  const cursorRef = useRef<Group>(null)
  const currentLevelId = useViewer((state) => state.selection.levelId)
  const setSelection = useViewer((state) => state.setSelection)
  const [previewBbox, setPreviewBbox] = useState<{
    centerX: number; centerZ: number; length: number; width: number; levelY: number
  } | null>(null)
  const [cursorPos, setCursorPos] = useState<[number, number, number]>([0, 0, 0])

  // Show bbox preview on mount
  useEffect(() => {
    if (!currentLevelId) return
    const bbox = getWallBoundingBox(currentLevelId)
    if (bbox) {
      setPreviewBbox({ ...bbox, levelY: 0 })
    }
  }, [currentLevelId])

  useEffect(() => {
    if (!currentLevelId) return

    const onGridMove = (event: GridEvent) => {
      if (!cursorRef.current) return
      const y = event.position[1]
      cursorRef.current.position.set(event.position[0], y + GRID_OFFSET, event.position[2])
      setCursorPos([event.position[0], y, event.position[2]])

      // Keep bbox preview updated with current levelY
      const bbox = getWallBoundingBox(currentLevelId)
      if (bbox) {
        setPreviewBbox({ ...bbox, levelY: y })
      }
    }

    const onGridClick = (event: GridEvent) => {
      if (!currentLevelId) return
      const y = event.position[1]
      const roofId = commitAutoFitRoof(currentLevelId, y)
      setSelection({ selectedIds: [roofId as AnyNode['id']] })
      // Switch back to select mode after placement
      useEditor.getState().setMode('select')
    }

    const onCancel = () => {
      useEditor.getState().setMode('select')
    }

    emitter.on('grid:move', onGridMove)
    emitter.on('grid:click', onGridClick)
    emitter.on('tool:cancel', onCancel)

    return () => {
      emitter.off('grid:move', onGridMove)
      emitter.off('grid:click', onGridClick)
      emitter.off('tool:cancel', onCancel)
    }
  }, [currentLevelId, setSelection])

  return (
    <group>
      {/* Cursor */}
      <CursorSphere ref={cursorRef} />

      {/* Auto-fit preview rectangle over walls */}
      {previewBbox && previewBbox.length > 0.1 && previewBbox.width > 0.1 && (
        <>
          {/* Fill */}
          <mesh
            position={[previewBbox.centerX, previewBbox.levelY + GRID_OFFSET, previewBbox.centerZ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[previewBbox.length, previewBbox.width]} />
            <meshBasicMaterial
              color="#818cf8"
              opacity={0.15}
              transparent
              side={DoubleSide}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>

          {/* Border */}
          {/* @ts-ignore */}
          <line frustumCulled={false} renderOrder={1}>
            <bufferGeometry
              onUpdate={(geo) => {
                const { centerX, centerZ, length, width, levelY } = previewBbox
                const y = levelY + GRID_OFFSET
                const hw = length / 2; const hd = width / 2
                const pts = [
                  new Vector3(centerX - hw, y, centerZ - hd),
                  new Vector3(centerX + hw, y, centerZ - hd),
                  new Vector3(centerX + hw, y, centerZ + hd),
                  new Vector3(centerX - hw, y, centerZ + hd),
                  new Vector3(centerX - hw, y, centerZ - hd),
                ]
                geo.setFromPoints(pts)
              }}
            />
            <lineBasicNodeMaterial color="#818cf8" linewidth={2} depthTest={false} depthWrite={false} opacity={0.8} transparent />
          </line>
        </>
      )}

      {/* Helper text when no walls found */}
      {!previewBbox && (
        <group position={[cursorPos[0], cursorPos[1] + 0.5, cursorPos[2]]} />
      )}
    </group>
  )
}
