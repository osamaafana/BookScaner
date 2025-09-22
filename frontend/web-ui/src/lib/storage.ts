// LocalStorage utilities with namespacing and TTL support

// Namespace prefix for all BookScanner localStorage keys
const NAMESPACE = 'bs'

// TTL (Time To Live) constants in milliseconds
export const TTL = {
  RECOMMENDATIONS: 24 * 60 * 60 * 1000, // 24 hours
  SCAN_RESULTS: 7 * 24 * 60 * 60 * 1000, // 7 days
  PREFERENCES: 30 * 24 * 60 * 60 * 1000, // 30 days
  CACHE: 60 * 60 * 1000 // 1 hour
} as const

// Storage key versions for data migration
export const STORAGE_VERSIONS = {
  RECOMMENDATIONS: 'v1',
  SCAN_RESULTS: 'v1',
  PREFERENCES: 'v1'
} as const

// Generic storage item with TTL
interface StorageItem<T = unknown> {
  t: number // timestamp
  v: string // version
  d: T // data
}

// Create namespaced storage key
function createKey(category: string, version: string): string {
  return `${NAMESPACE}:${category}:${version}`
}

// Set item with TTL and version
export function setStorageItem<T>(
  category: string,
  version: string,
  data: T,
  ttl: number = TTL.CACHE
): void {
  try {
    const item: StorageItem<T> = {
      t: Date.now(),
      v: version,
      d: data
    }

    const key = createKey(category, version)
    localStorage.setItem(key, JSON.stringify(item))

    if (import.meta.env.DEV) {
      console.log(`Storage set: ${key}`, { ttl: ttl / 1000 / 60, unit: 'minutes' })
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Failed to set storage item ${category}:`, error)
    }
  }
}

// Get item with TTL validation
export function getStorageItem<T>(
  category: string,
  version: string,
  ttl: number = TTL.CACHE
): T | null {
  try {
    const key = createKey(category, version)
    const itemStr = localStorage.getItem(key)

    if (!itemStr) {
      return null
    }

    const item: StorageItem<T> = JSON.parse(itemStr)

    // Check TTL
    const now = Date.now()
    const age = now - item.t

    if (age > ttl) {
      if (import.meta.env.DEV) {
        console.log(`Storage item expired: ${key} (age: ${Math.round(age / 1000 / 60)} minutes)`)
      }
      localStorage.removeItem(key)
      return null
    }

    // Check version compatibility
    if (item.v !== version) {
      if (import.meta.env.DEV) {
        console.log(`Storage version mismatch: ${key} (expected: ${version}, got: ${item.v})`)
      }
      localStorage.removeItem(key)
      return null
    }

    if (import.meta.env.DEV) {
      console.log(`Storage get: ${key} (age: ${Math.round(age / 1000 / 60)} minutes)`)
    }
    return item.d
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Failed to get storage item ${category}:`, error)
    }
    return null
  }
}

// Remove storage item
export function removeStorageItem(category: string, version: string): void {
  try {
    const key = createKey(category, version)
    localStorage.removeItem(key)
    if (import.meta.env.DEV) {
      console.log(`Storage removed: ${key}`)
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Failed to remove storage item ${category}:`, error)
    }
  }
}

// Clear all BookScanner storage items
export function clearAllStorage(): void {
  try {
    const keys = Object.keys(localStorage)
    const bsKeys = keys.filter(key => key.startsWith(NAMESPACE + ':'))

    bsKeys.forEach(key => {
      localStorage.removeItem(key)
    })

    if (import.meta.env.DEV) {
      console.log(`Cleared ${bsKeys.length} BookScanner storage items`)
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to clear storage:', error)
    }
  }
}

// Clean up expired items
export function cleanupExpiredStorage(): void {
  try {
    const keys = Object.keys(localStorage)
    const bsKeys = keys.filter(key => key.startsWith(NAMESPACE + ':'))
    let cleaned = 0

    bsKeys.forEach(key => {
      try {
        const itemStr = localStorage.getItem(key)
        if (!itemStr) return

        const item: StorageItem = JSON.parse(itemStr)
        const now = Date.now()
        const age = now - item.t

        // Use default TTL for cleanup (1 hour)
        if (age > TTL.CACHE) {
          localStorage.removeItem(key)
          cleaned++
        }
      } catch {
        // Remove corrupted items
        localStorage.removeItem(key)
        cleaned++
      }
    })

    if (cleaned > 0) {
      if (import.meta.env.DEV) {
        console.log(`Cleaned up ${cleaned} expired storage items`)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to cleanup storage:', error)
    }
  }
}

// Specific storage functions for common use cases
export const storage = {
  // Recommendations data
  setRecommendations: (data: unknown) =>
    setStorageItem('recs', STORAGE_VERSIONS.RECOMMENDATIONS, data, TTL.RECOMMENDATIONS),

  getRecommendations: () =>
    getStorageItem('recs', STORAGE_VERSIONS.RECOMMENDATIONS, TTL.RECOMMENDATIONS),

  removeRecommendations: () =>
    removeStorageItem('recs', STORAGE_VERSIONS.RECOMMENDATIONS),

  // Scan results
  setScanResults: (data: unknown) =>
    setStorageItem('scans', STORAGE_VERSIONS.SCAN_RESULTS, data, TTL.SCAN_RESULTS),

  getScanResults: () =>
    getStorageItem('scans', STORAGE_VERSIONS.SCAN_RESULTS, TTL.SCAN_RESULTS),

  // Preferences
  setPreferences: (data: unknown) =>
    setStorageItem('prefs', STORAGE_VERSIONS.PREFERENCES, data, TTL.PREFERENCES),

  getPreferences: () =>
    getStorageItem('prefs', STORAGE_VERSIONS.PREFERENCES, TTL.PREFERENCES)
}
