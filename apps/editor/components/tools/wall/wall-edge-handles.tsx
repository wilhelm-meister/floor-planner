'use client'

import { emitter, type GridEvent, type AnyNodeId, type WallNode, useScene } from '@pascal-app/core'
import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { DoubleSide, Shape, ShapeGeometry, Vector3 } from 'three'
import useEditor from '@/store/use-editor'

type HandleTarget = 'start' | 'end' | null

const HANDLE_Y = 0.05
const HANDLE_RADIUS = 0.12
const LINE_Y = 0.02
const WALL_HEIGHT = 2.5

interface WallEdgeHandlesProps {
  wallId: string
}

/**
 * Wall edge handles:
 * - Yellow box highlight along selected wall
 * - Draggable endpoint spheres
 * - Preview mesh during drag (no expensive geometry rebuild on every move)
 * - Commits updateNode only on pointerUp
 */
export const WallEdgeHandles: React.FC<WallEdgeHandlesProps> = ({ wallId }) => {
  const node = useScene((s) => s.nodes[wallId as AnyNodeId] as WallNode | undefined)

  const [dragTarget, setDragTarget] = useState<HandleTarget>(null)
  const [hoveredHandle, setHoveredHandle] = useState<HandleTarget>(null)
  // Live drag positions (only for visual preview — no store writes during drag)
  const [liveStart, setLiveStart] = useState<[number, number] | null>(null)
  const [liveEnd, setLiveEnd] = useState<[number, number] | null>(null)
  const [wallLength, setWallLength] = useState<number | null>(null)

  const dragTargetRef = useRef<HandleTarget>(null)
  const nodeRef = useRef(node)
  nodeRef.current = node
  const liveStartRef = useRef<[number, number] | null>(null)
  const liveEndRef = useRef<[number, number] | null>(null)

  // Track drag position via grid:move — only update React state (no store writes)
  useEffect(() => {
    const onGridMove = (event: GridEvent) => {
      if (!dragTargetRef.current || !nodeRef.current) return

      const { snapEnabled, snapSize } = useEditor.getState()
      const snap = (v: number) => snapEnabled ? Math.round(v / snapSize) * snapSize : v
      const pos: [number, number] = [snap(event.position[0]), snap(event.position[2])]
      const n = nodeRef.current

      if (dragTargetRef.current === 'end') {
        liveEndRef.current = pos
        setLiveEnd(pos)
        const dx = pos[0] - n.start[0]
        const dz = pos[1] - n.start[1]
        setWallLength(Math.round(Math.sqrt(dx * dx + dz * dz) * 100) / 100)
      } else {
        liveStartRef.current = pos
        setLiveStart(pos)
        const dx = n.end[0] - pos[0]
        const dz = n.end[1] - pos[1]
        setWallLength(Math.round(Math.sqrt(dx * dx + dz * dz) * 100) / 100)
      }
    }

    emitter.on('grid:move', onGridMove)
    return () => emitter.off('grid:move', onGridMove)
  }, [])

  // Commit to store on pointerUp (single geometry rebuild)
  useEffect(() => {
    if (!dragTarget) return

    const onPointerUp = () => {
      const n = nodeRef.current
      if (n) {
        const updates: Partial<WallNode> = {}
        if (dragTargetRef.current === 'end' && liveEndRef.current) {
          updates.end = liveEndRef.current
        } else if (dragTargetRef.current === 'start' && liveStartRef.current) {
          updates.start = liveStartRef.current
        }
        if (Object.keys(updates).length > 0) {
          const scene = useScene.getState()
          scene.updateNode(wallId as AnyNodeId, updates)
          scene.dirtyNodes.add(wallId as AnyNodeId)
        }
      }

      useScene.temporal.getState().resume()

      // Suppress follow-up click so we don't accidentally deselect
      const suppressClick = (ce: MouseEvent) => {
        ce.stopImmediatePropagation()
        ce.preventDefault()
        window.removeEventListener('click', suppressClick, true)
      }
      window.addEventListener('click', suppressClick, true)
      requestAnimationFrame(() => window.removeEventListener('click', suppressClick, true))

      dragTargetRef.current = null
      liveStartRef.current = null
      liveEndRef.current = null
      setDragTarget(null)
      setLiveStart(null)
      setLiveEnd(null)
      setWallLength(null)
    }

    window.addEventListener('pointerup', onPointerUp, true)
    return () => window.removeEventListener('pointerup', onPointerUp, true)
  }, [dragTarget, wallId])

  if (!node) return null

  const startPos = liveStart ?? node.start
  const endPos = liveEnd ?? node.end

  const dx = endPos[0] - startPos[0]
  const dz = endPos[1] - startPos[1]
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = length > 0.01 ? Math.atan2(dz, dx) : 0
  const cx = (startPos[0] + endPos[0]) / 2
  const cz = (startPos[1] + endPos[1]) / 2
  const midX = cx
  const midZ = cz

  const isDragging = dragTarget !== null
  const highlightColor = isDragging ? '#facc15' : '#fbbf24'

  const getHandleColor = (target: 'start' | 'end') => {
    if (dragTarget === target) return '#facc15'
    if (hoveredHandle === target) return '#fde68a'
    return '#fbbf24'
  }

  // Build preview wall shape (like wall-tool preview) — only shown during drag
  const buildPreviewShape = () => {
    if (!isDragging || length < 0.01) return null
    const shape = new Shape()
    shape.moveTo(0, 0)
    shape.lineTo(length, 0)
    shape.lineTo(length, WALL_HEIGHT)
    shape.lineTo(0, WALL_HEIGHT)
    shape.closePath()
    return new ShapeGeometry(shape)
  }

  const previewGeo = isDragging ? buildPreviewShape() : null

  return (
    <group>
      {/* Yellow highlight box along the wall */}
      {length > 0.01 && (
        <mesh
          position={[cx, LINE_Y, cz]}
          rotation={[0, -angle, 0]}
        >
          <boxGeometry args={[length, 0.012, 0.04]} />
          <meshBasicMaterial
            color={highlightColor}
            transparent
            opacity={isDragging ? 1 : 0.85}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Preview wall mesh during drag (shows where the wall will land) */}
      {isDragging && previewGeo && (
        <mesh
          geometry={previewGeo}
          position={[startPos[0], 0, startPos[1]]}
          rotation={[0, -angle, 0]}
        >
          <meshBasicMaterial
            color="#818cf8"
            transparent
            opacity={0.35}
            side={DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Start handle */}
      <mesh
        position={[startPos[0], HANDLE_Y, startPos[1]]}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          dragTargetRef.current = 'start'
          liveStartRef.current = null
          setDragTarget('start')
          setLiveStart(null)
          useScene.temporal.getState().pause()
        }}
        onPointerEnter={(e) => { e.stopPropagation(); setHoveredHandle('start') }}
        onPointerLeave={(e) => { e.stopPropagation(); setHoveredHandle(null) }}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[HANDLE_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={getHandleColor('start')}
          emissive={getHandleColor('start')}
          emissiveIntensity={dragTarget === 'start' ? 0.8 : 0.4}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* End handle */}
      <mesh
        position={[endPos[0], HANDLE_Y, endPos[1]]}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          dragTargetRef.current = 'end'
          liveEndRef.current = null
          setDragTarget('end')
          setLiveEnd(null)
          useScene.temporal.getState().pause()
        }}
        onPointerEnter={(e) => { e.stopPropagation(); setHoveredHandle('end') }}
        onPointerLeave={(e) => { e.stopPropagation(); setHoveredHandle(null) }}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[HANDLE_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={getHandleColor('end')}
          emissive={getHandleColor('end')}
          emissiveIntensity={dragTarget === 'end' ? 0.8 : 0.4}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Length label during drag */}
      {wallLength !== null && (
        <group position={[midX, HANDLE_Y + 0.6, midZ]}>
          <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
            <div className="rounded-md border border-yellow-400 bg-yellow-500/90 px-2 py-0.5 text-xs font-mono font-medium text-black shadow-md backdrop-blur-sm whitespace-nowrap">
              {wallLength.toFixed(2)} m
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
