import { type AnyNodeId, type GuideNode, useRegistry, useScene } from '@pascal-app/core'
import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DoubleSide, Plane, Raycaster, type Group, type Texture, TextureLoader, Vector2, Vector3 } from 'three'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { applySnap } from '../../../lib/snap'
import { useAssetUrl } from '../../../hooks/use-asset-url'
import useViewer from '../../../store/use-viewer'

const DRAG_PLANE = new Plane(new Vector3(0, 1, 0), 0) // horizontale Y=0 Plane

export const GuideRenderer = ({ node }: { node: GuideNode }) => {
  const showGuides = useViewer((s) => s.showGuides)
  const ref = useRef<Group>(null!)
  useRegistry(node.id, 'guide', ref)

  const resolvedUrl = useAssetUrl(node.url)
  const [tex, setTex] = useState<Texture | null>(null)
  const [aspect, setAspect] = useState(1)

  // Drag state
  const dragging = useRef(false)
  const dragOffset = useRef(new Vector3())
  const { camera, gl } = useThree()

  // Fallback: sicherstellen dass Drag immer endet, auch wenn R3F onPointerUp ausbleibt
  useEffect(() => {
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [])

  useEffect(() => {
    if (!resolvedUrl) return
    let cancelled = false
    let loadedTex: Texture | null = null
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const loader = new TextureLoader()
      loader.load(resolvedUrl, (t) => {
        if (cancelled) {
          t.dispose()
          return
        }
        loadedTex = t
        setAspect(img.naturalWidth / img.naturalHeight || 1)
        setTex(t)
      })
    }
    img.src = resolvedUrl
    return () => {
      cancelled = true
      loadedTex?.dispose()
    }
  }, [resolvedUrl])

  const planeW = 10 * node.scale
  const planeH = planeW / aspect

  const material = useMemo(() => {
    if (!tex) return null
    const mat = new MeshBasicNodeMaterial({
      map: tex,
      transparent: true,
      opacity: node.opacity / 100,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    })
    return mat
  }, [tex, node.opacity])

  // Dispose material when it changes (tex or opacity change creates a new one)
  useEffect(() => {
    return () => {
      material?.dispose()
    }
  }, [material])

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
    e.stopPropagation()
    dragging.current = true
    gl.domElement.setPointerCapture(e.pointerId)
    const worldPos = getWorldPos(e.nativeEvent)
    dragOffset.current.set(
      node.position[0] - worldPos.x,
      0,
      node.position[2] - worldPos.z,
    )
    document.body.style.cursor = 'grabbing'
  }, [node.position, getWorldPos, gl])

  const onPointerMove = useCallback((e: any) => {
    if (!dragging.current) return
    const worldPos = getWorldPos(e.nativeEvent)
    const [newX, newZ] = applySnap(
      worldPos.x + dragOffset.current.x,
      worldPos.z + dragOffset.current.z,
    )
    useScene.getState().updateNode(node.id as AnyNodeId, {
      position: [newX, node.position[1], newZ],
    })
  }, [node.id, node.position, getWorldPos])

  const onPointerUp = useCallback((e: any) => {
    if (!dragging.current) return
    dragging.current = false
    gl.domElement.releasePointerCapture(e.pointerId)
    document.body.style.cursor = ''
  }, [gl])

  return (
    <group ref={ref} visible={showGuides} position={node.position}>
      {material && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          material={material}
          frustumCulled={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <planeGeometry args={[planeW, planeH]} />
        </mesh>
      )}
    </group>
  )
}
