import { type GuideNode, useRegistry } from '@pascal-app/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DoubleSide, MeshBasicMaterial, type Group, type Texture, TextureLoader } from 'three'
import { useAssetUrl } from '../../../hooks/use-asset-url'
import useViewer from '../../../store/use-viewer'

export const GuideRenderer = ({ node }: { node: GuideNode }) => {
  const showGuides = useViewer((s) => s.showGuides)
  const ref = useRef<Group>(null!)
  useRegistry(node.id, 'guide', ref)

  const resolvedUrl = useAssetUrl(node.url)
  const [tex, setTex] = useState<Texture | null>(null)
  const [aspect, setAspect] = useState(1)

  useEffect(() => {
    if (!resolvedUrl) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const loader = new TextureLoader()
      loader.load(resolvedUrl, (t) => {
        if (cancelled) return
        setAspect(img.naturalWidth / img.naturalHeight || 1)
        setTex(t)
      })
    }
    img.src = resolvedUrl
    return () => { cancelled = true }
  }, [resolvedUrl])

  const planeW = 10 * node.scale
  const planeH = planeW / aspect

  const material = useMemo(() => {
    if (!tex) return null
    return new MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: node.opacity / 100,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    })
  }, [tex, node.opacity])

  return (
    <group ref={ref} visible={showGuides}>
      {material && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          material={material}
          frustumCulled={false}
        >
          <planeGeometry args={[planeW, planeH]} />
        </mesh>
      )}
    </group>
  )
}
