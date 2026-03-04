'use client'

import { useViewer } from '@pascal-app/viewer'
import { PointerLockControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import useEditor from '@/store/use-editor'

/**
 * WalkthroughControls — lives inside the R3F Canvas.
 * Handles:
 * - Mannequin placement preview when mode === 'walkthrough'
 * - PointerLockControls when walkthroughActive === true
 * - WASD movement in first-person
 * - ESC → exit walkthrough
 */
export function WalkthroughControls() {
  const mode = useEditor((state) => state.mode)
  const walkthroughActive = useEditor((state) => state.walkthroughActive)
  const setWalkthroughActive = useEditor((state) => state.setWalkthroughActive)
  const setWalkthroughPosition = useEditor((state) => state.setWalkthroughPosition)
  const previousWallMode = useEditor((state) => state.previousWallMode)
  const setPreviousWallMode = useEditor((state) => state.setPreviousWallMode)

  const setWallMode = useViewer((state) => state.setWallMode)
  const setCameraMode = useViewer((state) => state.setCameraMode)

  const { camera, gl } = useThree()
  const plRef = useRef<any>(null)

  // Preview sphere for placement
  const [previewPos, setPreviewPos] = useState<[number, number, number] | null>(null)

  // WASD movement keys
  const keysRef = useRef({ w: false, a: false, s: false, d: false })

  // ─── Placement mode: raycasting preview ───────────────────────────────────
  useEffect(() => {
    if (mode !== 'walkthrough' || walkthroughActive) return

    const canvas = gl.domElement

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      // Simple ground-plane raycast at y=0
      const dir = new Vector3(x, y, 0.5).unproject(camera).sub(camera.position).normalize()
      if (Math.abs(dir.y) < 0.001) return
      const t = -camera.position.y / dir.y
      if (t < 0) return
      const hit = camera.position.clone().add(dir.multiplyScalar(t))
      setPreviewPos([hit.x, 0, hit.z])
    }

    const onClick = (e: MouseEvent) => {
      if (!previewPos) return

      const pos: [number, number, number] = [previewPos[0], previewPos[1] + 1.7, previewPos[2]]

      // Save current wallMode
      const currentWallMode = useViewer.getState().wallMode
      setPreviousWallMode(currentWallMode)

      // Switch to perspective + walls up
      setCameraMode('perspective')
      setWallMode('up')

      // Move camera to eye height
      camera.position.set(pos[0], pos[1], pos[2])
      camera.lookAt(pos[0] + 1, pos[1], pos[2])

      // Store position and activate
      setWalkthroughPosition(pos)
      setWalkthroughActive(true)

      // Lock pointer
      setTimeout(() => {
        plRef.current?.lock()
      }, 100)
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
      setPreviewPos(null)
    }
  }, [mode, walkthroughActive, camera, gl, previewPos, setPreviousWallMode, setCameraMode, setWallMode, setWalkthroughPosition, setWalkthroughActive])

  // ─── PointerLock exit handler ─────────────────────────────────────────────
  useEffect(() => {
    if (!walkthroughActive) return

    const onLockChange = () => {
      const locked = document.pointerLockElement !== null
      if (!locked && walkthroughActive) {
        // Pointer was unlocked (ESC or programmatic) — exit walkthrough
        setWalkthroughActive(false)
        setWalkthroughPosition(null)
        if (previousWallMode) {
          setWallMode(previousWallMode)
          setPreviousWallMode(null)
        }
        useEditor.getState().setMode('select')
      }
    }

    document.addEventListener('pointerlockchange', onLockChange)
    return () => document.removeEventListener('pointerlockchange', onLockChange)
  }, [walkthroughActive, previousWallMode, setWalkthroughActive, setWalkthroughPosition, setWallMode, setPreviousWallMode])

  // ─── WASD movement ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!walkthroughActive) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') keysRef.current.w = true
      if (e.code === 'KeyA') keysRef.current.a = true
      if (e.code === 'KeyS') keysRef.current.s = true
      if (e.code === 'KeyD') keysRef.current.d = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') keysRef.current.w = false
      if (e.code === 'KeyA') keysRef.current.a = false
      if (e.code === 'KeyS') keysRef.current.s = false
      if (e.code === 'KeyD') keysRef.current.d = false
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [walkthroughActive])

  // ─── Per-frame WASD movement via useFrame ─────────────────────────────────
  // We use a ref-based RAF loop to avoid R3F useFrame dependency issues
  useEffect(() => {
    if (!walkthroughActive) return

    const SPEED = 0.05
    let rafId: number

    const loop = () => {
      const keys = keysRef.current
      if (keys.w || keys.a || keys.s || keys.d) {
        const forward = new Vector3()
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()

        const right = new Vector3()
        right.crossVectors(forward, new Vector3(0, 1, 0)).normalize()

        if (keys.w) camera.position.addScaledVector(forward, SPEED)
        if (keys.s) camera.position.addScaledVector(forward, -SPEED)
        if (keys.a) camera.position.addScaledVector(right, -SPEED)
        if (keys.d) camera.position.addScaledVector(right, SPEED)
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [walkthroughActive, camera])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* PointerLock controls — only mounted when walkthrough is active */}
      {walkthroughActive && (
        <PointerLockControls ref={plRef} camera={camera} domElement={gl.domElement} />
      )}

      {/* Placement preview sphere */}
      {mode === 'walkthrough' && !walkthroughActive && previewPos && (
        <mesh position={previewPos}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.7} />
        </mesh>
      )}
    </>
  )
}
