'use client'

/**
 * ScreenshotHelper — sits inside the R3F Canvas tree.
 * Exposes a global capture function that renders the scene to a 2D canvas
 * and returns a data URL.  Works reliably with WebGPU because we capture
 * right after an explicit render call from inside the Three.js context.
 */

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

// Global promise-based capture bridge
type CaptureResolver = (dataUrl: string) => void
let _pendingCapture: CaptureResolver | null = null

/**
 * Call this from anywhere in the app to request a screenshot.
 * Returns a base64 JPEG data URL.
 */
export function requestScreenshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    _pendingCapture = resolve
    // If no frame runs within 2s, reject
    setTimeout(() => {
      if (_pendingCapture === resolve) {
        _pendingCapture = null
        reject(new Error('Screenshot timeout — no render frame detected'))
      }
    }, 2000)
  })
}

export function ScreenshotHelper() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    let rafId: number

    const checkCapture = () => {
      if (_pendingCapture) {
        const resolve = _pendingCapture
        _pendingCapture = null

        try {
          // Get the renderer's canvas
          const canvas = gl.domElement as HTMLCanvasElement

          // Force a render right now so the buffer is fresh
          ;(gl as any).render(scene, camera)

          // Copy to a 2D canvas immediately (before the buffer is presented/cleared)
          const offscreen = document.createElement('canvas')
          offscreen.width = canvas.width
          offscreen.height = canvas.height
          const ctx = offscreen.getContext('2d')!
          ctx.drawImage(canvas, 0, 0)
          const dataUrl = offscreen.toDataURL('image/jpeg', 0.92)

          if (dataUrl && dataUrl.length > 10_000) {
            resolve(dataUrl)
          } else {
            // Fallback: try direct toDataURL
            const direct = canvas.toDataURL('image/jpeg', 0.92)
            resolve(direct)
          }
        } catch (err) {
          // If all fails, try direct
          try {
            const fallback = (gl.domElement as HTMLCanvasElement).toDataURL('image/jpeg', 0.92)
            resolve(fallback)
          } catch {
            resolve('')
          }
        }
      }
      rafId = requestAnimationFrame(checkCapture)
    }

    rafId = requestAnimationFrame(checkCapture)
    return () => cancelAnimationFrame(rafId)
  }, [gl, scene, camera])

  return null
}
