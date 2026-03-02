import { type AnyNodeId, useRegistry, useScene, type WallNode } from '@pascal-app/core'
import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import { Plane, Raycaster, type Mesh, Vector2, Vector3 } from 'three'
import { applySnap } from '../../../lib/snap'
import useViewer from '../../../store/use-viewer'
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
    // Only handle left-click; right-click is for camera/perspective
    if (e.button !== 0) return
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

    // Attach move/up to window so fast mouse movement never loses the drag
    const onWindowMove = (ev: PointerEvent) => {
      if (!dragState.current) return
      const dx = ev.clientX - dragState.current.startMouse.x
      const dy = ev.clientY - dragState.current.startMouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (!dragState.current.active && dist < DRAG_THRESHOLD) return
      dragState.current.active = true
      document.body.style.cursor = 'grabbing'

      const worldPos = getWorldPos(ev)
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
      useScene.getState().dirtyNodes.add(node.id as AnyNodeId)
    }

    const onWindowUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onWindowMove)
      window.removeEventListener('pointerup', onWindowUp)
      gl.domElement.releasePointerCapture(ev.pointerId)
      document.body.style.cursor = ''

      if (dragState.current && !dragState.current.active) {
        // Was a click → forward to selection handler
        handlers.onPointerUp?.(e)
      }
      dragState.current = null
    }

    window.addEventListener('pointermove', onWindowMove)
    window.addEventListener('pointerup', onWindowUp)

    handlers.onPointerDown?.(e)
  }, [node.id, node.start, node.end, getWorldPos, gl, handlers])

  // onPointerMove / onPointerUp no longer needed on the mesh (handled via window listeners)
  const onPointerMove = useCallback((_e: any) => {}, [])
  const onPointerUp = useCallback((_e: any) => {}, [])

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
