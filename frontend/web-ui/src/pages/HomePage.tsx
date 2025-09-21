import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Sparkles, CheckCircle2, Loader2, X, Zap, Brain, Eye, Layers, Cpu, Settings, Plus, BookOpen } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'
import { APIError } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import { cn } from '../lib/utils'
import { api } from '../api/client'

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

export function HomePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [, setUploadProgress] = useState<UploadProgress | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showUploadCard, setShowUploadCard] = useState(false)
  const [enrichedBooks, setEnrichedBooks] = useState<EnrichedBook[]>([])
  const [isEnriching, setIsEnriching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [modelUsed, setModelUsed] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { saveScanResult, readingList, preferences, updatePreferences, addBook } = useStorage()
  const toast = useToast()

  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [, setRetryIn] = useState<number | null>(null)
  const [, setDetectedObjects] = useState<Array<{x: number, y: number, w: number, h: number, confidence: number}>>([])
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const progressRegionRef = useRef<HTMLDivElement>(null)
  const currentXHRRef = useRef<XMLHttpRequest | null>(null)
  const collectionCardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  type StepKey = 'optimize' | 'upload' | 'analyze' | 'extract' | 'enrich'
  const [steps, setSteps] = useState<Array<{ key: StepKey; label: string; status: 'pending' | 'active' | 'done'; icon: React.ComponentType; description: string }>>([
    { key: 'optimize', label: 'Optimizing', status: 'pending', icon: Layers, description: 'Enhancing image quality' },
    { key: 'upload', label: 'Uploading', status: 'pending', icon: Zap, description: 'Secure transfer to AI servers' },
    { key: 'analyze', label: 'Vision AI', status: 'pending', icon: Eye, description: 'Computer vision analysis' },
    { key: 'extract', label: 'Text OCR', status: 'pending', icon: Brain, description: 'Extracting readable text' },
    { key: 'enrich', label: 'Enriching', status: 'pending', icon: Cpu, description: 'Matching book metadata' }
  ])

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) window.clearInterval(retryTimerRef.current)
      if (selectedPreview) URL.revokeObjectURL(selectedPreview)
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [selectedPreview, cameraStream])

  const simulateDetection = useCallback(() => {
    // Simulate object detection for visual feedback
    const fakeDetections = [
      { x: 0.1, y: 0.2, w: 0.15, h: 0.6, confidence: 0.95 },
      { x: 0.3, y: 0.15, w: 0.12, h: 0.7, confidence: 0.88 },
      { x: 0.5, y: 0.25, w: 0.14, h: 0.55, confidence: 0.92 }
    ]

    setTimeout(() => setDetectedObjects(fakeDetections), 2000)
  }, [])

  const toggleGroqEnabled = useCallback(async () => {
    try {
      const newGroqEnabled = !preferences.groqEnabled
      await updatePreferences({ groqEnabled: newGroqEnabled })
      toast.success(`Groq Vision ${newGroqEnabled ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error('Failed to update Groq preference')
    }
  }, [preferences.groqEnabled, updatePreferences, toast])

  const scrollToCollection = useCallback(() => {
    if (collectionCardRef.current) {
      setTimeout(() => {
        // Get the exact position of the card
        const cardRect = collectionCardRef.current?.getBoundingClientRect()
        if (!cardRect) return

        // Calculate scroll position to center card in the middle of viewport
        const viewportHeight = window.innerHeight
        const cardHeight = cardRect.height
        const scrollTop = window.pageYOffset + cardRect.top - (viewportHeight / 2) + (cardHeight / 2)

        window.scrollTo({
          top: scrollTop,
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

  const enrichBooks = async (scanResult: { spines: Array<{ text: string; candidates?: string[] }> }) => {
    console.log('enrichBooks called with:', scanResult)
    if (!scanResult || !scanResult.spines) {
      console.log('No scanResult or spines found')
      return
    }

    setIsEnriching(true)

    // Scroll to collection area when enrichment starts
    setTimeout(() => {
      scrollToCollection()
    }, 100)

    try {
      // Prepare books for enrichment - use all spines with text
      const booksToEnrich = scanResult.spines
        .filter((spine) => spine.text.trim())
        .map((spine) => {
          // Try to parse title and author from text
          const text = spine.text.trim()

          // Enhanced parsing logic for common book spine formats
          let title = text
          let author = undefined

          // Pattern 1: "TITLE BY AUTHOR" or "TITLE by AUTHOR"
          const byPattern = /^(.+?)\s+(?:by|BY)\s+(.+)$/
          const byMatch = text.match(byPattern)
          if (byMatch) {
            title = byMatch[1].trim()
            author = byMatch[2].trim()
          } else {
            // Pattern 2: "AUTHOR: TITLE" or "AUTHOR - TITLE"
            const authorFirstPattern = /^(.+?)\s*[:-]\s*(.+)$/
            const authorFirstMatch = text.match(authorFirstPattern)
            if (authorFirstMatch) {
              author = authorFirstMatch[1].trim()
              title = authorFirstMatch[2].trim()
            } else {
              // Pattern 3: Split on common delimiters
              const parts = text.split(/,|\n|\|/).map((p) => p.trim()).filter((p) => p)
              if (parts.length > 1) {
                title = parts[0]
                author = parts[1]
              }
            }
          }

          return {
            title: title || text,
            author: author,
            isbn: spine.candidates?.find((c: string) => c.match(/^\d{10}(\d{3})?$/)) || undefined
          }
        })

      console.log('Books to enrich:', booksToEnrich)
      if (booksToEnrich.length === 0) {
        toast.error('No books with text detected for enrichment')
        return
      }

      // Call enrichment API via client
      console.log('Calling API enrichBooks...')
      const data = await api.enrichBooks(booksToEnrich)
      console.log('API response:', data)

      // Map to EnrichedBook format with IDs
      const enrichedWithIds = (data.books || []).map((book: EnrichedBook, index: number) => ({
        ...book,
        id: `enriched-${Date.now()}-${index}`,
        selected: false
      }))
      console.log('Setting enriched books:', enrichedWithIds)
      setEnrichedBooks(enrichedWithIds)

      // Scroll to the collection card after a short delay to ensure it's rendered
      setTimeout(() => {
        scrollToCollection()
      }, 200)

    } catch {
      console.error('Enrichment failed')
      toast.error('Failed to get book details. Please try again.')
    } finally {
      setIsEnriching(false)
    }
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
      console.error('Failed to save books')
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

      // Store the recommendations in localStorage to pass to RecommendationsPage
      const dataToStore = {
        book_scores: result.book_scores,
        analysis_summary: result.analysis_summary,
        total_books_analyzed: result.total_books_analyzed,
        cached: result.cached,
        cache_hit_count: result.cache_hit_count
      }

      localStorage.setItem('generatedRecommendations', JSON.stringify(dataToStore))

      // Show different messages based on cache status
      if (result.cached) {
        toast.success(`Retrieved ${result.cache_hit_count} cached recommendations for ${selectedBooks.length} selected book${selectedBooks.length !== 1 ? 's' : ''}!`)
      } else {
        toast.success(`Generated fresh recommendations for ${selectedBooks.length} selected book${selectedBooks.length !== 1 ? 's' : ''}!`)
      }

      // Small delay to ensure localStorage is written before navigation
      setTimeout(() => {
        navigate('/recommendations')
      }, 100)

    } catch {
      console.error('Failed to generate recommendations')
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
        console.error('Camera loading timeout')
        setCameraLoading(false)
        setCameraError('Camera loading timeout. Please try again.')
        toast.error('Camera loading timeout. Please try again.')
      }
    }, 10000) // 10 second timeout

    try {
      console.log('Requesting camera access...')

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser')
      }

      // Try to get rear camera first, fallback to any camera
      let stream: MediaStream
      try {
        console.log('Trying rear camera...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use rear camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        })
        console.log('Rear camera accessed successfully')
      } catch (environmentError) {
        console.log('Rear camera not available, trying any camera:', environmentError)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        })
        console.log('Any camera accessed successfully')
      }

      console.log('Stream obtained:', stream)
      console.log('Stream tracks:', stream.getTracks())

      setCameraStream(stream)

      // Wait for video element to be available
      if (videoRef.current) {
        console.log('Setting video srcObject...')
        videoRef.current.srcObject = stream

        // Add event listeners
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('Video started playing')
            }).catch((playError) => {
              console.error('Video play failed:', playError)
              setCameraLoading(false)
              toast.error('Failed to start camera video')
            })
          }
        }

        videoRef.current.oncanplay = () => {
          console.log('Video can play - camera ready')
          clearTimeout(timeoutId)
          setCameraLoading(false)
          setCameraError(null)
          toast.success('Camera activated! Position your bookshelf and click capture.')
        }

        videoRef.current.onerror = (e) => {
          console.error('Video error:', e)
          clearTimeout(timeoutId)
          setCameraLoading(false)
          setCameraError('Camera video failed to load')
          toast.error('Camera video failed to load')
        }

        videoRef.current.onloadstart = () => {
          console.log('Video load started')
        }

        videoRef.current.onloadeddata = () => {
          console.log('Video data loaded')
        }

      } else {
        console.error('Video ref not available')
        clearTimeout(timeoutId)
        setCameraLoading(false)
        setCameraError('Camera interface not ready')
        toast.error('Camera interface not ready')
      }

    } catch (error) {
      console.error('Camera access failed:', error)
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

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available')
      toast.error('Camera not ready. Please try again.')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      console.error('Canvas context not available')
      toast.error('Canvas not ready. Please try again.')
      return
    }

    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video dimensions not ready:', video.videoWidth, video.videoHeight)
      toast.error('Camera not ready. Please wait a moment and try again.')
      return
    }

    console.log('Capturing image with dimensions:', video.videoWidth, 'x', video.videoHeight)

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas')
        toast.error('Failed to capture image. Please try again.')
        return
      }

      console.log('Blob created successfully, size:', blob.size)

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
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
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

    // Reset all steps
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })))
    setSteps(prev => prev.map(s => s.key === 'optimize' ? { ...s, status: 'active' } : s))

    try {
      const previewUrl = URL.createObjectURL(file)
      setSelectedPreview(previewUrl)
      simulateDetection()

      // Step 1: Optimize
      setUploadProgress(prev => prev ? { ...prev, message: 'Enhancing image quality...' } : null)
      const processedBlob = await downscaleImage(file, MAX_LONG_EDGE)
      await new Promise(resolve => setTimeout(resolve, 800))

      setSteps(prev => prev.map(s => s.key === 'optimize' ? { ...s, status: 'done' } : s))
      setSteps(prev => prev.map(s => s.key === 'upload' ? { ...s, status: 'active' } : s))

      // Step 2: Upload
      setUploadProgress(prev => prev ? { ...prev, message: 'Secure transfer to AI servers...' } : null)
      const scanResult = await uploadWithProgress(processedBlob, (pct) => {
        setUploadProgress(prev => prev ? { ...prev, progress: pct } : null)
      })

      setSteps(prev => prev.map(s => s.key === 'upload' ? { ...s, status: 'done' } : s))
      setSteps(prev => prev.map(s => s.key === 'analyze' ? { ...s, status: 'active' } : s))

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

      setSteps(prev => prev.map(s => s.key === 'analyze' ? { ...s, status: 'done' } : s))
      setSteps(prev => prev.map(s => s.key === 'extract' ? { ...s, status: 'active' } : s))

      // Step 4: Text Extraction
      setUploadProgress(prev => prev ? { ...prev, message: 'Extracting text from spines...' } : null)
      for (let i = 0; i <= 100; i += 25) {
        setUploadProgress(prev => prev ? { ...prev, progress: i } : null)
        await new Promise(resolve => setTimeout(resolve, 180))
      }

      setSteps(prev => prev.map(s => s.key === 'extract' ? { ...s, status: 'done' } : s))
      setSteps(prev => prev.map(s => s.key === 'enrich' ? { ...s, status: 'active' } : s))

      // Step 5: Enrichment
      setUploadProgress(prev => prev ? { ...prev, message: 'Matching with book database...' } : null)
      for (let i = 0; i <= 100; i += 33) {
        setUploadProgress(prev => prev ? { ...prev, progress: i } : null)
        await new Promise(resolve => setTimeout(resolve, 150))
      }

      const reader = new FileReader()
      const imageDataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })

      // Transform new scan response to old format for compatibility
      const transformedSpines = scanResult.books?.map((book: { bbox: unknown; original_text?: string; title: string; author?: string; isbn?: string }) => ({
        bbox: book.bbox,
        text: book.original_text || `${book.title}${book.author ? ` by ${book.author}` : ''}`,
        candidates: book.isbn ? [book.isbn] : []
      })) || scanResult // Fallback to original scanResult if it's already in old format

      await saveScanResult({
        spines: transformedSpines,
        originalImage: imageDataUrl,
        modelUsed: scanResult.model_used
      })

      // Step 5: Complete (enrichment is the final step)
      setSteps(prev => prev.map(s => s.key === 'enrich' ? { ...s, status: 'done' } : s))

      const modelName = scanResult.model_used === 'groq' ? 'Groq Vision' :
                       scanResult.model_used === 'gcv' ? 'Google Vision + NVIDIA NIM' :
                       scanResult.model_used === 'cached' ? 'Cached Results' :
                       'AI Model'

      // Store the model used for display in the collection
      setModelUsed(modelName)

      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: `✨ Discovered ${scanResult.books?.length || transformedSpines.length} book${(scanResult.books?.length || transformedSpines.length) !== 1 ? 's' : ''} using ${modelName}!`
      })

      toast.success(`AI successfully identified ${scanResult.books?.length || transformedSpines.length} book${(scanResult.books?.length || transformedSpines.length) !== 1 ? 's' : ''} using ${modelName}!`)

      try { (navigator as any).vibrate?.([50, 100, 50]) } catch {}

      // Start enrichment process directly
      setTimeout(() => {
        enrichBooks({ spines: transformedSpines })
      }, 2000)

    } catch (error) {
      console.error('Upload failed:', error)
      setUploadProgress(null)
      setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })))

      if (error instanceof APIError) {
        if (error.status === 413) {
          toast.error('Image file is too large. Try a smaller image.')
        } else if (error.status === 415) {
          toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
        } else if (error.status === 429) {
          const retryAfter = error.retryAfter ?? 15
          setRetryIn(retryAfter)
          toast.error(`Rate limit exceeded. Auto-retrying in ${retryAfter}s...`)
          startRetryCountdown(retryAfter, async () => {
            try {
              await handleFileSelect(file)
            } finally {
              setRetryIn(null)
            }
          })
        } else {
          toast.error(`AI processing failed: ${error.message}`)
        }
      } else {
        toast.error('AI processing failed. Please try again.')
      }
    } finally {
      setIsUploading(false)
      setTimeout(() => {
        setUploadProgress(null)
        setDetectedObjects([])
      }, 3000)
    }
  }

  function startRetryCountdown(seconds: number, onDone: () => void) {
    if (retryTimerRef.current) window.clearInterval(retryTimerRef.current)
    let left = seconds
    setRetryIn(left)
    // @ts-expect-error - window.setInterval returns number in browser
    retryTimerRef.current = window.setInterval(() => {
      left -= 1
      setRetryIn(left)
      if (left <= 0) {
        if (retryTimerRef.current) window.clearInterval(retryTimerRef.current)
        onDone()
      }
    }, 1000)
  }

  async function downscaleImage(file: File, maxEdge: number): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    if (scale === 1) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.9))
    return blob
  }


  async function uploadWithProgress(blob: Blob, onProgress: (pct: number) => void) {
    return new Promise<unknown>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('image', new File([blob], 'scan.jpg', { type: 'image/jpeg' }))
      xhr.open('POST', `${import.meta.env.VITE_GATEWAY_URL || ''}/api/scan`)
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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) {
      if (files.length > 1) {
        toast.info(`Processing first image of ${files.length} selected. Multi-file support coming soon!`)
      }
      handleFileSelect(files[0])
    } else {
      toast.error('Please drop valid image files (JPG, PNG, WebP)')
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
              {selectedPreview ? (
                /* Display uploaded image in place of header text */
                <div className="mx-auto w-[600px] h-[450px] relative">
                  <div className="relative w-full h-full rounded-3xl overflow-hidden border-2 border-primary/30 shadow-2xl bg-gradient-to-br from-card/90 to-primary/10 backdrop-blur-sm">
                    <img
                      src={selectedPreview}
                      alt="Uploaded bookshelf image"
                      className="w-full h-full object-contain bg-black/5"
                    />

                  </div>
                </div>
              ) : (
                /* Original header text when no image uploaded */
                <>
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
                </>
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

            {/* Enhanced Stats - Under Start Discovery Button */}
            <div className="flex items-center justify-center gap-12">
              <div className="text-center group">
                <div className="relative">
                  <div className="text-3xl font-bold text-foreground group-hover:scale-110 transition-transform">
                    {readingList.length}
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-sm text-muted-foreground">Books in Library</div>
              </div>
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-border to-transparent"></div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                    2 AI
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Vision Providers</div>
              </div>
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-border to-transparent"></div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    30d
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Smart Cache</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Upload Section - Futuristic AI Interface */}
        {showUploadCard && (
        <div className="w-full mx-auto">
          <Card className={cn(
            "relative overflow-hidden transition-all duration-700",
            "bg-gradient-to-br from-card/90 via-card to-primary/10",
            "border-2 backdrop-blur-sm",
            dragOver
              ? "border-primary bg-gradient-to-br from-primary/20 to-blue-500/20 scale-[1.02] shadow-2xl shadow-primary/25"
              : "border-border/50 hover:border-primary/60 hover:shadow-xl",
            isUploading && "border-primary shadow-2xl shadow-primary/30"
          )}>
            {/* Animated border effect */}
            {(dragOver || isUploading) && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-blue-500 to-purple-500 p-[2px]">
                <div className="w-full h-full rounded-lg bg-card"></div>
              </div>
            )}

            <CardContent className="p-8 relative z-10">
              {!isUploading ? (
                <div
                  className="text-center cursor-pointer group"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                >
                  <div className="space-y-6">
                    {/* Enhanced Upload Icon */}
                    <div className="relative mx-auto w-24 h-24">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/20 animate-pulse"></div>
                      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/10 to-transparent"></div>
                      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border-2 border-primary/30 group-hover:scale-110 transition-all duration-500">
                        <div className="relative">
                          <Upload className="h-12 w-12 text-primary group-hover:text-blue-400 transition-colors" />
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center opacity-80">
                            <Brain className="h-2.5 w-2.5 text-white animate-pulse" />
                          </div>
                        </div>
                      </div>
                      {/* Floating particles */}
                      <div className="absolute top-8 right-4 w-2 h-2 bg-blue-400/60 rounded-full animate-bounce"></div>
                      <div className="absolute bottom-8 left-4 w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-ping"></div>
                    </div>

                    {/* Enhanced Text */}
                    <div className="space-y-4">
                      <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        AI Vision Processing Center
                      </h2>
                    </div>

                    {/* Enhanced Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Button
                        size="lg"
                        className="gap-3 px-8 py-4 text-base font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                        disabled={isUploading}
                      >
                        <Upload className="h-5 w-5" />
                        AI Scanner
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="gap-3 px-8 py-4 text-base font-semibold border-2 border-primary/40 hover:border-primary hover:bg-primary/10 hover:scale-105 transition-all duration-300"
                        onClick={(e) => { e.stopPropagation(); startCamera() }}
                        disabled={isUploading}
                      >
                        <Camera className="h-5 w-5" />
                        Live Capture
                      </Button>
                    </div>

                    {/* Enhanced File Info */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span>JPG, PNG, WebP</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-blue-400" />
                          <span>Auto-optimize to {MAX_FILE_MB}MB</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-2">
                          <Brain className="h-3 w-3 text-purple-400" />
                          <span>Dual AI providers</span>
                        </div>
                      </div>

                      {/* AI Provider Status */}

                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-10">
                  {/* Enhanced AI Processing Steps */}
                  <div className="max-w-6xl mx-auto">
                    <div className="bg-gradient-to-r from-card/50 to-card/80 rounded-2xl p-6 backdrop-blur-sm border border-primary/20">
                      <h3 className="text-lg font-semibold text-center mb-6 text-foreground">Neural Network Pipeline</h3>
                      <div className="flex flex-wrap justify-center gap-3">
                        {steps.map((step) => {
                          const Icon = step.icon
                          return (
                            <div
                              key={step.key}
                              className={cn(
                                "flex items-center gap-2 p-3 rounded-xl transition-all duration-500 min-w-[140px]",
                                step.status === 'active' && "bg-gradient-to-r from-primary/20 to-blue-500/20 scale-105",
                                step.status === 'done' && "bg-gradient-to-r from-green-500/20 to-emerald-500/20",
                                step.status === 'pending' && "bg-muted/30"
                              )}
                            >
                              <div className="flex-shrink-0">
                                {step.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {step.status === 'active' && <Icon className="h-4 w-4 text-primary animate-pulse" />}
                                {step.status === 'pending' && <Icon className="h-4 w-4 text-muted-foreground opacity-50" />}
                              </div>
                              <div className="flex-1 text-center">
                                <div className={cn(
                                  "font-medium text-xs",
                                  step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                                )}>
                                  {step.label}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Processing Animation */}
                  <div className="relative">
                    <div className="w-24 h-24 mx-auto">
                      {/* Multiple rotating rings */}
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-2 border-blue-500/20 border-r-blue-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
                      <div className="absolute inset-4 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDuration: '4s' }}></div>

                      {/* Central AI icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                          <Brain className="h-5 w-5 text-white animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Floating processing indicators */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                      </div>
                    </div>
                  </div>
                  {/* Enhanced Progress Info */}
                  <div className="space-y-6" ref={progressRegionRef as any} tabIndex={-1} aria-live="polite">


                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Camera Capture Modal */}
        {showCamera && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl mx-4">
              <Card className="border border-primary/20 bg-gradient-to-br from-card/90 to-primary/10 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-foreground">Camera Capture</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stopCamera}
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Close
                      </Button>
                    </div>

                    {/* Camera Preview */}
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-auto max-h-[60vh] rounded-lg bg-black"
                        style={{ minHeight: '300px' }}
                      />
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />

                      {/* Loading overlay */}
                      {cameraLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <div className="text-center text-white">
                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <div className="text-sm">Loading camera...</div>
                          </div>
                        </div>
                      )}

                      {/* Error overlay */}
                      {cameraError && !cameraLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <div className="text-center text-white p-4">
                            <div className="text-red-400 mb-2">⚠️</div>
                            <div className="text-sm mb-4">{cameraError}</div>
                            <Button
                              size="sm"
                              onClick={startCamera}
                              className="bg-primary hover:bg-primary/90"
                            >
                              Retry Camera
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Capture overlay */}
                      {!cameraLoading && !cameraError && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-4 border-2 border-white/50 rounded-lg"></div>
                          <div className="absolute top-4 left-4 right-4 text-center">
                            <div className="inline-block px-3 py-1 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
                              Position your bookshelf within the frame
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Capture Button */}
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        onClick={captureFromCamera}
                        disabled={cameraLoading || !!cameraError}
                        className="gap-3 px-8 py-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        <Camera className="h-6 w-6" />
                        {cameraLoading ? 'Loading Camera...' : cameraError ? 'Camera Error' : 'Capture Image'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Groq Toggle and Stats - Under Upload Card */}
        {showUploadCard && (
          <div className="max-w-4xl mx-auto mt-8 space-y-8">
            {/* Groq Toggle */}
            <div className="flex items-center justify-center">
              <Card className="border border-primary/20 bg-gradient-to-r from-card/80 to-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">AI Model:</span>
                    </div>
                    <Button
                      variant={preferences.groqEnabled ? "primary" : "outline"}
                      size="sm"
                      onClick={toggleGroqEnabled}
                      className={cn(
                        "transition-all duration-200",
                        preferences.groqEnabled
                          ? "bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
                          : "border-primary/30 hover:border-primary/50"
                      )}
                    >
                      {preferences.groqEnabled ? (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Groq Vision
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Google Vision + NVIDIA
                        </>
                      )}
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {preferences.groqEnabled
                        ? "Faster, more accurate"
                        : "Slower, less accurate"
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Stats */}
            <div className="flex items-center justify-center gap-12">
              <div className="text-center group">
                <div className="relative">
                  <div className="text-3xl font-bold text-foreground group-hover:scale-110 transition-transform">
                    {readingList.length}
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-sm text-muted-foreground">Books in Library</div>
              </div>
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-border to-transparent"></div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                    2 AI
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Vision Providers</div>
              </div>
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-border to-transparent"></div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    30d
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Smart Cache</div>
              </div>
            </div>
          </div>
        )}

        {/* AI-Enhanced Library Collection */}
        {(enrichedBooks.length > 0 || isEnriching) && (
          <div ref={collectionCardRef} className="mt-16">
            <Card className="collection-card border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="text-center space-y-3">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-1">
                      AI-Enhanced Library Collection
                    </h2>
                    {isEnriching ? (
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <p className="text-muted-foreground">Enriching book metadata with AI...</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Click books to select for your digital library</p>
                    )}

                    {/* Processing Insights */}
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 font-medium">Metadata Cached 180d</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                        <Brain className="h-3 w-3 text-blue-500" />
                        <span className="text-blue-600 font-medium">{modelUsed || 'AI Model'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {isEnriching ? (
                      // Loading skeleton
                      Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="border-border/50 bg-gradient-to-br from-card/80 to-muted/20">
                          <CardContent className="p-2 space-y-2">
                            <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-muted/30 animate-pulse">
                              <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted/30"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-4 bg-muted/50 rounded animate-pulse"></div>
                              <div className="h-3 bg-muted/30 rounded animate-pulse w-2/3"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      enrichedBooks.map((book) => (
                      <Card
                        key={book.id}
                        className={cn(
                          "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105",
                          book.selected
                            ? "border-green-500 bg-gradient-to-br from-green-500/20 to-blue-500/20 shadow-lg shadow-green-500/25"
                            : "border-border/50 hover:border-primary/50 bg-gradient-to-br from-card/80 to-muted/20"
                        )}
                        onClick={() => toggleBookSelection(book.id)}
                      >
                        <CardContent className="p-2 space-y-2">
                          {/* Book Cover */}
                          <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-muted/30 shadow-md">
                            <img
                              src={book.cover_url || '/placeholder-book.svg'}
                              alt={book.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onLoad={() => {
                                console.log('Cover image loaded successfully:', book.cover_url)
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                console.error('Cover image failed to load:', book.cover_url, e)
                                target.src = '/placeholder-book.svg'
                              }}
                            />

                            {/* Selection Indicator */}
                            <div className="absolute top-2 right-2">
                              {book.selected ? (
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 border-2 border-white/80 rounded-full flex items-center justify-center backdrop-blur-sm bg-black/20">
                                  <Plus className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>

                            {/* AI Enhancement Badge */}
                            <Badge
                              variant="secondary"
                              className="absolute bottom-2 left-2 text-xs bg-black/70 text-white border-0 backdrop-blur-sm px-1.5 py-0.5"
                            >
                              <Sparkles className="h-2.5 w-2.5 mr-1" />
                              AI
                            </Badge>
                          </div>

                          {/* Book Info */}
                          <div className="space-y-1">
                            <h3 className="font-bold text-sm text-foreground line-clamp-2 min-h-[2rem] leading-tight">
                              {book.title}
                            </h3>
                            {book.author && (
                              <p className="text-xs text-muted-foreground font-medium">
                                by {book.author}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              {book.isbn && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <BookOpen className="h-2.5 w-2.5" />
                                  <span className="text-xs">ISBN</span>
                                </div>
                              )}
                              {book.year && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {book.year}
                                </div>
                              )}
                            </div>
                            {book.publisher && (
                              <div className="text-xs text-muted-foreground italic">
                                {book.publisher}
                              </div>
                            )}
                            {book.subjects && book.subjects.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {book.subjects.slice(0, 1).map((subject, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0.5">
                                    {subject}
                                  </Badge>
                                ))}
                                {book.subjects.length > 1 && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                    +{book.subjects.length - 1}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-4xl mx-auto">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 gap-3 border-2 border-primary/40 hover:border-primary hover:bg-primary/10"
                onClick={() => {
                  setEnrichedBooks([])
                  setSelectedPreview(null)
                  setUploadProgress(null)
                  setIsUploading(false)
                  setDetectedObjects([])
                  setModelUsed('')
                  setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })))

                  // Scroll to top of page
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  })
                }}
              >
                <Zap className="h-5 w-5" />
                Scan Another
              </Button>
              <Button
                size="lg"
                className="flex-1 gap-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-500/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl disabled:opacity-50"
                onClick={saveSelectedBooks}
                disabled={!enrichedBooks.some(book => book.selected) || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving to Library...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Save to Library ({enrichedBooks.filter(b => b.selected).length})
                  </>
                )}
              </Button>
              <Button
                size="lg"
                className="flex-1 gap-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-500/90 hover:to-pink-600/90 shadow-lg hover:shadow-xl disabled:opacity-50"
                onClick={generateRecommendations}
                disabled={enrichedBooks.filter(book => book.selected).length === 0 || isGeneratingRecommendations}
              >
                {isGeneratingRecommendations ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Get Recommendations
                    {enrichedBooks.filter(book => book.selected).length > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                        {enrichedBooks.filter(book => book.selected).length}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Features Grid - lazy loaded */}
        <div className="mt-20">
          {/* Keep simple to avoid bundle bloat; could be lazy via React.lazy if desired */}
          {/* Moved to separate component in a future refactor */}
          </div>

        {/* Enhanced Tips Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card/50 to-primary/5 backdrop-blur-sm hover:border-primary/40 transition-all duration-300">
            <div className="p-6 font-semibold text-lg text-foreground flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              Optimization Tips for Maximum AI Accuracy
              <Sparkles className="h-5 w-5 text-primary opacity-70 ml-auto" />
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <Camera className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-foreground">Frame Composition</div>
                    <div className="text-xs text-muted-foreground">Fill frame with shelf, keep spines vertical for optimal recognition</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                  <Zap className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-foreground">Lighting & Focus</div>
                    <div className="text-xs text-muted-foreground">Even lighting, avoid glare, maintain sharp focus on text</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                  <Cpu className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-foreground">Image Quality</div>
                    <div className="text-xs text-muted-foreground">Use rear camera, step back for clarity, avoid blur</div>
            </div>
          </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Sample Testing Section */}
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
                No bookshelf ready? Test our models with a sample datasets.
                Each sample showcases different AI recognition capabilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 pt-8">
              {[
                { name: 'Small Shelf', desc: 'Compact collection test', image: '/static/img/small_shelf.jpg' },
                { name: 'Jungle Book', desc: 'Single book detection', image: '/static/img/jungle_book.jpg' },
                { name: 'Mixed Images', desc: 'Various book formats', image: '/static/img/images (1).jpeg' },
                { name: 'High Res WebP', desc: 'Modern format test', image: '/static/img/2560.webp' },
                { name: 'Large WebP', desc: 'High resolution test', image: '/static/img/81uBUxgLS1L_2048x2048.webp' }
              ].map((sample, index) => {
                return (
                  <Card key={sample.name} className="group relative overflow-hidden border border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 hover:border-primary/40 hover:scale-105 transition-all duration-300 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Image Preview */}
                        <div className="relative">
                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted/30">
                            <img
                              src={sample.image}
                              alt={sample.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/placeholder-book.svg'
                              }}
                            />
                          </div>
                          {/* Overlay gradient for better text readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{sample.name}</h3>
                          <p className="text-sm text-muted-foreground">{sample.desc}</p>
                        </div>
                        <Button
                          className="w-full gap-2 bg-gradient-to-r from-primary/80 to-blue-600/80 hover:from-primary hover:to-blue-600 transition-all duration-300"
                          onClick={async () => {
                            const sampleFiles = [
                              '/static/img/small_shelf.jpg',
                              '/static/img/jungle_book.jpg',
                              '/static/img/images (1).jpeg',
                              '/static/img/2560.webp',
                              '/static/img/81uBUxgLS1L_2048x2048.webp'
                            ]
                            try {
                              toast.info(`Loading AI test sample: ${sample.name}`)
                              const resp = await fetch(sampleFiles[index])
                              if (!resp.ok) throw new Error('Sample not available')
                              const blob = await resp.blob()
                              await handleFileSelect(new File([blob], `${sample.name.toLowerCase().replace(/\s+/g, '_')}.${blob.type.split('/')[1]}`, { type: blob.type }))
                            } catch {
                              toast.error('Sample image not available. Please upload your own image.')
                            }
                          }}
                        >
                          <Zap className="h-4 w-4" />
                          Deploy AI Test
              </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
