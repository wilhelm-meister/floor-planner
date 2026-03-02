import { emitter, type GridEvent, type AnyNodeId, type WallNode, useScene } from '@pascal-app/core'
import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import useEditor from '@/store/use-editor'

type HandleTarget = 'start' | 'end' | null

const HANDLE_Y = 0.5
const HANDLE_RADIUS = 0.1

interface WallEdgeHandlesProps {
  wallId: string
}

/**
 * Wall edge handles - renders draggable spheres at the start and end of a selected wall.
 * Allows resizing walls by dragging the endpoints.
 */
export const WallEdgeHandles: React.FC<WallEdgeHandlesProps> = ({ wallId }) => {
  const node = useScene((s) => s.nodes[wallId as AnyNodeId] as WallNode | undefined)

  const [dragTarget, setDragTarget] = useState<HandleTarget>(null)
  const [hoveredHandle, setHoveredHandle] = useState<HandleTarget>(null)
  const [previewStart, setPreviewStart] = useState<[number, number] | null>(null)
  const [previewEnd, setPreviewEnd] = useState<[number, number] | null>(null)
  const [wallLength, setWallLength] = useState<number | null>(null)

  // Refs to avoid stale closures in event handlers
  const dragTargetRef = useRef<HandleTarget>(null)
  const nodeRef = useRef(node)
  nodeRef.current = node
  const previewStartRef = useRef<[number, number] | null>(null)
  const previewEndRef = useRef<[number, number] | null>(null)

  // Listen to grid:move to update preview positions during drag
  useEffect(() => {
    const onGridMove = (event: GridEvent) => {
      if (!dragTargetRef.current || !nodeRef.current) return

      const { snapEnabled, snapSize } = useEditor.getState()
      const snap = (v: number) => snapEnabled ? Math.round(v / snapSize) * snapSize : v
      const snappedX = snap(event.position[0])
      const snappedZ = snap(event.position[2])
      const pos: [number, number] = [snappedX, snappedZ]

      const currentNode = nodeRef.current

      if (dragTargetRef.current === 'end') {
        previewEndRef.current = pos
        setPreviewEnd(pos)
        const dx = pos[0] - currentNode.start[0]
        const dz = pos[1] - currentNode.start[1]
        setWallLength(Math.round(Math.sqrt(dx * dx + dz * dz) * 100) / 100)
      } else if (dragTargetRef.current === 'start') {
        previewStartRef.current = pos
        setPreviewStart(pos)
        const dx = currentNode.end[0] - pos[0]
        const dz = currentNode.end[1] - pos[1]
        setWallLength(Math.round(Math.sqrt(dx * dx + dz * dz) * 100) / 100)
      }
    }

    emitter.on('grid:move', onGridMove)
    return () => emitter.off('grid:move', onGridMove)
  }, [])

  // Commit the drag result on pointer up
  useEffect(() => {
    if (!dragTarget) return

    const onPointerUp = (e: PointerEvent) => {
      const currentNode = nodeRef.current
      if (currentNode) {
        const updates: Partial<WallNode> = {}
        if (dragTargetRef.current === 'end' && previewEndRef.current) {
          updates.end = previewEndRef.current
        } else if (dragTargetRef.current === 'start' && previewStartRef.current) {
          updates.start = previewStartRef.current
        }
        if (Object.keys(updates).length > 0) {
          useScene.getState().updateNode(wallId as AnyNodeId, updates)
        }
      }

      // Suppress the follow-up click so we don't accidentally deselect the wall
      const suppressClick = (ce: MouseEvent) => {
        ce.stopImmediatePropagation()
        ce.preventDefault()
        window.removeEventListener('click', suppressClick, true)
      }
      window.addEventListener('click', suppressClick, true)
      requestAnimationFrame(() => window.removeEventListener('click', suppressClick, true))

      // Reset state
      dragTargetRef.current = null
      previewStartRef.current = null
      previewEndRef.current = null
      setDragTarget(null)
      setPreviewStart(null)
      setPreviewEnd(null)
      setWallLength(null)
    }

    window.addEventListener('pointerup', onPointerUp, true)
    return () => window.removeEventListener('pointerup', onPointerUp, true)
  }, [dragTarget, wallId])

  if (!node) return null

  const startPos = previewStart ?? node.start
  const endPos = previewEnd ?? node.end
  const midX = (startPos[0] + endPos[0]) / 2
  const midZ = (startPos[1] + endPos[1]) / 2

  const getHandleColor = (target: 'start' | 'end') => {
    if (dragTarget === target) return '#f59e0b'
    if (hoveredHandle === target) return '#fcd34d'
    return '#94a3b8'
  }

  const getEmissive = (target: 'start' | 'end') => {
    return dragTarget === target ? '#b45309' : '#000000'
  }

  return (
    <group>
      {/* Start handle */}
      <mesh
        position={[startPos[0], HANDLE_Y, startPos[1]]}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          dragTargetRef.current = 'start'
          setDragTarget('start')
          setPreviewStart(null)
          previewStartRef.current = null
          useScene.temporal.getState().pause()
        }}
        onPointerEnter={(e) => {
          e.stopPropagation()
          setHoveredHandle('start')
        }}
        onPointerLeave={(e) => {
          e.stopPropagation()
          setHoveredHandle(null)
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[HANDLE_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={getHandleColor('start')}
          emissive={getEmissive('start')}
          emissiveIntensity={0.5}
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
          setPreviewEnd(null)
          previewEndRef.current = null
          useScene.temporal.getState().pause()
        }}
        onPointerEnter={(e) => {
          e.stopPropagation()
          setHoveredHandle('end')
        }}
        onPointerLeave={(e) => {
          e.stopPropagation()
          setHoveredHandle(null)
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[HANDLE_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={getHandleColor('end')}
          emissive={getEmissive('end')}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Length label during drag */}
      {wallLength !== null && (
        <group position={[midX, HANDLE_Y + 0.6, midZ]}>
          <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
            <div className="rounded-md border border-amber-400 bg-amber-500/90 px-2 py-0.5 text-xs font-mono font-medium text-white shadow-md backdrop-blur-sm whitespace-nowrap">
              {wallLength.toFixed(2)} m
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
