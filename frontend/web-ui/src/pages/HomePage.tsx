import { useState, useRef, useEffect, useCallback, useReducer, startTransition, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Zap, Brain } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { useStorage } from '../contexts/StorageContext'
import { APIError } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import { api } from '../api/client'
import { UploadCard } from '../components/UploadCard'
import { ProcessingSteps } from '../components/ProcessingSteps'
import { CollectionGrid } from '../components/CollectionGrid'
import { processImageFile, getImageFormatErrorMessage, isHeicFormat } from '../lib/imageUtils'
import { getModelLabel, type ScanResult } from '../api/types'
import { useRecommendations } from '../contexts/RecommendationsContext'
import { devLog, devWarn, devError } from '../lib/devLog'

// Lazy-load camera modal to reduce initial bundle size
const CameraModal = lazy(() => import('../components/CameraModal').then(module => ({ default: module.CameraModal })))

// Lazy-load AI Testing section to reduce initial bundle size
const AITestingSection = lazy(() => import('../components/AITestingSection').then(module => ({ default: module.AITestingSection })))

const MAX_FILE_MB = 10
const MAX_LONG_EDGE = 2048

interface UploadProgress {
  stage: 'uploading' | 'processing' | 'complete'
  progress: number
  message: string
}

interface EnrichedBook {
  id: string
  title: string
  author?: string
  isbn?: string
  cover_url?: string
  publisher?: string
  year?: number
  subjects?: string[]
  fingerprint: string
  selected?: boolean
}

// Step state management with reducer
type StepKey = 'optimize' | 'upload' | 'analyze' | 'extract' | 'enrich'
type StepState = Record<StepKey, 'pending' | 'active' | 'done'>

function stepReducer(state: StepState, action: { type: 'set'; key: StepKey; val: StepState[StepKey] } | { type: 'reset' }): StepState {
  if (action.type === 'reset') {
    return { optimize: 'pending', upload: 'pending', analyze: 'pending', extract: 'pending', enrich: 'pending' }
  }
  return { ...state, [action.key]: action.val }
}

export function HomePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showUploadCard, setShowUploadCard] = useState(false)
  const [enrichedBooks, setEnrichedBooks] = useState<EnrichedBook[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [modelUsed, setModelUsed] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { saveScanResult, preferences, addBook } = useStorage()
  const toast = useToast()
  const { setRecommendationsData } = useRecommendations()

  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [, setRetryIn] = useState<number | null>(null)
  const [, setDetectedObjects] = useState<Array<{x: number, y: number, w: number, h: number, confidence: number}>>([])
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showAITesting, setShowAITesting] = useState(false)
  const retryTimerRef = useRef<number | null>(null)
  const currentXHRRef = useRef<XMLHttpRequest | null>(null)
  const collectionCardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | undefined>(undefined)
  const cameraButtonRef = useRef<HTMLButtonElement | null>(null)


  // Step state with reducer for efficient updates
  const [stepState, dispatchStep] = useReducer(stepReducer, {
    optimize: 'pending',
    upload: 'pending',
    analyze: 'pending',
    extract: 'pending',
    enrich: 'pending'
  })


  useEffect(() => {
    // Initialize the worker with error handling
    try {
      workerRef.current = new Worker(new URL('../downscale.worker.ts', import.meta.url), { type: 'module' })
      devLog('Image processing worker initialized successfully')
    } catch (error) {
      devWarn('Failed to initialize worker, will use main thread processing:', error)
      workerRef.current = undefined
    }

    return () => {
      if (retryTimerRef.current) window.clearInterval(retryTimerRef.current)
      if (selectedPreview) URL.revokeObjectURL(selectedPreview)
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
      // Clean up worker
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = undefined
      }
    }
  }, [selectedPreview, cameraStream])

  // Clean camera abort on visibility change (iOS Safari compatibility)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && cameraStream) {
        devLog('Page hidden, stopping camera tracks')
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [cameraStream])

  const simulateDetection = useCallback(() => {
    // Simulate object detection for visual feedback
    const fakeDetections = [
      { x: 0.1, y: 0.2, w: 0.15, h: 0.6, confidence: 0.95 },
      { x: 0.3, y: 0.15, w: 0.12, h: 0.7, confidence: 0.88 },
      { x: 0.5, y: 0.25, w: 0.14, h: 0.55, confidence: 0.92 }
    ]

    setTimeout(() => setDetectedObjects(fakeDetections), 2000)
  }, [])


  const scrollToCollection = useCallback(() => {
    if (collectionCardRef.current) {
      setTimeout(() => {
        // Use scrollIntoView for better browser compatibility
        collectionCardRef.current?.scrollIntoView({
          block: 'center',
          behavior: 'smooth'
        })

        // Add a subtle highlight effect
        const card = collectionCardRef.current?.querySelector('.collection-card')
        if (card) {
          card.classList.add('animate-pulse')
          setTimeout(() => {
            card.classList.remove('animate-pulse')
          }, 2000)
        }
      }, 100) // Small delay to ensure the card is rendered
    }
  }, [])

  // Simplified function to scroll to collection (no longer needed for enrichment)
  const scrollToCollectionAfterResults = useCallback(() => {
    setTimeout(() => {
      scrollToCollection()
    }, 200)
  }, [])

  // Worker-based image downscaling to avoid blocking main thread
  function downscaleImageInWorker(file: File, maxEdge: number): Promise<Blob> {
    return new Promise((res) => {
      // For small files (< 1MB), use main thread for faster processing
      if (file.size < 1024 * 1024) {
        devLog('Small file detected, using main thread for faster processing')
        res(downscaleImageMainThread(file, maxEdge))
      return
    }

      const w = workerRef.current
      if (!w) {
        // Fallback to main thread if worker is not available
        devWarn('Worker not available, falling back to main thread processing')
        res(downscaleImageMainThread(file, maxEdge))
        return
      }

      const timeout = setTimeout(() => {
        w.removeEventListener('message', onMsg)
        w.removeEventListener('error', onError)
        devWarn('Worker timeout, falling back to main thread processing')
        res(downscaleImageMainThread(file, maxEdge))
      }, 5000) // 5 second timeout - more reasonable for image processing

      const onMsg = (e: MessageEvent) => {
        clearTimeout(timeout)
        w.removeEventListener('message', onMsg)
        w.removeEventListener('error', onError)

        if (e.data.error) {
          devError('Worker returned error:', e.data.error)
          devWarn('Falling back to main thread processing')
          res(downscaleImageMainThread(file, maxEdge))
          } else {
          res(e.data.blob as Blob)
        }
      }

      const onError = (e: ErrorEvent) => {
        clearTimeout(timeout)
        w.removeEventListener('message', onMsg)
        w.removeEventListener('error', onError)
        devError('Worker error:', e)
        devWarn('Falling back to main thread processing')
        res(downscaleImageMainThread(file, maxEdge))
      }

      w.addEventListener('message', onMsg)
      w.addEventListener('error', onError)
      w.postMessage({ file, maxEdge })
    })
  }

  // Fallback main thread image downscaling with proper EXIF handling
  async function downscaleImageMainThread(file: File, maxEdge: number): Promise<Blob> {
    // Create bitmap with proper orientation handling
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image' // This applies EXIF orientation automatically
    })

    const { width, height } = bitmap
    const scale = Math.min(1, maxEdge / Math.max(width, height))

    // If no scaling needed, still process to strip EXIF data for privacy
    if (scale === 1) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!

      // Draw with proper orientation (already applied by createImageBitmap)
      ctx.drawImage(bitmap, 0, 0)

      // Convert to blob without EXIF data (privacy protection)
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.85)
      )
      return blob
    }

    // Scale the image
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')!

    // Optimize canvas settings for better performance
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw with proper orientation and scaling
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    // Convert to blob without EXIF data (privacy protection)
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.85)
    )
    return blob
  }

  const toggleBookSelection = (bookId: string) => {
    setEnrichedBooks(prev =>
      prev.map(book =>
        book.id === bookId
          ? { ...book, selected: !book.selected }
          : book
      )
    )
  }

  const saveSelectedBooks = async () => {
    setIsSaving(true)

    try {
      const booksToSave = enrichedBooks.filter(book => book.selected)

      for (const book of booksToSave) {
        await addBook({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          cover_url: book.cover_url,
          fingerprint: book.fingerprint
        })
      }

      toast.success(`Added ${booksToSave.length} book${booksToSave.length !== 1 ? 's' : ''} to your library!`)

    } catch {
      devError('Failed to save books')
      toast.error('Failed to save books. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const generateRecommendations = async () => {
    setIsGeneratingRecommendations(true)

    try {
      // Only analyze selected books
      const selectedBooks = enrichedBooks.filter(book => book.selected)

      if (selectedBooks.length === 0) {
        toast.error('Please select at least one book to generate recommendations')
        return
      }

      // Convert selected books to the format expected by analyzeBooks
      const booksToAnalyze = selectedBooks.map(book => ({
        title: book.title,
        author: book.author,
        subjects: book.subjects || [],
        year: book.year,
        publisher: book.publisher,
        isbn: book.isbn,
        cover_url: book.cover_url
      }))

      // Generate recommendations using the new /recommend endpoint
      const result = await api.analyzeBooks({
        books: booksToAnalyze,
        user_preferences: {
          genres: preferences.genres.slice(0, 5),
          authors: [],
          languages: preferences.languages
        }
      })

      // Store the recommendations in context for navigation
      const recommendationsData = {
        book_scores: result.book_scores,
        analysis_summary: result.analysis_summary,
        total_books_analyzed: result.total_books_analyzed,
        cached: result.cached,
        cache_hit_count: result.cache_hit_count
      }

      setRecommendationsData(recommendationsData)

      // Show different messages based on cache status
      if (result.cached) {
        toast.success(`Retrieved ${result.cache_hit_count} cached recommendations for ${selectedBooks.length} selected book${selectedBooks.length !== 1 ? 's' : ''}!`)
      } else {
        toast.success(`Generated fresh recommendations for ${selectedBooks.length} selected book${selectedBooks.length !== 1 ? 's' : ''}!`)
      }

      // Small delay to ensure localStorage is written before navigation
      setTimeout(() => {
        startTransition(() => {
        navigate('/recommendations')
        })
      }, 100)

    } catch {
      devError('Failed to generate recommendations')
      toast.error('Failed to generate recommendations. Please try again.')
    } finally {
      setIsGeneratingRecommendations(false)
    }
  }

  const startCamera = async () => {
    setCameraLoading(true)
    setShowCamera(true)
    setCameraError(null)

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (cameraLoading) {
        devError('Camera loading timeout')
        setCameraLoading(false)
        setCameraError('Camera loading timeout. Please try again.')
        toast.error('Camera loading timeout. Please try again.')
      }
    }, 10000) // 10 second timeout

    try {
      devLog('Requesting camera access...')

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser')
      }

      // Try to get rear camera first, fallback to any camera (iOS Safari optimized)
      let stream: MediaStream
      try {
        devLog('Trying rear camera with iOS Safari optimized constraints...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use rear camera on mobile
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          }
        })
        devLog('Rear camera accessed successfully')
      } catch (environmentError) {
        devLog('Rear camera not available, trying any camera:', environmentError)
        try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 30, max: 30 }
          }
        })
        devLog('Any camera accessed successfully')
        } catch (anyCameraError) {
          devLog('Any camera failed, trying minimal constraints:', anyCameraError)
          // Final fallback with minimal constraints for iOS Safari
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          })
          devLog('Minimal camera constraints successful')
        }
      }

      devLog('Stream obtained:', stream)
      devLog('Stream tracks:', stream.getTracks())

      setCameraStream(stream)

      // Wait for video element to be available
      if (videoRef.current) {
        devLog('Setting video srcObject...')
        const video = videoRef.current

        // iOS Safari optimizations
        video.playsInline = true
        video.muted = true
        video.autoplay = true
        video.srcObject = stream

        // Add event listeners
        video.onloadedmetadata = () => {
          devLog('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight)
          // iOS Safari requires user interaction to play video
          video.play().then(() => {
              devLog('Video started playing')
            }).catch((playError) => {
              devError('Video play failed:', playError)
            // Try again with user interaction
            devLog('Attempting to play video again...')
            video.play().then(() => {
              devLog('Video started playing on retry')
            }).catch((retryError) => {
              devError('Video play retry failed:', retryError)
              setCameraLoading(false)
              toast.error('Failed to start camera video. Please try again.')
            })
            })
        }

        videoRef.current.oncanplay = () => {
          devLog('Video can play - camera ready')
          clearTimeout(timeoutId)
          setCameraLoading(false)
          setCameraError(null)
          toast.success('Camera activated! Position your bookshelf and click capture.')
        }

        videoRef.current.onerror = (e) => {
          devError('Video error:', e)
          clearTimeout(timeoutId)
          setCameraLoading(false)
          setCameraError('Camera video failed to load')
          toast.error('Camera video failed to load')
        }

        videoRef.current.onloadstart = () => {
          devLog('Video load started')
        }

        videoRef.current.onloadeddata = () => {
          devLog('Video data loaded')
        }

      } else {
        devError('Video ref not available')
        clearTimeout(timeoutId)
        setCameraLoading(false)
        setCameraError('Camera interface not ready')
        toast.error('Camera interface not ready')
      }

    } catch (error) {
      devError('Camera access failed:', error)
      clearTimeout(timeoutId)
      setCameraLoading(false)
      setShowCamera(false)

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Camera permission denied. Please allow camera access and try again.')
        } else if (error.name === 'NotFoundError') {
          toast.error('No camera found on this device.')
        } else if (error.name === 'NotSupportedError') {
          toast.error('Camera not supported in this browser.')
        } else {
          toast.error(`Camera error: ${error.message}`)
        }
      } else {
        toast.error('Camera access denied. Please allow camera permissions and try again.')
      }
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
    setCameraLoading(false)
    setCameraError(null)
  }

  const captureFromCamera = async () => {
    if (!cameraStream) {
      devError('Camera stream not available')
      toast.error('Camera not ready. Please try again.')
      return
    }

    const track = cameraStream.getVideoTracks()[0]

    // Try ImageCapture API first for full-resolution photos (iOS Safari compatibility)
    // @ts-expect-error - ImageCapture API
    if ('ImageCapture' in window && track) {
      try {
        devLog('Using ImageCapture API for high-quality photo')
        // @ts-expect-error - ImageCapture API
        const imageCapture = new ImageCapture(track)
        const blob = await imageCapture.takePhoto().catch((error) => {
          devWarn('ImageCapture failed, falling back to canvas:', error)
          return null
        })

        if (blob) {
          devLog('ImageCapture blob created, size:', blob.size)

          // Create file from blob
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
            type: blob.type || 'image/jpeg',
            lastModified: Date.now()
          })

          // Stop camera
          stopCamera()

          // Process the captured image
          toast.info('High-quality image captured! Processing...')
          await handleFileSelect(file)
          return
        }
      } catch (error) {
        devWarn('ImageCapture API failed:', error)
      }
    }

    // Fallback to canvas method
    devLog('Using canvas fallback for photo capture')
    if (!videoRef.current || !canvasRef.current) {
      devError('Video or canvas ref not available')
      toast.error('Camera not ready. Please try again.')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      devError('Canvas context not available')
      toast.error('Canvas not ready. Please try again.')
      return
    }

    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      devError('Video dimensions not ready:', video.videoWidth, video.videoHeight)
      toast.error('Camera not ready. Please wait a moment and try again.')
      return
    }

    devLog('Capturing image with canvas, dimensions:', video.videoWidth, 'x', video.videoHeight)

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas with proper orientation
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        devError('Failed to create blob from canvas')
        toast.error('Failed to capture image. Please try again.')
        return
      }

      devLog('Canvas blob created successfully, size:', blob.size)

      // Create file from blob
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      })

      // Stop camera
      stopCamera()

      // Process the captured image
      toast.info('Image captured! Processing...')
      await handleFileSelect(file)
    }, 'image/jpeg', 0.9)
  }


  const handleFileSelect = async (file: File) => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    // Process and validate the image file (handles HEIC conversion)
    let processedFile: File
    try {
      processedFile = await processImageFile(file)

      // Show conversion message if file was converted
      if (isHeicFormat(file)) {
        toast.info('HEIC/HEIF image converted to JPEG for processing')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : getImageFormatErrorMessage(file)
      toast.error(errorMessage)
      return
    }

    if (processedFile.size > MAX_FILE_MB * 1024 * 1024) {
      toast.info(`Image over ${MAX_FILE_MB}MB, optimizing for AI processing...`)
    }

    setIsUploading(true)
    setDetectedObjects([])
    setModelUsed('')
    setUploadProgress({
      stage: 'uploading',
      progress: 0,
      message: 'Initializing AI processing...'
    })

    // Reset all steps and start optimizing
    dispatchStep({ type: 'reset' })
    dispatchStep({ type: 'set', key: 'optimize', val: 'active' })

    try {
      // Create preview with proper orientation handling
      const bitmap = await createImageBitmap(processedFile, { imageOrientation: 'from-image' })
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bitmap, 0, 0)

      // Create preview URL with proper orientation
      canvas.toBlob((blob) => {
        if (blob) {
          // Revoke previous URL to prevent memory leaks
          if (selectedPreview) {
            URL.revokeObjectURL(selectedPreview)
          }
          const previewUrl = URL.createObjectURL(blob)
      setSelectedPreview(previewUrl)
        }
      }, 'image/jpeg', 0.9)

      simulateDetection()

      // Step 1: Optimize
      setUploadProgress(prev => prev ? { ...prev, message: 'Enhancing image quality...' } : null)
      const processedBlob = await downscaleImageInWorker(processedFile, MAX_LONG_EDGE)
      // Removed artificial delay for faster processing

      dispatchStep({ type: 'set', key: 'optimize', val: 'done' })
      dispatchStep({ type: 'set', key: 'upload', val: 'active' })

      // Step 2: Upload
      setUploadProgress(prev => prev ? { ...prev, message: 'Secure transfer to AI servers...' } : null)
      const scanResult = await uploadWithProgress(processedBlob, (pct) => {
        setUploadProgress(prev => prev ? { ...prev, progress: pct } : null)
      }) as ScanResult

      dispatchStep({ type: 'set', key: 'upload', val: 'done' })
      dispatchStep({ type: 'set', key: 'analyze', val: 'active' })

      // Step 3: Vision AI Analysis
      setUploadProgress({
        stage: 'processing',
        progress: 0,
        message: 'Computer vision analyzing scene...'
      })

      for (let i = 0; i <= 100; i += 20) {
        setUploadProgress(prev => prev ? { ...prev, progress: i } : null)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      dispatchStep({ type: 'set', key: 'analyze', val: 'done' })
      dispatchStep({ type: 'set', key: 'extract', val: 'active' })

      // Step 4: Text Extraction
      setUploadProgress(prev => prev ? { ...prev, message: 'Extracting text from spines...' } : null)
      for (let i = 0; i <= 100; i += 25) {
        setUploadProgress(prev => prev ? { ...prev, progress: i } : null)
        await new Promise(resolve => setTimeout(resolve, 180))
      }

      dispatchStep({ type: 'set', key: 'extract', val: 'done' })
      dispatchStep({ type: 'set', key: 'enrich', val: 'active' })

      // Step 5: Enrichment
      setUploadProgress(prev => prev ? { ...prev, message: 'Matching with book database...' } : null)
      for (let i = 0; i <= 100; i += 33) {
        setUploadProgress(prev => prev ? { ...prev, progress: i } : null)
        await new Promise(resolve => setTimeout(resolve, 150))
      }

      const reader = new FileReader()
      const imageDataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(processedFile)
      })

      // Use the enriched books directly from scan endpoint
      const enrichedBooks = scanResult.books || []

      // Transform to EnrichedBook format with IDs
      const enrichedWithIds = enrichedBooks.map((book: unknown, index: number) => {
        const b = book as {
          title: string
          author?: string
          isbn?: string
          cover_url?: string
          publisher?: string
          year?: number
          subjects?: string[]
        }
        return {
          id: `enriched-${Date.now()}-${index}`,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          cover_url: b.cover_url,
          publisher: b.publisher,
          year: b.year,
          subjects: b.subjects,
          fingerprint: b.isbn || `${b.title}-${b.author}`.toLowerCase().replace(/\s+/g, '-'),
          selected: false
        }
      }))

      // Save scan result for history
      await saveScanResult({
        spines: enrichedBooks.map((book: unknown) => {
          const b = book as {
            bbox?: unknown
            original_text?: string
            title: string
            author?: string
            isbn?: string
          }
          return {
            bbox: b.bbox,
            text: b.original_text || `${b.title}${b.author ? ` by ${b.author}` : ''}`,
            candidates: b.isbn ? [b.isbn] : []
          }
        })),
        originalImage: imageDataUrl,
        modelUsed: scanResult.model_used
      })

      // Store the model used for display in the collection
      setModelUsed(getModelLabel(scanResult.model_used))

      // Set enriched books directly
      setEnrichedBooks(enrichedWithIds)

      // Scroll to collection after results are set
      scrollToCollectionAfterResults()

      // Complete the upload process
      dispatchStep({ type: 'set', key: 'enrich', val: 'done' })

      const modelName = getModelLabel(scanResult.model_used)

      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: `✨ Discovered ${enrichedBooks.length} book${enrichedBooks.length !== 1 ? 's' : ''} using ${modelName}!`
      })

      toast.success(`AI successfully identified ${enrichedBooks.length} book${enrichedBooks.length !== 1 ? 's' : ''} using ${modelName}!`)

      try { (navigator as { vibrate?: (pattern: number[]) => void }).vibrate?.([50, 100, 50]) } catch {
        // Vibration not supported, ignore
      }

      // Finish the upload process
      setIsUploading(false)
      setTimeout(() => {
        setUploadProgress(null)
        setDetectedObjects([])
      }, 3000)

    } catch (error) {
      devError('Upload failed:', error)
      setUploadProgress(null)
      dispatchStep({ type: 'reset' })
      setIsUploading(false)

      if (error instanceof APIError) {
        if (error.status === 413) {
          toast.error('Image file is too large. Try a smaller image.')
        } else if (error.status === 415) {
          toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
        } else if (error.status === 429) {
          // Note: 429 errors are now handled automatically with exponential backoff
          // This fallback is for cases where all retries failed
          const retryAfter = error.retryAfter ?? 15
          setRetryIn(retryAfter)
          const serverMessage = error.serverMessage || 'Rate limit exceeded'
          toast.error(`${serverMessage}. Auto-retrying in ${retryAfter}s...`)
          startRetryCountdown(retryAfter, async () => {
            try {
              await handleFileSelect(processedFile)
            } finally {
              setRetryIn(null)
            }
          })
        } else {
          // Use server message if available, fallback to error message
          const errorMessage = error.serverMessage || error.message
          toast.error(`AI processing failed: ${errorMessage}`)

          // Log additional details for debugging
          if (error.details) {
            devError('API Error Details:', error.details)
          }
        }
      } else {
        toast.error('AI processing failed. Please try again.')
      }
    }
  }

  function startRetryCountdown(seconds: number, onDone: () => void) {
    if (retryTimerRef.current) window.clearInterval(retryTimerRef.current)
    let left = seconds
    setRetryIn(left)
    retryTimerRef.current = window.setInterval(() => {
      left -= 1
      setRetryIn(left)
      if (left <= 0) {
        if (retryTimerRef.current) window.clearInterval(retryTimerRef.current)
        onDone()
      }
    }, 1000)
  }



  async function uploadWithProgress(blob: Blob, onProgress: (pct: number) => void) {
    return new Promise<unknown>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('image', new File([blob], 'scan.jpg', { type: 'image/jpeg' }))
      // Use the same gateway URL validation as the API client
      const gatewayUrl = (() => {
        const envUrl = import.meta.env.VITE_GATEWAY_URL
        if (!envUrl || envUrl.trim() === '') return ''
        try {
          const url = new URL(envUrl)
          if (!['http:', 'https:'].includes(url.protocol)) return ''
          return url.origin
        } catch {
          return ''
        }
      })()

      xhr.open('POST', `${gatewayUrl}/api/scan`)
      xhr.withCredentials = true
      currentXHRRef.current = xhr
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          onProgress(pct)
        }
      }
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)) } catch { resolve(xhr.responseText) }
          } else {
            const retryAfter = parseInt(xhr.getResponseHeader('retry-after') || '0', 10) || undefined
            reject(new APIError(`Upload failed: ${xhr.status}`, xhr.status, undefined, retryAfter))
          }
          currentXHRRef.current = null
        }
      }
      xhr.onerror = () => reject(new APIError('Network error', 0))
      xhr.send(formData)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      if (files.length > 1) {
        toast.info(`Processing first image of ${files.length} selected. Multi-file support coming soon!`)
      }
      handleFileSelect(files[0])
    } else {
      toast.error('Please drop valid image files (JPG, PNG, WebP, HEIC, etc.)')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragOver) {
    setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only set drag state to false if we're leaving the drop zone entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
    setDragOver(false)
    }
  }

  const handleSampleSelect = async (sample: { name: string; image: string; index: number }) => {
    const sampleFiles = [
      '/static/img/small_shelf.jpg',
      '/static/img/jungle_book.jpg',
      '/static/img/images (1).jpeg',
      '/static/img/2560.webp',
      '/static/img/81uBUxgLS1L_2048x2048.webp'
    ]
    try {
      toast.info(`Loading AI test sample: ${sample.name}`)
      const resp = await fetch(sampleFiles[sample.index])
      if (!resp.ok) throw new Error('Sample not available')
      const blob = await resp.blob()
      await handleFileSelect(new File([blob], `${sample.name.toLowerCase().replace(/\s+/g, '_')}.${blob.type.split('/')[1]}`, { type: blob.type }))
    } catch {
      toast.error('Sample image not available. Please upload your own image.')
    }
  }

  return (
    <div className="min-h-screen" aria-busy={isUploading}>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section - Futuristic AI Style */}
        <div className="text-center space-y-8 mb-16 relative">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
            <div className="absolute top-32 right-1/3 w-1 h-1 bg-blue-400/40 rounded-full animate-ping"></div>
            <div className="absolute bottom-40 left-1/3 w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-pulse"></div>
          </div>

          <div className="space-y-6 relative">
            <div className="max-w-6xl mx-auto px-6">
              {/* Always show the header */}
                  <h1 className="text-5xl md:text-7xl font-black text-foreground leading-[0.9] tracking-tight">
                    <span className="block">Transform Your</span>
                    <span className="block bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                      Library
                    </span>
                    <span className="block text-3xl md:text-5xl font-normal text-muted-foreground mt-2">
                      with AI Intelligence
                    </span>
                  </h1>

                  {!showUploadCard && (
                    <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mt-6">
                      Our advanced Vision Models instantly recognize book spines, extract metadata, and enrich your collection
                      with <span className="text-primary font-semibold">High accuracy</span> in real-time.
                    </p>
                  )}

              {/* Show uploaded image below header when available */}
              {selectedPreview && (
                <div className="mx-auto w-[600px] h-[450px] relative mt-8">
                  <div className="relative w-full h-full rounded-3xl overflow-hidden border-2 border-primary/30 shadow-2xl bg-gradient-to-br from-card/90 to-primary/10 backdrop-blur-sm">
                    <img
                      src={selectedPreview}
                      alt="Uploaded bookshelf image"
                      className="w-full h-full object-contain bg-black/5"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Start Discovery Process Button */}
        {!showUploadCard && (
          <div className="flex flex-col items-center justify-center mt-16 space-y-12">
            <Button
              size="lg"
              className="gap-3 px-12 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              onClick={() => setShowUploadCard(true)}
            >
              <Sparkles className="h-6 w-6" />
              Start Discovery Process
            </Button>

          </div>
        )}

        {/* Main Upload Section - Futuristic AI Interface */}
        {showUploadCard && !(enrichedBooks.length > 0) && (
          <UploadCard
            dragOver={dragOver}
            isUploading={isUploading}
            onFileSelect={() => fileInputRef.current?.click()}
            onStartCamera={startCamera}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
            cameraButtonRef={cameraButtonRef}
          />
        )}

        {/* Processing Steps */}
        {isUploading && (
          <div className="w-full mx-auto">
            <Card className="relative overflow-hidden transition-all duration-700 bg-gradient-to-br from-card/90 via-card to-primary/10 border-2 border-primary shadow-2xl shadow-primary/30 backdrop-blur-sm">
              <CardContent className="p-8 relative z-10">
                <ProcessingSteps
                  stepState={stepState}
                  currentMessage={uploadProgress?.message}
                  progress={uploadProgress?.progress}
                />
            </CardContent>
          </Card>
        </div>
        )}

        {/* Camera Capture Modal - Lazy Loaded */}
        {showCamera && (
          <Suspense fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="text-foreground">Loading camera...</span>
                    </div>
                          </div>
                        </div>
          }>
            <CameraModal
              showCamera={showCamera}
              cameraLoading={cameraLoading}
              cameraError={cameraError}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onStopCamera={stopCamera}
              onCaptureFromCamera={captureFromCamera}
              onStartCamera={startCamera}
              triggerRef={cameraButtonRef}
            />
          </Suspense>
        )}


        {/* AI-Enhanced Library Collection */}
        {enrichedBooks.length > 0 && (
          <div ref={collectionCardRef}>
            <CollectionGrid
              enrichedBooks={enrichedBooks}
              modelUsed={modelUsed}
              isSaving={isSaving}
              isGeneratingRecommendations={isGeneratingRecommendations}
              onToggleBookSelection={toggleBookSelection}
              onSaveSelectedBooks={saveSelectedBooks}
              onGenerateRecommendations={generateRecommendations}
              onScanAnother={() => {
                  setEnrichedBooks([])
                  // Revoke URL before clearing state
                  if (selectedPreview) {
                    URL.revokeObjectURL(selectedPreview)
                  }
                  setSelectedPreview(null)
                  setUploadProgress(null)
                  setIsUploading(false)
                  setDetectedObjects([])
                  setModelUsed('')
                dispatchStep({ type: 'reset' })

                  // Scroll to top of page
                startTransition(() => {
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  })
                })
                }}
            />
          </div>
        )}

        {/* AI Testing Section - Lazy Loaded */}
        {!showAITesting ? (
        <div className="mt-20 max-w-6xl mx-auto text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-primary/30">
                <Brain className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold text-primary">AI Testing Suite</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                Experience AI Vision Intelligence
            </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  No bookshelf ready? Test our models with sample datasets.
                Each sample showcases different AI recognition capabilities.
              </p>
            </div>

                        <Button
                size="lg"
                className="gap-3 px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                onClick={() => setShowAITesting(true)}
              >
                <Zap className="h-5 w-5" />
                Load AI Testing Samples
              </Button>
                      </div>
            </div>
        ) : (
          <Suspense fallback={
            <div className="mt-20 max-w-6xl mx-auto text-center">
              <div className="flex items-center justify-center gap-3 py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-lg text-muted-foreground">Loading AI testing samples...</span>
          </div>
        </div>
          }>
            <AITestingSection onSampleSelect={handleSampleSelect} />
          </Suspense>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />
      </div>
    </div>
  )
}
