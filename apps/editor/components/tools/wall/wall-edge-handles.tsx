'use client'

import { emitter, type GridEvent, type AnyNodeId, type WallNode, useScene } from '@pascal-app/core'
import { Html } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import useEditor from '@/store/use-editor'

type HandleTarget = 'start' | 'end' | null

const HANDLE_Y = 0.05
const HANDLE_RADIUS = 0.12
const LINE_Y = 0.05

interface WallEdgeHandlesProps {
  wallId: string
}

/**
 * Wall edge handles — shows a glowing yellow line along the selected wall.
 * Dragging an endpoint updates the wall in real-time.
 */
export const WallEdgeHandles: React.FC<WallEdgeHandlesProps> = ({ wallId }) => {
  const node = useScene((s) => s.nodes[wallId as AnyNodeId] as WallNode | undefined)

  const [dragTarget, setDragTarget] = useState<HandleTarget>(null)
  const [hoveredHandle, setHoveredHandle] = useState<HandleTarget>(null)
  const [liveStart, setLiveStart] = useState<[number, number] | null>(null)
  const [liveEnd, setLiveEnd] = useState<[number, number] | null>(null)
  const [wallLength, setWallLength] = useState<number | null>(null)

  const dragTargetRef = useRef<HandleTarget>(null)
  const nodeRef = useRef(node)
  nodeRef.current = node

  // Real-time drag: update wall geometry live on every grid:move
  useEffect(() => {
    const onGridMove = (event: GridEvent) => {
      if (!dragTargetRef.current || !nodeRef.current) return

      const { snapEnabled, snapSize } = useEditor.getState()
      const snap = (v: number) => snapEnabled ? Math.round(v / snapSize) * snapSize : v
      const pos: [number, number] = [snap(event.position[0]), snap(event.position[2])]
      const n = nodeRef.current

      let newStart = n.start
      let newEnd = n.end

      if (dragTargetRef.current === 'end') {
        newEnd = pos
        setLiveEnd(pos)
        const dx = pos[0] - n.start[0]
        const dz = pos[1] - n.start[1]
        setWallLength(Math.round(Math.sqrt(dx * dx + dz * dz) * 100) / 100)
      } else {
        newStart = pos
        setLiveStart(pos)
        const dx = n.end[0] - pos[0]
        const dz = n.end[1] - pos[1]
        setWallLength(Math.round(Math.sqrt(dx * dx + dz * dz) * 100) / 100)
      }

      // Update wall in real-time so the 3D geometry rebuilds immediately
      const scene = useScene.getState()
      scene.updateNode(wallId as AnyNodeId, {
        start: newStart,
        end: newEnd,
      })
      scene.dirtyNodes.add(wallId as AnyNodeId)
    }

    emitter.on('grid:move', onGridMove)
    return () => emitter.off('grid:move', onGridMove)
  }, [wallId])

  // Commit on pointer up (geometry already up to date, just clean up state)
  useEffect(() => {
    if (!dragTarget) return

    const onPointerUp = () => {
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
      setDragTarget(null)
      setLiveStart(null)
      setLiveEnd(null)
      setWallLength(null)
    }

    window.addEventListener('pointerup', onPointerUp, true)
    return () => window.removeEventListener('pointerup', onPointerUp, true)
  }, [dragTarget])

  if (!node) return null

  // Use live positions during drag, otherwise use node positions
  const startPos = liveStart ?? node.start
  const endPos = liveEnd ?? node.end

  const midX = (startPos[0] + endPos[0]) / 2
  const midZ = (startPos[1] + endPos[1]) / 2

  const isDragging = dragTarget !== null

  // Build a thin flat box along the wall as a highlight (avoids LineMaterial / post-processing incompatibility)
  const wallHighlight = useMemo(() => {
    const dx = endPos[0] - startPos[0]
    const dz = endPos[1] - startPos[1]
    const length = Math.sqrt(dx * dx + dz * dz)
    if (length < 0.01) return null

    const angle = Math.atan2(dz, dx)
    const cx = (startPos[0] + endPos[0]) / 2
    const cz = (startPos[1] + endPos[1]) / 2

    return { length, angle, cx, cz }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPos[0], startPos[1], endPos[0], endPos[1]])

  const highlightColor = isDragging ? '#facc15' : '#fbbf24'

  const getHandleColor = (target: 'start' | 'end') => {
    if (dragTarget === target) return '#facc15'
    if (hoveredHandle === target) return '#fde68a'
    return '#fbbf24'
  }

  return (
    <group>
      {/* Glowing yellow highlight along the full wall — thin flat box, post-processing compatible */}
      {wallHighlight && (
        <mesh
          position={[wallHighlight.cx, LINE_Y, wallHighlight.cz]}
          rotation={[0, -wallHighlight.angle, 0]}
        >
          <boxGeometry args={[wallHighlight.length, 0.012, 0.04]} />
          <meshBasicMaterial
            color={highlightColor}
            transparent
            opacity={isDragging ? 1 : 0.85}
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
