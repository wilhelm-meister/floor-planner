import { type AnyNodeId, type WallNode, type RoofNode, type ItemNode, useScene } from '@pascal-app/core'
import useViewer from '../store/use-viewer'
import { applySnap } from './snap'

/**
 * Stores original positions of all selected nodes at drag start.
 * Call captureGroupState() when drag begins, then applyGroupDelta() on each move.
 */

type NodeSnapshot =
  | { type: 'wall'; id: string; start: [number, number]; end: [number, number] }
  | { type: 'roof'; id: string; position: [number, number, number] }
  | { type: 'item'; id: string; position: [number, number, number] }

let snapshots: NodeSnapshot[] = []

/**
 * Capture the original positions of all selected nodes (except the dragged one).
 * Call at drag start.
 */
export function captureGroupState(draggedId: string): boolean {
  const { selectedIds } = useViewer.getState().selection
  if (selectedIds.length < 2 || !selectedIds.includes(draggedId)) {
    snapshots = []
    return false
  }

  const { nodes } = useScene.getState()
  snapshots = []

  for (const id of selectedIds) {
    if (id === draggedId) continue
    const node = nodes[id as AnyNodeId]
    if (!node) continue

    if (node.type === 'wall') {
      const w = node as WallNode
      snapshots.push({ type: 'wall', id, start: [...w.start], end: [...w.end] })
    } else if (node.type === 'roof') {
      const r = node as RoofNode
      snapshots.push({ type: 'roof', id, position: [...r.position] })
    } else if (node.type === 'item' || node.type === 'window' || node.type === 'door') {
      const it = node as ItemNode
      snapshots.push({ type: 'item', id, position: [...it.position] })
    }
  }

  return snapshots.length > 0
}

/**
 * Apply a world-space delta to all captured group members.
 * deltaX/deltaZ are raw (unsnapped) deltas from drag start.
 */
export function applyGroupDelta(deltaX: number, deltaZ: number) {
  const updateNode = useScene.getState().updateNode
  const dirtyNodes = useScene.getState().dirtyNodes

  for (const snap of snapshots) {
    if (snap.type === 'wall') {
      const [sx, sz] = applySnap(snap.start[0] + deltaX, snap.start[1] + deltaZ)
      const [ex, ez] = applySnap(snap.end[0] + deltaX, snap.end[1] + deltaZ)
      updateNode(snap.id as AnyNodeId, { start: [sx, sz], end: [ex, ez] })
      dirtyNodes.add(snap.id as AnyNodeId)
    } else if (snap.type === 'roof') {
      const [nx, nz] = applySnap(snap.position[0] + deltaX, snap.position[2] + deltaZ)
      updateNode(snap.id as AnyNodeId, { position: [nx, snap.position[1], nz] })
      dirtyNodes.add(snap.id as AnyNodeId)
    } else if (snap.type === 'item') {
      const [nx, nz] = applySnap(snap.position[0] + deltaX, snap.position[2] + deltaZ)
      updateNode(snap.id as AnyNodeId, { position: [nx, snap.position[1], nz] })
    }
  }
}

/** Clear group state after drag ends. */
export function clearGroupState() {
  snapshots = []
}
