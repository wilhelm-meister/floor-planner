'use client'

import { useViewer } from '@pascal-app/viewer'
import { PointerLockControls } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import useEditor from '@/store/use-editor'

/**
 * WalkthroughControls — lives inside the R3F Canvas.
 * Handles:
 * - Invisible ground plane for click placement (R3F event system, not raw DOM)
 * - PointerLockControls when walkthroughActive === true
 * - WASD movement in first-person
 * - ESC → exit walkthrough
 */

const EYE_HEIGHT = 1.7
const MOVE_SPEED = 3 // meters per second

// Reusable objects to avoid GC
const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()
const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

export function WalkthroughControls() {
  const mode = useEditor((state) => state.mode)
  const walkthroughActive = useEditor((state) => state.walkthroughActive)
  const setWalkthroughActive = useEditor((state) => state.setWalkthroughActive)
  const setWalkthroughPosition = useEditor((state) => state.setWalkthroughPosition)
  const setPreviousWallMode = useEditor((state) => state.setPreviousWallMode)

  const wallMode = useViewer((state) => state.wallMode)
  const setWallMode = useViewer((state) => state.setWallMode)
  const setCameraMode = useViewer((state) => state.setCameraMode)

  const { camera, gl } = useThree()
  const plRef = useRef<any>(null)

  // Preview position ref (avoids stale closures)
  const previewRef = useRef<THREE.Vector3 | null>(null)
  const previewMeshRef = useRef<THREE.Mesh>(null)
  const groundPlaneRef = useRef<THREE.Mesh>(null)

  // WASD movement keys
  const keysRef = useRef({ w: false, a: false, s: false, d: false })

  // Saved camera state for restore
  const savedCameraRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)

  // ─── Placement mode: mouse hover preview via R3F ──────────────────────────
  const onGroundMove = useCallback(
    (e: any) => {
      if (mode !== 'walkthrough' || walkthroughActive) return
      e.stopPropagation?.()
      if (!previewRef.current) previewRef.current = new THREE.Vector3()
      previewRef.current.set(e.point.x, 0.05, e.point.z)
      if (previewMeshRef.current) {
        previewMeshRef.current.position.copy(previewRef.current)
        previewMeshRef.current.visible = true
      }
    },
    [mode, walkthroughActive],
  )

  const onGroundClick = useCallback(
    (e: any) => {
      if (mode !== 'walkthrough' || walkthroughActive) return
      e.stopPropagation?.()

      const clickPos = e.point
      const eyePos: [number, number, number] = [clickPos.x, EYE_HEIGHT, clickPos.z]

      // Save current camera state
      const pos = camera.position.clone()
      const target = new THREE.Vector3()
      camera.getWorldDirection(target).add(camera.position)
      savedCameraRef.current = { pos, target }

      // Save current wallMode
      const currentWallMode = useViewer.getState().wallMode
      setPreviousWallMode(currentWallMode)

      // Switch to perspective + walls up
      setCameraMode('perspective')
      setWallMode('up')

      // Move camera to eye height
      camera.position.set(eyePos[0], eyePos[1], eyePos[2])
      camera.lookAt(eyePos[0] + 1, eyePos[1], eyePos[2])

      // Store position and activate
      setWalkthroughPosition(eyePos)
      setWalkthroughActive(true)

      // Lock pointer after a short delay (let React re-render first)
      setTimeout(() => {
        plRef.current?.lock()
      }, 150)
    },
    [mode, walkthroughActive, camera, setPreviousWallMode, setCameraMode, setWallMode, setWalkthroughPosition, setWalkthroughActive],
  )

  // Hide preview when mouse leaves the ground
  const onGroundLeave = useCallback(() => {
    if (previewMeshRef.current) {
      previewMeshRef.current.visible = false
    }
  }, [])

  // ─── PointerLock exit handler ─────────────────────────────────────────────
  useEffect(() => {
    if (!walkthroughActive) return

    const onLockChange = () => {
      const locked = document.pointerLockElement !== null
      if (!locked) {
        // Pointer was unlocked (ESC or programmatic) — exit walkthrough
        const prevWallMode = useEditor.getState().previousWallMode
        
        setWalkthroughActive(false)
        setWalkthroughPosition(null)
        if (prevWallMode) {
          setWallMode(prevWallMode)
          setPreviousWallMode(null)
        }
        useEditor.getState().setMode('select')

        // Restore camera
        if (savedCameraRef.current) {
          const { pos, target } = savedCameraRef.current
          camera.position.copy(pos)
          camera.lookAt(target)
          savedCameraRef.current = null
        }
      }
    }

    document.addEventListener('pointerlockchange', onLockChange)
    return () => document.removeEventListener('pointerlockchange', onLockChange)
  }, [walkthroughActive, camera, setWalkthroughActive, setWalkthroughPosition, setWallMode, setPreviousWallMode])

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
      keysRef.current = { w: false, a: false, s: false, d: false }
    }
  }, [walkthroughActive])

  // ─── Per-frame WASD movement ──────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!walkthroughActive) return

    const keys = keysRef.current
    if (!keys.w && !keys.a && !keys.s && !keys.d) return

    const speed = MOVE_SPEED * Math.min(delta, 0.1)
    camera.getWorldDirection(_forward)
    _forward.y = 0
    _forward.normalize()
    _right.crossVectors(_forward, _up).normalize()

    if (keys.w) camera.position.addScaledVector(_forward, speed)
    if (keys.s) camera.position.addScaledVector(_forward, -speed)
    if (keys.a) camera.position.addScaledVector(_right, -speed)
    if (keys.d) camera.position.addScaledVector(_right, speed)

    // Keep eye height
    camera.position.y = EYE_HEIGHT
  })

  // ─── Render ───────────────────────────────────────────────────────────────
  const isPlacement = mode === 'walkthrough' && !walkthroughActive

  return (
    <>
      {/* PointerLock controls — only mounted when walkthrough is active */}
      {walkthroughActive && (
        <PointerLockControls ref={plRef} />
      )}

      {/* Invisible ground plane for raycasting — only in placement mode */}
      {isPlacement && (
        <mesh
          ref={groundPlaneRef}
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={onGroundMove as any}
          onPointerDown={onGroundClick as any}
          onPointerLeave={onGroundLeave}
          visible={false}
        >
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Placement preview — mannequin marker */}
      {isPlacement && (
        <mesh ref={previewMeshRef} visible={false}>
          {/* Cylinder body */}
          <group>
            <mesh position={[0, 0.85, 0]}>
              <cylinderGeometry args={[0.15, 0.2, 1.4, 8]} />
              <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 1.65, 0]}>
              <sphereGeometry args={[0.15, 12, 12]} />
              <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
            </mesh>
          </group>
          {/* Ground ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.3, 0.5, 24]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </mesh>
      )}
    </>
  )
}
