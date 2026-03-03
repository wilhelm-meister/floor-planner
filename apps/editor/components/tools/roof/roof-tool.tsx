'use client'

import {
  type AnyNode,
  type AnyNodeId,
  emitter,
  type LevelNode,
  RoofNode,
  type WallEvent,
  type WallNode,
  useScene,
} from '@pascal-app/core'
import { sceneRegistry } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useRef, useState } from 'react'
import { Color, DoubleSide, MeshBasicMaterial } from 'three'
import { sfxEmitter } from '@/lib/sfx-bus'
import useEditor from '@/store/use-editor'

const DEFAULT_HEIGHT = 1.5
const DEFAULT_WALL_HEIGHT = 2.5
const BASE_HEIGHT = 0.5   // must match roof-system knee wall
const PADDING = 0.3
const SNAP_DIST = 0.1     // tolerance for shared endpoint detection

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/** Returns true if two 2-D points are within SNAP_DIST of each other. */
function ptClose(a: [number, number], b: [number, number]) {
  return Math.abs(a[0] - b[0]) < SNAP_DIST && Math.abs(a[1] - b[1]) < SNAP_DIST
}

/** BFS: find all walls connected to `startId` via shared endpoints. */
function findConnectedWalls(startId: string, allWalls: WallNode[]): WallNode[] {
  const byId = new Map(allWalls.map((w) => [w.id as string, w]))
  const visited = new Set<string>()
  const queue = [startId as string]

  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const w = byId.get(id)
    if (!w) continue

    for (const other of allWalls) {
      if (visited.has(other.id)) continue
      if (
        ptClose(w.start, other.start) ||
        ptClose(w.start, other.end) ||
        ptClose(w.end, other.start) ||
        ptClose(w.end, other.end)
      ) {
        queue.push(other.id)
      }
    }
  }

  return allWalls.filter((w) => visited.has(w.id))
}

/** Bounding box of a set of walls (with padding). */
function wallsBBox(walls: WallNode[]) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  let wallHeight = DEFAULT_WALL_HEIGHT
  for (const w of walls) {
    minX = Math.min(minX, w.start[0], w.end[0])
    maxX = Math.max(maxX, w.start[0], w.end[0])
    minZ = Math.min(minZ, w.start[1], w.end[1])
    maxZ = Math.max(maxZ, w.start[1], w.end[1])
    if (w.height) wallHeight = w.height
  }
  minX -= PADDING; maxX += PADDING
  minZ -= PADDING; maxZ += PADDING
  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    length: maxX - minX,
    width: maxZ - minZ,
    wallHeight,
  }
}

/** Get all wall nodes that are children of a level. */
function getLevelWalls(levelId: string): WallNode[] {
  const { nodes } = useScene.getState()
  const level = nodes[levelId as AnyNodeId] as LevelNode | undefined
  if (!level) return []
  return level.children
    .map((id) => nodes[id as AnyNodeId])
    .filter((n): n is WallNode => n?.type === 'wall')
}

/** Highlight or un-highlight a set of wall meshes. */
const HIGHLIGHT_COLOR = new Color('#818cf8')
const originalColors = new Map<string, Color>()

function setWallHighlight(wallIds: string[], on: boolean) {
  for (const id of wallIds) {
    const mesh = sceneRegistry.nodes.get(id)
    if (!mesh) continue
    mesh.traverse((child: any) => {
      if (!child.isMesh) return
      const mat = child.material as MeshBasicMaterial
      if (!mat) return
      if (on) {
        if (!originalColors.has(id)) originalColors.set(id, mat.color.clone())
        mat.color.copy(HIGHLIGHT_COLOR)
      } else {
        const orig = originalColors.get(id)
        if (orig) mat.color.copy(orig)
        originalColors.delete(id)
      }
      mat.needsUpdate = true
    })
  }
}

/** Place a roof over a bounding box, sitting on top of the walls. */
function placeRoof(levelId: string, bbox: ReturnType<typeof wallsBBox>, floorY: number): string {
  const { createNode, nodes } = useScene.getState()
  const roofY = floorY + bbox.wallHeight - BASE_HEIGHT
  const slopeWidth = Math.max(bbox.width / 2, 0.5)
  const roofCount = Object.values(nodes).filter((n) => n.type === 'roof').length
  const roof = RoofNode.parse({
    name: `Roof ${roofCount + 1}`,
    position: [bbox.centerX, roofY, bbox.centerZ],
    length: Math.max(bbox.length, 1),
    height: DEFAULT_HEIGHT,
    leftWidth: slopeWidth,
    rightWidth: slopeWidth,
  })
  createNode(roof, levelId as AnyNodeId)
  sfxEmitter.emit('sfx:structure-build')
  return roof.id
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export const RoofTool: React.FC = () => {
  const currentLevelId = useViewer((state) => state.selection.levelId)
  const setSelection = useViewer((state) => state.setSelection)

  // IDs of currently highlighted connected walls
  const highlightedRef = useRef<string[]>([])
  // BBox of hovered group (for preview mesh)
  const [hoveredBBox, setHoveredBBox] = useState<{
    centerX: number; centerZ: number; length: number; width: number; floorY: number
  } | null>(null)

  useEffect(() => {
    if (!currentLevelId) return

    const onWallEnter = (e: WallEvent) => {
      e.stopPropagation()
      const allWalls = getLevelWalls(currentLevelId)
      const connected = findConnectedWalls(e.node.id, allWalls)
      const ids = connected.map((w) => w.id)

      // Un-highlight previous group
      setWallHighlight(highlightedRef.current, false)

      // Highlight new group
      setWallHighlight(ids, true)
      highlightedRef.current = ids

      const bbox = wallsBBox(connected)
      setHoveredBBox({ ...bbox, floorY: e.position[1] })
    }

    const onWallLeave = (e: WallEvent) => {
      e.stopPropagation()
      setWallHighlight(highlightedRef.current, false)
      highlightedRef.current = []
      setHoveredBBox(null)
    }

    const onWallClick = (e: WallEvent) => {
      e.stopPropagation()
      if (!currentLevelId) return

      const allWalls = getLevelWalls(currentLevelId)
      const connected = findConnectedWalls(e.node.id, allWalls)
      const bbox = wallsBBox(connected)

      // Un-highlight before placing
      setWallHighlight(highlightedRef.current, false)
      highlightedRef.current = []
      setHoveredBBox(null)

      const roofId = placeRoof(currentLevelId, bbox, e.position[1])
      setSelection({ selectedIds: [roofId as AnyNode['id']] })
      useEditor.getState().setMode('select')
    }

    const onCancel = () => {
      setWallHighlight(highlightedRef.current, false)
      highlightedRef.current = []
      setHoveredBBox(null)
      useEditor.getState().setMode('select')
    }

    emitter.on('wall:enter', onWallEnter)
    emitter.on('wall:leave', onWallLeave)
    emitter.on('wall:click', onWallClick)
    emitter.on('tool:cancel', onCancel)

    return () => {
      // Clean up highlights on unmount
      setWallHighlight(highlightedRef.current, false)
      highlightedRef.current = []

      emitter.off('wall:enter', onWallEnter)
      emitter.off('wall:leave', onWallLeave)
      emitter.off('wall:click', onWallClick)
      emitter.off('tool:cancel', onCancel)
    }
  }, [currentLevelId, setSelection])

  return (
    <>
      {/* Semi-transparent preview rectangle over hovered wall group */}
      {hoveredBBox && hoveredBBox.length > 0.1 && hoveredBBox.width > 0.1 && (
        <mesh
          position={[hoveredBBox.centerX, hoveredBBox.floorY + 0.02, hoveredBBox.centerZ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[hoveredBBox.length, hoveredBBox.width]} />
          <meshBasicMaterial
            color="#818cf8"
            opacity={0.2}
            transparent
            side={DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  )
}
