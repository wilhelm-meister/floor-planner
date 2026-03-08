import { type SlabNode, useRegistry } from '@pascal-app/core'
import { useThree } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import type { Mesh } from 'three'
import { useNodeEvents } from '../../../hooks/use-node-events'
import useViewer from '../../../store/use-viewer'

export const SlabRenderer = ({ node }: { node: SlabNode }) => {
  const ref = useRef<Mesh>(null!)
  const { gl } = useThree()

  useRegistry(node.id, 'slab', ref)

  const handlers = useNodeEvents(node, 'slab')

  // Custom onPointerDown: set pointer capture so onPointerUp fires reliably
  // (required for click→select to work, mirrors wall/roof renderer pattern)
  const onPointerDown = useCallback((e: any) => {
    if (e.button !== 0) return
    if (useViewer.getState().cameraDragging) return
    e.stopPropagation()
    gl.domElement.setPointerCapture(e.pointerId)
    handlers.onPointerDown?.(e)
  }, [gl, handlers])

  const onPointerUp = useCallback((e: any) => {
    if (e.button !== 0) return
    gl.domElement.releasePointerCapture(e.pointerId)
    handlers.onPointerUp?.(e)
  }, [gl, handlers])

  return (
    <mesh ref={ref} castShadow receiveShadow {...handlers} onPointerDown={onPointerDown} onPointerUp={onPointerUp} visible={node.visible}>
      {/* SlabSystem will replace this geometry in the next frame */}
      <boxGeometry args={[0, 0, 0]} />
      <meshStandardNodeMaterial color="#e5e5e5" />
    </mesh>
  )
}
