'use client'

import {
  type AnyNode,
  type AnyNodeId,
  emitter,
  type LevelNode,
  RoofNode,
  sceneRegistry,
  type WallEvent,
  type WallNode,
  useScene,
} from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useRef, useState } from 'react'
import { DoubleSide } from 'three'
import { sfxEmitter } from '@/lib/sfx-bus'
import useEditor from '@/store/use-editor'

const DEFAULT_HEIGHT = 1.5
const DEFAULT_WALL_HEIGHT = 2.5
const BASE_HEIGHT = 0.5   // must match knee-wall height in roof-system
const PADDING = 0   // roof-system already adds eaveOverhang + rakeOverhang on top
const SNAP_DIST = 0.1

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function ptClose(a: [number, number], b: [number, number]) {
  return Math.abs(a[0] - b[0]) < SNAP_DIST && Math.abs(a[1] - b[1]) < SNAP_DIST
}

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
      if (visited.has(other.id as string)) continue
      if (
        ptClose(w.start, other.start) || ptClose(w.start, other.end) ||
        ptClose(w.end, other.start)   || ptClose(w.end, other.end)
      ) queue.push(other.id as string)
    }
  }

  return allWalls.filter((w) => visited.has(w.id as string))
}

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

function getLevelWalls(levelId: string): WallNode[] {
  const { nodes } = useScene.getState()
  const level = nodes[levelId as AnyNodeId] as LevelNode | undefined
  if (!level) return []
  return level.children
    .map((id) => nodes[id as AnyNodeId])
    .filter((n): n is WallNode => n?.type === 'wall')
}

/** Returns the world-space floor Y of a level (from its Three.js group). */
function getLevelFloorY(levelId: string): number {
  return sceneRegistry.nodes.get(levelId)?.position.y ?? 0
}

function placeRoof(levelId: string, bbox: ReturnType<typeof wallsBBox>): string {
  const { createNode, nodes } = useScene.getState()
  const floorY = getLevelFloorY(levelId)
  // roof position Y so that knee-wall base aligns with top of walls
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

type PreviewBBox = {
  centerX: number; centerZ: number
  length: number; width: number
  floorY: number
} | null

export const RoofTool: React.FC = () => {
  const currentLevelId = useViewer((state) => state.selection.levelId)
  const setSelection = useViewer((state) => state.setSelection)
  const [preview, setPreview] = useState<PreviewBBox>(null)
  const lastWallIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentLevelId) return

    const onWallEnter = (e: WallEvent) => {
      e.stopPropagation()
      lastWallIdRef.current = e.node.id as string
      const allWalls = getLevelWalls(currentLevelId)
      const connected = findConnectedWalls(e.node.id as string, allWalls)
      const bbox = wallsBBox(connected)
      const floorY = getLevelFloorY(currentLevelId)
      setPreview({ ...bbox, floorY })
    }

    const onWallLeave = (e: WallEvent) => {
      e.stopPropagation()
      if (lastWallIdRef.current === (e.node.id as string)) {
        lastWallIdRef.current = null
        setPreview(null)
      }
    }

    const onWallClick = (e: WallEvent) => {
      e.stopPropagation()
      if (!currentLevelId) return
      const allWalls = getLevelWalls(currentLevelId)
      const connected = findConnectedWalls(e.node.id as string, allWalls)
      const bbox = wallsBBox(connected)
      const roofId = placeRoof(currentLevelId, bbox)
      setPreview(null)
      lastWallIdRef.current = null
      setSelection({ selectedIds: [roofId as AnyNode['id']] })
      useEditor.getState().setMode('select')
    }

    const onCancel = () => {
      setPreview(null)
      lastWallIdRef.current = null
      useEditor.getState().setMode('select')
    }

    emitter.on('wall:enter', onWallEnter)
    emitter.on('wall:leave', onWallLeave)
    emitter.on('wall:click', onWallClick)
    emitter.on('tool:cancel', onCancel)

    return () => {
      setPreview(null)
      lastWallIdRef.current = null
      emitter.off('wall:enter', onWallEnter)
      emitter.off('wall:leave', onWallLeave)
      emitter.off('wall:click', onWallClick)
      emitter.off('tool:cancel', onCancel)
    }
  }, [currentLevelId, setSelection])

  if (!preview || preview.length < 0.1 || preview.width < 0.1) return null

  return (
    <mesh
      position={[preview.centerX, preview.floorY + 0.02, preview.centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[preview.length, preview.width]} />
      <meshBasicMaterial
        color="#818cf8"
        opacity={0.25}
        transparent
        side={DoubleSide}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
