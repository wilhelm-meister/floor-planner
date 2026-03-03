import { emitter, type GridEvent, useScene, WallNode } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { DoubleSide, type Mesh, type Group, Shape, ShapeGeometry, Vector3 } from 'three'
import { sfxEmitter } from '@/lib/sfx-bus'
import useEditor from '@/store/use-editor'
import { CursorSphere } from '../shared/cursor-sphere'

const WALL_HEIGHT = 2.5
const WALL_THICKNESS = 0.15

/**
 * Snap point to 45° angle increments relative to start point
 * Also snaps end point to 0.5 grid
 */
const snapTo45Degrees = (start: Vector3, cursor: Vector3): Vector3 => {
  const dx = cursor.x - start.x
  const dz = cursor.z - start.z

  // Calculate angle in radians
  const angle = Math.atan2(dz, dx)

  // Round to nearest 45° (π/4 radians)
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)

  // Calculate distance from start to cursor
  const distance = Math.sqrt(dx * dx + dz * dz)

  // Project end point along snapped angle
  let snappedX = start.x + Math.cos(snappedAngle) * distance
  let snappedZ = start.z + Math.sin(snappedAngle) * distance

  // Snap to grid (size from store)
  const size = useEditor.getState().snapSize
  if (useEditor.getState().snapEnabled) {
    snappedX = Math.round(snappedX / size) * size
    snappedZ = Math.round(snappedZ / size) * size
  }

  return new Vector3(snappedX, cursor.y, snappedZ)
}

/**
 * Update wall preview mesh geometry to create a vertical plane between two points
 */
const updateWallPreview = (mesh: Mesh, start: Vector3, end: Vector3) => {
  // Calculate direction and perpendicular for wall thickness
  const direction = new Vector3(end.x - start.x, 0, end.z - start.z)
  const length = direction.length()

  if (length < 0.01) {
    mesh.visible = false
    return
  }

  mesh.visible = true
  direction.normalize()

  // Perpendicular vector for thickness
  const perpendicular = new Vector3(-direction.z, 0, direction.x).multiplyScalar(WALL_THICKNESS / 2)

  // Create wall shape (vertical rectangle in XY plane)
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(length, 0)
  shape.lineTo(length, WALL_HEIGHT)
  shape.lineTo(0, WALL_HEIGHT)
  shape.closePath()

  // Create geometry
  const geometry = new ShapeGeometry(shape)

  // Calculate rotation angle
  // Negate the angle to fix the opposite direction issue
  const angle = -Math.atan2(direction.z, direction.x)

  // Position at start point and rotate
  mesh.position.set(start.x, start.y, start.z)
  mesh.rotation.y = angle

  // Dispose old geometry and assign new one
  if (mesh.geometry) {
    mesh.geometry.dispose()
  }
  mesh.geometry = geometry
}

const commitWallDrawing = (start: [number, number], end: [number, number]) => {
  const currentLevelId = useViewer.getState().selection.levelId
  const { createNode, nodes } = useScene.getState()

  if (!currentLevelId) return

  const wallCount = Object.values(nodes).filter((n) => n.type === 'wall').length
  const name = `Wall ${wallCount + 1}`

  const wall = WallNode.parse({ name, start, end })

  createNode(wall, currentLevelId)
  sfxEmitter.emit('sfx:structure-build')
}

export const WallTool: React.FC = () => {
  const cursorRef = useRef<Group>(null)
  const wallPreviewRef = useRef<Mesh>(null!)
  const startingPoint = useRef(new Vector3(0, 0, 0))
  const endingPoint = useRef(new Vector3(0, 0, 0))
  const buildingState = useRef(0)
  const shiftPressed = useRef(false)
  const labelRef = useRef<Group>(null)
  const [wallLength, setWallLength] = useState<number | null>(null)

  useEffect(() => {
    let gridPosition: [number, number] = [0, 0]
    let previousWallEnd: [number, number] | null = null

    const onGridMove = (event: GridEvent) => {
      if (!cursorRef.current || !wallPreviewRef.current) return

      const { snapEnabled: se, snapSize: ss } = useEditor.getState()
      const snapActive = shiftPressed.current ? !se : se
      const snap = (v: number) => snapActive ? Math.round(v / ss) * ss : v
      gridPosition = [snap(event.position[0]), snap(event.position[2])]
      const cursorPosition = new Vector3(gridPosition[0], event.position[1], gridPosition[1])

      if (buildingState.current === 1) {
        // Snap to 45° angles — Shift inverts current snap state
        const snapped = !snapActive
          ? cursorPosition
          : snapTo45Degrees(startingPoint.current, cursorPosition)
        endingPoint.current.copy(snapped)

        // Position the cursor at the end of the wall being drawn
        cursorRef.current.position.set(snapped.x, snapped.y, snapped.z)

        // Play snap sound only when the actual wall end position changes
        const currentWallEnd: [number, number] = [endingPoint.current.x, endingPoint.current.z]
        if (previousWallEnd &&
            (currentWallEnd[0] !== previousWallEnd[0] || currentWallEnd[1] !== previousWallEnd[1])) {
          sfxEmitter.emit('sfx:grid-snap')
        }
        previousWallEnd = currentWallEnd

        // Update wall preview geometry
        updateWallPreview(wallPreviewRef.current, startingPoint.current, endingPoint.current)

        // Update length label
        const dx = endingPoint.current.x - startingPoint.current.x
        const dz = endingPoint.current.z - startingPoint.current.z
        const len = Math.sqrt(dx * dx + dz * dz)
        setWallLength(Math.round(len * 100) / 100)
        if (labelRef.current) {
          labelRef.current.position.set(
            (startingPoint.current.x + endingPoint.current.x) / 2,
            endingPoint.current.y + 0.5,
            (startingPoint.current.z + endingPoint.current.z) / 2,
          )
        }
      } else {
        setWallLength(null)
        // Not drawing a wall, just follow the grid position
        cursorRef.current.position.set(gridPosition[0], event.position[1], gridPosition[1])
      }
    }

    const onGridClick = (event: GridEvent) => {
      if (buildingState.current === 0) {
        startingPoint.current.set(gridPosition[0], event.position[1], gridPosition[1])
        buildingState.current = 1
        wallPreviewRef.current.visible = true
      } else if (buildingState.current === 1) {
        const dx = endingPoint.current.x - startingPoint.current.x
        const dz = endingPoint.current.z - startingPoint.current.z
        if (dx * dx + dz * dz < 0.01 * 0.01) return
        commitWallDrawing(
          [startingPoint.current.x, startingPoint.current.z],
          [endingPoint.current.x, endingPoint.current.z],
        )
        wallPreviewRef.current.visible = false
        buildingState.current = 0
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftPressed.current = true
        useViewer.getState().setSnapShiftOverride(true)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftPressed.current = false
        useViewer.getState().setSnapShiftOverride(false)
      }
    }

    const onCancel = () => {
      if (buildingState.current === 1) {
        buildingState.current = 0
        wallPreviewRef.current.visible = false
        setWallLength(null)
      }
    }

    emitter.on('grid:move', onGridMove)
    emitter.on('grid:click', onGridClick)
    emitter.on('tool:cancel', onCancel)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      emitter.off('grid:move', onGridMove)
      emitter.off('grid:click', onGridClick)
      emitter.off('tool:cancel', onCancel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  return (
    <group>
      {/* Cursor indicator */}
      <CursorSphere ref={cursorRef}  />

      {/* Längen-Label */}
      {wallLength !== null && (
        <group ref={labelRef}>
          <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
            <div className="rounded-md bg-background/90 border border-border px-2 py-0.5 text-xs font-mono font-medium text-foreground shadow-md backdrop-blur-sm whitespace-nowrap">
              {wallLength.toFixed(2)} m
            </div>
          </Html>
        </group>
      )}

      {/* Wall preview */}
      <mesh ref={wallPreviewRef} visible={false} renderOrder={1}>
        <shapeGeometry />
        <meshBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.5}
          side={DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
