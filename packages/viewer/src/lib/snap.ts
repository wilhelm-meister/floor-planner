import useViewer from '../store/use-viewer'

/** Rundet einen Wert auf das nächste Raster-Vielfache */
export function snapValue(v: number, size: number): number {
  return Math.round(v / size) * size
}

/** Gibt die aktuellen Snap-Einstellungen zurück (aus dem Viewer-Store) */
export function getSnapSettings() {
  const { snapEnabled, snapSize } = useViewer.getState()
  return { snapEnabled, snapSize }
}

/** Wendet Snap auf x/z an — Shift invertiert den aktuellen Snap-Status */
export function applySnap(x: number, z: number): [number, number] {
  const { snapEnabled, snapSize, snapShiftOverride } = useViewer.getState()
  const active = snapShiftOverride ? !snapEnabled : snapEnabled
  if (!active) return [x, z]
  return [snapValue(x, snapSize), snapValue(z, snapSize)]
}
