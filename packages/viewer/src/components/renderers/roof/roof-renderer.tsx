import { emitter, type AnyNodeId, type RoofNode, useRegistry, useScene } from '@pascal-app/core'
import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import { Plane, Raycaster, Vector2, Vector3, type Mesh } from 'three'
import { applySnap } from '../../../lib/snap'
import useViewer from '../../../store/use-viewer'
import { useNodeEvents } from '../../../hooks/use-node-events'

const DRAG_PLANE = new Plane(new Vector3(0, 1, 0), 0)
const DRAG_THRESHOLD = 4

export const RoofRenderer = ({ node }: { node: RoofNode }) => {
  const ref = useRef<Mesh>(null!)
  useRegistry(node.id, 'roof', ref)
  const handlers = useNodeEvents(node, 'roof')
  const { camera, gl } = useThree()

  const dragState = useRef<{
    active: boolean
    startMouse: Vector2
    startWorld: Vector3
    originalPosition: [number, number, number]
  } | null>(null)
  const wasDragging = useRef(false)

  // Fallback cleanup on unmount
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

  const getWorldPos = useCallback((e: PointerEvent | MouseEvent) => {
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
    if (e.button !== 0) return
    if (useViewer.getState().cameraDragging) return

    e.stopPropagation()
    gl.domElement.setPointerCapture(e.pointerId)

    const worldPos = getWorldPos(e.nativeEvent)
    dragState.current = {
      active: false,
      startMouse: new Vector2(e.clientX, e.clientY),
      startWorld: worldPos,
      originalPosition: [...node.position] as [number, number, number],
    }

    let lastSnapKey: string | null = null

    // Shift key toggles snap override during drag
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Shift') useViewer.getState().setSnapShiftOverride(true)
    }
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === 'Shift') useViewer.getState().setSnapShiftOverride(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

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
      const [newX, newZ] = applySnap(
        dragState.current.originalPosition[0] + deltaX,
        dragState.current.originalPosition[2] + deltaZ,
      )
      const newPosition: [number, number, number] = [newX, dragState.current.originalPosition[1], newZ]
      useScene.getState().updateNode(node.id as AnyNodeId, { position: newPosition })

      // Snap sound when position changes
      const snapKey = `${newX},${newZ}`
      if (snapKey !== lastSnapKey) {
        lastSnapKey = snapKey
        emitter.emit('sfx:grid-snap', undefined)
      }
    }

    const cleanup = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onWindowMove)
      window.removeEventListener('pointerup', cleanup as EventListener)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      useViewer.getState().setSnapShiftOverride(false)
      gl.domElement.releasePointerCapture(ev.pointerId)
      document.body.style.cursor = ''
      if (dragState.current?.active) {
        emitter.emit('sfx:structure-move', undefined)
        wasDragging.current = true
      } else {
        wasDragging.current = false
      }
      dragState.current = null
    }

    window.addEventListener('pointermove', onWindowMove)
    window.addEventListener('pointerup', cleanup as EventListener)

    handlers.onPointerDown?.(e)
  }, [node.id, node.position, getWorldPos, gl, handlers])

  const onPointerUp = useCallback((e: any) => {
    // If no drag happened, emit click for selection
    if (!wasDragging.current) {
      handlers.onPointerUp?.(e)
    }
    wasDragging.current = false
  }, [handlers])

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      position={node.position}
      rotation-y={node.rotation}
      visible={node.visible}
      {...handlers}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* RoofSystem will replace this geometry in the next frame */}
      <boxGeometry args={[0, 0, 0]} />
      <meshStandardMaterial color="white" />
    </mesh>
  )
}
