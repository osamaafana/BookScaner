import React, { createContext, useContext, useEffect, useState } from 'react'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { api } from '../api/client'

// Types
interface Book {
  id: string
  title: string
  author?: string
  isbn?: string
  cover_url?: string
  cover?: string // Alias for cover_url for compatibility
  fingerprint: string
  addedAt: number
}

interface Preferences {
  genres: string[]
  languages: string[]
  groqEnabled?: boolean
}

interface ScanResult {
  id: string
  spines: Array<{
    bbox: { x: number; y: number; w: number; h: number } | null
    text: string
    candidates: string[]
  }>
  originalImage?: string // Base64 data URL of the original image
  timestamp: number
  modelUsed?: string // The model/provider used for scanning
}

interface QueuedHistoryAction {
  id: string
  bookId: string
  action: 'saved' | 'removed'
  timestamp: number
  retryCount: number
  lastAttempt?: number
}

// IndexedDB Schema
interface BookScannerDB extends DBSchema {
  books: {
    key: string
    value: Book
  }
  preferences: {
    key: string
    value: any
  }
  scanResults: {
    key: string
    value: ScanResult
    indexes: { timestamp: number }
  }
  historyQueue: {
    key: string
    value: QueuedHistoryAction
    indexes: { timestamp: number; retryCount: number }
  }
}

// Context Types
interface StorageContextType {
  // Books
  books: Book[]
  readingList: Book[] // Alias for books for compatibility
  addBook: (book: Omit<Book, 'id' | 'addedAt'>) => Promise<void>
  removeBook: (id: string) => Promise<void>

  // Preferences
  preferences: Preferences
  updatePreferences: (prefs: Partial<Preferences>) => Promise<void>

  // Scan Results
  latestScanResult: ScanResult | null
  scanHistory: ScanResult[] // All scan results
  saveScanResult: (result: Omit<ScanResult, 'id' | 'timestamp'>) => Promise<void>

  // Sync
  syncWithBackend: () => Promise<void>

  // History Queue
  queueHistory: (bookId: string, action: 'saved' | 'removed') => Promise<void>
  processHistoryQueue: () => Promise<void>

  // Data management
  clearAllLocalData: () => Promise<void>

  // Loading
  isLoading: boolean
}

const StorageContext = createContext<StorageContextType | null>(null)

// Database setup
const DB_NAME = 'BookScannerDB'
const DB_VERSION = 1

async function openDatabase(): Promise<IDBPDatabase<BookScannerDB>> {
  return openDB<BookScannerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Books store
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' })
      }

      // Preferences store
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'key' })
      }

      // Scan results store
      if (!db.objectStoreNames.contains('scanResults')) {
        const store = db.createObjectStore('scanResults', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
      }

      // History queue store for offline resilience
      if (!db.objectStoreNames.contains('historyQueue')) {
        const store = db.createObjectStore('historyQueue', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
        store.createIndex('retryCount', 'retryCount')
      }
    }
  })
}

// Provider Component
export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<IDBPDatabase<BookScannerDB> | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])

  // Load scan history from database
  useEffect(() => {
    async function loadScanHistory() {
      if (!db) return
      try {
        const results = await db.getAll('scanResults')
        setScanHistory(results)
      } catch (error) {
        console.error('Failed to load scan history:', error)
      }
    }
    loadScanHistory()
  }, [db])
  const [preferences, setPreferences] = useState<Preferences>({
    genres: [],
    languages: ['en']
  })
  const [latestScanResult, setLatestScanResult] = useState<ScanResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Constants for retry logic
  const MAX_RETRY_ATTEMPTS = 3
  const RETRY_DELAY_BASE = 1000 // 1 second, exponential backoff
  const QUEUE_PROCESS_INTERVAL = 30000 // 30 seconds

  // Initialize database
  useEffect(() => {
    async function initDB() {
      try {
        const database = await openDatabase()
        setDb(database)

        // Load initial data
        const storedBooks = await database.getAll('books')
        setBooks(storedBooks.sort((a, b) => b.addedAt - a.addedAt))

        const storedPrefs = await database.get('preferences', 'user-preferences')
        if (storedPrefs) {
          setPreferences(storedPrefs.value)
        }

        // Load latest scan result
        const tx = database.transaction('scanResults', 'readonly')
        const index = tx.store.index('timestamp')
        const latestScan = await index.get(IDBKeyRange.upperBound(Date.now()))
        if (latestScan) {
          setLatestScanResult(latestScan)
        }

        // Start processing history queue
        processHistoryQueue()

      } catch (error) {
        console.error('Failed to initialize database:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initDB()

    // Set up periodic queue processing
    const queueInterval = setInterval(processHistoryQueue, QUEUE_PROCESS_INTERVAL)
    return () => clearInterval(queueInterval)
  }, [])

  // Add book to reading list
  const addBook = async (bookData: Omit<Book, 'id' | 'addedAt'>) => {
    if (!db) return

    const book: Book = {
      ...bookData,
      id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now()
    }

    try {
      await db.put('books', book)
      setBooks(prev => [book, ...prev])

      // Queue history action for offline resilience
      await queueHistory(book.id, 'saved')
    } catch (error) {
      console.error('Failed to add book:', error)
    }
  }

  // Remove book from reading list
  const removeBook = async (id: string) => {
    if (!db) return

    try {
      await db.delete('books', id)
      setBooks(prev => prev.filter(book => book.id !== id))

      // Queue history action for offline resilience
      await queueHistory(id, 'removed')
    } catch (error) {
      console.error('Failed to remove book:', error)
    }
  }

  // Update preferences
  const updatePreferences = async (newPrefs: Partial<Preferences>) => {
    if (!db) return

    const updated = { ...preferences, ...newPrefs }

    try {
      await db.put('preferences', {
        key: 'user-preferences',
        value: updated
      })
      setPreferences(updated)

      // Sync with backend
      await syncPreferencesWithBackend(updated)
    } catch (error) {
      console.error('Failed to update preferences:', error)
    }
  }

  // Save scan result
  const saveScanResult = async (resultData: Omit<ScanResult, 'id' | 'timestamp'>) => {
    if (!db) return

    const result: ScanResult = {
      ...resultData,
      id: `scan-${Date.now()}`,
      timestamp: Date.now()
    }

    try {
      await db.put('scanResults', result)
      setLatestScanResult(result)
      // Update scan history
      setScanHistory(prev => [result, ...prev])
    } catch (error) {
      console.error('Failed to save scan result:', error)
    }
  }

  // Queue history action for offline resilience
  const queueHistory = async (bookId: string, action: 'saved' | 'removed') => {
    if (!db) return

    const queueItem: QueuedHistoryAction = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookId,
      action,
      timestamp: Date.now(),
      retryCount: 0
    }

    try {
      await db.put('historyQueue', queueItem)
      console.log(`Queued history action: ${action} for book ${bookId}`)

      // Try to process immediately if online
      processHistoryQueue()
    } catch (error) {
      console.error('Failed to queue history action:', error)
    }
  }

  // Process history queue with retry logic
  const processHistoryQueue = async () => {
    if (!db) return

    try {
      const queuedActions = await db.getAll('historyQueue')
      if (queuedActions.length === 0) return

      console.log(`Processing ${queuedActions.length} queued history actions`)

      for (const action of queuedActions) {
        try {
          // Check if we should retry (exponential backoff)
          if (action.lastAttempt) {
            const timeSinceLastAttempt = Date.now() - action.lastAttempt
            const requiredDelay = RETRY_DELAY_BASE * Math.pow(2, action.retryCount)
            if (timeSinceLastAttempt < requiredDelay) {
              continue // Skip this action, not enough time has passed
            }
          }

          // Skip if exceeded max retries
          if (action.retryCount >= MAX_RETRY_ATTEMPTS) {
            console.warn(`Max retries exceeded for history action ${action.id}, removing from queue`)
            await db.delete('historyQueue', action.id)
            continue
          }

          // Find the book data for enrichment
          const book = books.find(b => b.id === action.bookId)
          if (!book && action.action === 'saved') {
            console.warn(`Book ${action.bookId} not found for history sync, removing from queue`)
            await db.delete('historyQueue', action.id)
            continue
          }

          let success = false

          if (action.action === 'saved' && book) {
            success = await syncBookWithBackend(book)
          } else if (action.action === 'removed') {
            success = await syncBookRemovalWithBackend(action.bookId)
          }

          if (success) {
            // Remove from queue on success
            await db.delete('historyQueue', action.id)
            console.log(`Successfully processed history action ${action.id}`)
          } else {
            // Update retry count and last attempt
            const updatedAction = {
              ...action,
              retryCount: action.retryCount + 1,
              lastAttempt: Date.now()
            }
            await db.put('historyQueue', updatedAction)
            console.log(`Failed to process history action ${action.id}, retry ${updatedAction.retryCount}/${MAX_RETRY_ATTEMPTS}`)
          }
        } catch (error) {
          console.error(`Error processing history action ${action.id}:`, error)

          // Update retry count on error
          const updatedAction = {
            ...action,
            retryCount: action.retryCount + 1,
            lastAttempt: Date.now()
          }
          await db.put('historyQueue', updatedAction)
        }
      }
    } catch (error) {
      console.error('Failed to process history queue:', error)
    }
  }

  // Sync with backend
  const syncWithBackend = async () => {
    try {
      // Process any queued history actions first
      await processHistoryQueue()

      // Sync preferences to /api/preferences
      await syncPreferencesWithBackend(preferences)
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  // Helper: Sync individual book with backend
  const syncBookWithBackend = async (book: Book): Promise<boolean> => {
    try {
      // Convert to backend format - we'll need to find the book ID first
      const enrichData = await api.enrichBooks([{
        title: book.title,
        author: book.author,
        isbn: book.isbn
      }])

      if (!enrichData.books || !enrichData.books[0]) {
        console.error('No book data returned from enrichment')
        return false
      }

      // Avoid sending fake IDs: if backend returns canonical book with fingerprint, skip until mapping exists
      // TODO: When backend provides canonical IDs, store mapping and send actual ID here
      return true
    } catch (error) {
      console.error('Failed to sync book with backend:', error)
      return false
    }
  }

  // Helper: Sync book removal with backend
  const syncBookRemovalWithBackend = async (_bookId: string): Promise<boolean> => {
    try {
      // No-op until a stable mapping exists
      return true
    } catch (error) {
      console.error('Failed to sync book removal with backend:', error)
      return false
    }
  }

  // Helper: Sync preferences with backend
  const syncPreferencesWithBackend = async (prefs: Preferences) => {
    try {
      await api.updatePreferences({
        genres: prefs.genres,
        languages: prefs.languages,
        groqEnabled: prefs.groqEnabled
      })
    } catch (error) {
      console.error('Failed to sync preferences with backend:', error)
    }
  }

  // Clear all local data (IndexedDB)
  const clearAllLocalData = async () => {
    if (!db) return

    try {
      // Clear all object stores
      await db.clear('books')
      await db.clear('preferences')
      await db.clear('scanResults')
      await db.clear('historyQueue')

      // Reset state
      setBooks([])
      setScanHistory([])
      setLatestScanResult(null)
      setPreferences({ genres: [], languages: ['en'] })

      console.log('All local data cleared successfully')
    } catch (error) {
      console.error('Failed to clear local data:', error)
      throw error
    }
  }

  const value: StorageContextType = {
    books,
    readingList: books, // Alias for compatibility
    addBook,
    removeBook,
    preferences,
    updatePreferences,
    latestScanResult,
    scanHistory,
    saveScanResult,
    syncWithBackend,
    queueHistory,
    processHistoryQueue,
    clearAllLocalData,
    isLoading
  }

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  )
}

// Hook
export function useStorage() {
  const context = useContext(StorageContext)
  if (!context) {
    throw new Error('useStorage must be used within StorageProvider')
  }
  return context
}
