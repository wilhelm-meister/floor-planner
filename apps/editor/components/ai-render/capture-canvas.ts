/**
 * Captures the 3D WebGPU canvas as a base64 JPEG.
 * 
 * WebGPU canvases don't reliably support toDataURL() because the
 * back-buffer is cleared after presentation. We use multiple strategies:
 *   1. Direct toDataURL (works if browser preserves buffer)
 *   2. createImageBitmap → offscreen 2D canvas (more reliable)
 *   3. Fallback with requestAnimationFrame timing
 */

export async function captureCanvas(): Promise<string> {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
  if (!canvas) throw new Error('No canvas found')

  // Strategy 1: Direct toDataURL
  try {
    const url = canvas.toDataURL('image/jpeg', 0.92)
    if (url && url.length > 10_000) return url
  } catch { /* WebGPU may throw */ }

  // Strategy 2: createImageBitmap → 2D canvas (works for WebGPU)
  try {
    const bitmap = await createImageBitmap(canvas)
    const offscreen = document.createElement('canvas')
    offscreen.width = bitmap.width
    offscreen.height = bitmap.height
    const ctx = offscreen.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    const url = offscreen.toDataURL('image/jpeg', 0.92)
    if (url && url.length > 10_000) return url
  } catch { /* Bitmap not available */ }

  // Strategy 3: Wait for next frame paint, then retry
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })

  try {
    const url = canvas.toDataURL('image/jpeg', 0.92)
    if (url && url.length > 10_000) return url
  } catch { /* still blank */ }

  // Strategy 4: drawImage from canvas (different codepath)
  const offscreen2 = document.createElement('canvas')
  offscreen2.width = canvas.width
  offscreen2.height = canvas.height
  const ctx2 = offscreen2.getContext('2d')
  if (ctx2) {
    ctx2.drawImage(canvas, 0, 0)
    const url = offscreen2.toDataURL('image/jpeg', 0.92)
    if (url && url.length > 10_000) return url
  }

  throw new Error('Canvas capture failed — the WebGPU buffer appears to be empty. Try again.')
}

/**
 * Strips the data URL prefix, returning only the base64 payload.
 */
export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1] ?? ''
}
