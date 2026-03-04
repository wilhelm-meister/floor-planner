import { type AnyNodeId, useRegistry, useScene, type WallNode } from '@pascal-app/core'
import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import { Plane, Raycaster, type Mesh, Vector2, Vector3 } from 'three'
import { applySnap } from '../../../lib/snap'
import { captureGroupState, applyGroupDelta, clearGroupState } from '../../../lib/group-move'
import useViewer from '../../../store/use-viewer'
import { emitter } from '@pascal-app/core'
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

    if (node.locked) {
      handlers.onPointerDown?.(e)  // Selektion noch feuern
      return                        // aber kein Drag starten
    }

    const worldPos = getWorldPos(e.nativeEvent)
    dragState.current = {
      active: false,
      startMouse: new Vector2(e.clientX, e.clientY),
      startWorld: worldPos,
      originalStart: [...node.start] as [number, number],
      originalEnd: [...node.end] as [number, number],
    }

    // Capture group state for multi-select move
    const hasGroup = captureGroupState(node.id)

    // Shift key toggles snap override during drag
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Shift') useViewer.getState().setSnapShiftOverride(true)
    }
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === 'Shift') useViewer.getState().setSnapShiftOverride(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Window-level pointermove: fires even when pointer moves outside the mesh (fast drag)
    let lastSnapPos: string | null = null
    const onWindowMove = (ev: PointerEvent) => {
      if (!dragState.current) return
      const dx = ev.clientX - dragState.current.startMouse.x
      const dy = ev.clientY - dragState.current.startMouse.y
      if (!dragState.current.active && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return
      dragState.current.active = true
      document.body.style.cursor = 'grabbing'

      const wp = getWorldPos(ev)
      const deltaX = wp.x - dragState.current.startWorld.x
      const deltaZ = wp.z - dragState.current.startWorld.z
      const [sx, sz] = applySnap(dragState.current.originalStart[0] + deltaX, dragState.current.originalStart[1] + deltaZ)
      const [ex, ez] = applySnap(dragState.current.originalEnd[0] + deltaX, dragState.current.originalEnd[1] + deltaZ)
      useScene.getState().updateNode(node.id as AnyNodeId, { start: [sx, sz], end: [ex, ez] })
      useScene.getState().dirtyNodes.add(node.id as AnyNodeId)

      // Move other selected nodes with same delta
      if (hasGroup) applyGroupDelta(deltaX, deltaZ)

      // Snap sound when position changes
      const snapKey = `${sx},${sz}`
      if (snapKey !== lastSnapPos) {
        lastSnapPos = snapKey
        emitter.emit('sfx:grid-snap', undefined)
      }
    }

    const cleanup = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onWindowMove)
      window.removeEventListener('pointerup', cleanup)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      useViewer.getState().setSnapShiftOverride(false)
      clearGroupState()
      if (dragState.current?.active) {
        emitter.emit('sfx:structure-move', undefined)
      }
    }
    window.addEventListener('pointermove', onWindowMove)
    window.addEventListener('pointerup', cleanup as EventListener)

    handlers.onPointerDown?.(e)
  }, [node.id, node.start, node.end, getWorldPos, gl, handlers])

  // Forward pointer move to useNodeEvents so wall:move fires (used by window/door tools)
  const onPointerMove = useCallback((e: any) => {
    if (dragState.current?.active) return // Don't emit move during wall drag
    handlers.onPointerMove?.(e)
  }, [handlers])

  // Mesh onPointerUp: still needed for click→select (R3F ThreeEvent required by useNodeEvents)
  const onPointerUp = useCallback((e: any) => {
    // Locked nodes: dragState was never set, but still need click→select
    if (!dragState.current) {
      if ((node as any).locked) {
        gl.domElement.releasePointerCapture(e.pointerId)
        handlers.onPointerUp?.(e)
      }
      return
    }
    gl.domElement.releasePointerCapture(e.pointerId)
    document.body.style.cursor = ''
    if (!dragState.current.active) {
      handlers.onPointerUp?.(e)
    }
    dragState.current = null
  }, [gl, handlers, node])

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
