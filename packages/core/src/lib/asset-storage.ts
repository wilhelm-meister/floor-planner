import { get, set } from 'idb-keyval'

export const ASSET_PREFIX = 'asset_data:'

// Cache for active object URLs to prevent leaks and flickering
const urlCache = new Map<string, string>()

/**
 * Save a file to IndexedDB and return a custom protocol URL
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback für nicht-sichere Kontexte (HTTP über IP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export async function saveAsset(file: File): Promise<string> {
  const id = generateId()
  await set(`${ASSET_PREFIX}${id}`, file)
  return `asset://${id}`
}

/**
 * Load a file from IndexedDB and return an object URL
 * If the URL is not a custom protocol URL, return it as is
 */
export async function loadAssetUrl(url: string): Promise<string | null> {
  if (!url) return null

  // HTTP URLs zurückgeben wie sie sind
  if (url.startsWith('http')) {
    return url
  }

  // Blob-URLs validieren — nach einem Reload sind sie ungültig
  if (url.startsWith('blob:')) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      return res.ok ? url : null
    } catch {
      return null
    }
  }

  // Handle our custom asset protocol
  if (url.startsWith('asset://')) {
    const id = url.replace('asset://', '')

    // Check cache first
    if (urlCache.has(id)) {
      return urlCache.get(id)!
    }

    try {
      const file = await get<File | Blob>(`${ASSET_PREFIX}${id}`)
      if (!file) {
        console.warn(`Asset not found: ${id}`)
        return null
      }
      const objectUrl = URL.createObjectURL(file)
      urlCache.set(id, objectUrl)
      return objectUrl
    } catch (error) {
      console.error('Failed to load asset:', error)
      return null
    }
  }

  // Legacy data URLs are returned as is
  return url
}
