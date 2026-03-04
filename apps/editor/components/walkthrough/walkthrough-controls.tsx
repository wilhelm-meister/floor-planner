'use client'

import { useViewer } from '@pascal-app/viewer'
import { PointerLockControls } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import useEditor from '@/store/use-editor'

const EYE_HEIGHT = 1.7
const MOVE_SPEED = 3 // meters per second

const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

export function WalkthroughControls() {
  const mode = useEditor((state) => state.mode)
  const walkthroughActive = useEditor((state) => state.walkthroughActive)
  const setWalkthroughActive = useEditor((state) => state.setWalkthroughActive)
  const setWalkthroughPosition = useEditor((state) => state.setWalkthroughPosition)
  const setPreviousWallMode = useEditor((state) => state.setPreviousWallMode)

  const setWallMode = useViewer((state) => state.setWallMode)
  const setCameraMode = useViewer((state) => state.setCameraMode)

  const { camera } = useThree()
  const plRef = useRef<any>(null)

  const previewMeshRef = useRef<THREE.Mesh>(null)
  const keysRef = useRef({ w: false, a: false, s: false, d: false })
  const savedCameraRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)

  // Pending position — applied AFTER PointerLockControls mounts
  const pendingPosRef = useRef<[number, number, number] | null>(null)

  // ─── Apply camera position after walkthrough activates ────────────────────
  // This runs after PointerLockControls has mounted and CameraControls unmounted
  useEffect(() => {
    if (!walkthroughActive || !pendingPosRef.current) return

    const pos = pendingPosRef.current
    pendingPosRef.current = null

    // Use requestAnimationFrame to ensure it runs after R3F has processed the mount
    requestAnimationFrame(() => {
      camera.position.set(pos[0], pos[1], pos[2])
      camera.lookAt(pos[0] + 1, pos[1], pos[2])
      camera.updateMatrixWorld()

      // Now lock the pointer
      setTimeout(() => {
        plRef.current?.lock()
      }, 50)
    })
  }, [walkthroughActive, camera])

  // ─── Placement mode: mouse hover preview ──────────────────────────────────
  const onGroundMove = useCallback(
    (e: any) => {
      if (mode !== 'walkthrough' || walkthroughActive) return
      e.stopPropagation?.()
      if (previewMeshRef.current) {
        previewMeshRef.current.position.set(e.point.x, 0.05, e.point.z)
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

      // Save current camera state BEFORE anything changes
      const currentPos = camera.position.clone()
      const currentTarget = new THREE.Vector3()
      camera.getWorldDirection(currentTarget).add(camera.position)
      savedCameraRef.current = { pos: currentPos, target: currentTarget }

      // Save current wallMode
      const currentWallMode = useViewer.getState().wallMode
      setPreviousWallMode(currentWallMode)

      // Switch to perspective + walls up
      setCameraMode('perspective')
      setWallMode('up')

      // Store the desired position — will be applied in the useEffect above
      // AFTER PointerLockControls mounts and CameraControls unmounts
      pendingPosRef.current = eyePos

      // Store position and activate (triggers re-render → CameraControls unmounts → PLC mounts)
      setWalkthroughPosition(eyePos)
      setWalkthroughActive(true)
    },
    [mode, walkthroughActive, camera, setPreviousWallMode, setCameraMode, setWallMode, setWalkthroughPosition, setWalkthroughActive],
  )

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
        const prevWallMode = useEditor.getState().previousWallMode

        setWalkthroughActive(false)
        setWalkthroughPosition(null)
        if (prevWallMode) {
          setWallMode(prevWallMode)
          setPreviousWallMode(null)
        }
        useEditor.getState().setMode('select')

        // Restore camera position
        if (savedCameraRef.current) {
          const { pos, target } = savedCameraRef.current
          camera.position.copy(pos)
          camera.lookAt(target)
          camera.updateMatrixWorld()
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

    // Keep eye height constant
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

      {/* Placement preview — flat circle on ground */}
      {isPlacement && (
        <mesh ref={previewMeshRef} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.4, 32]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  )
}
