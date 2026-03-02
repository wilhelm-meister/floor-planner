import { type AnyNodeId, useRegistry, useScene, type WallNode } from '@pascal-app/core'
import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import { Plane, Raycaster, type Mesh, Vector2, Vector3 } from 'three'
import { applySnap } from '../../../lib/snap'
import { useNodeEvents } from '../../../hooks/use-node-events'
import { NodeRenderer } from '../node-renderer'

const DRAG_PLANE = new Plane(new Vector3(0, 1, 0), 0)
const DRAG_THRESHOLD = 4 // px — unter diesem Wert = Klick, drüber = Drag

export const WallRenderer = ({ node }: { node: WallNode }) => {
  const ref = useRef<Mesh>(null!)
  useRegistry(node.id, 'wall', ref)
  const handlers = useNodeEvents(node, 'wall')
  const { camera, gl } = useThree()

  const dragState = useRef<{
    active: boolean
    startMouse: Vector2
    startWorld: Vector3
    originalStart: [number, number]
    originalEnd: [number, number]
  } | null>(null)

  // Fallback: Drag immer beenden, auch wenn R3F onPointerUp ausbleibt
  useEffect(() => {
    const onUp = () => {
      if (dragState.current) {
        dragState.current = null
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [])

  const getWorldPos = useCallback((e: PointerEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const ray = new Raycaster()
    ray.setFromCamera(ndc, camera)
    const hit = new Vector3()
    ray.ray.intersectPlane(DRAG_PLANE, hit)
    return hit
  }, [camera, gl])

  const onPointerDown = useCallback((e: any) => {
    // Only handle left-click; right-click is for camera/perspective — do not start drag or selection
    if (e.button !== 0) return
    // Also skip if camera is already dragging (perspective rotation in progress)
    if (useViewer.getState().cameraDragging) return

    e.stopPropagation()
    gl.domElement.setPointerCapture(e.pointerId)
    const worldPos = getWorldPos(e.nativeEvent)
    dragState.current = {
      active: false,
      startMouse: new Vector2(e.clientX, e.clientY),
      startWorld: worldPos,
      originalStart: [...node.start] as [number, number],
      originalEnd: [...node.end] as [number, number],
    }
    // Originale handler weiterleiten
    handlers.onPointerDown?.(e)
  }, [node.start, node.end, getWorldPos, gl, handlers])

  const onPointerMove = useCallback((e: any) => {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startMouse.x
    const dy = e.clientY - dragState.current.startMouse.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (!dragState.current.active && dist < DRAG_THRESHOLD) return
    dragState.current.active = true
    document.body.style.cursor = 'grabbing'
    e.stopPropagation()

    const worldPos = getWorldPos(e.nativeEvent)
    const deltaX = worldPos.x - dragState.current.startWorld.x
    const deltaZ = worldPos.z - dragState.current.startWorld.z

    const [snappedStartX, snappedStartZ] = applySnap(
      dragState.current.originalStart[0] + deltaX,
      dragState.current.originalStart[1] + deltaZ,
    )
    const [snappedEndX, snappedEndZ] = applySnap(
      dragState.current.originalEnd[0] + deltaX,
      dragState.current.originalEnd[1] + deltaZ,
    )
    useScene.getState().updateNode(node.id as AnyNodeId, {
      start: [snappedStartX, snappedStartZ],
      end: [snappedEndX, snappedEndZ],
    })
  }, [node.id, getWorldPos])

  const onPointerUp = useCallback((e: any) => {
    if (!dragState.current) return
    gl.domElement.releasePointerCapture(e.pointerId)
    document.body.style.cursor = ''
    if (!dragState.current.active) {
      // War ein Klick → originale handler
      handlers.onPointerUp?.(e)
    }
    dragState.current = null
  }, [gl, handlers])

  return (
    <mesh ref={ref} castShadow receiveShadow visible={node.visible}>
      <boxGeometry args={[0, 0, 0]} />
      <mesh
        name="collision-mesh"
        visible={false}
        {...handlers}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <boxGeometry args={[0, 0, 0]} />
      </mesh>
      {node.children.map((childId) => (
        <NodeRenderer key={childId} nodeId={childId} />
      ))}
    </mesh>
  )
}
