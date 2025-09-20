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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showUploadCard, setShowUploadCard] = useState(false)
  const [enrichedBooks, setEnrichedBooks] = useState<EnrichedBook[]>([])
  const [isEnriching, setIsEnriching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [modelUsed, setModelUsed] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { saveScanResult, readingList, preferences, updatePreferences, addBook } = useStorage()
  const toast = useToast()

  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [retryIn, setRetryIn] = useState<number | null>(null)
  const [detectedObjects, setDetectedObjects] = useState<Array<{x: number, y: number, w: number, h: number, confidence: number}>>([])
  const retryTimerRef = useRef<number | null>(null)
  const progressRegionRef = useRef<HTMLDivElement>(null)
  const currentXHRRef = useRef<XMLHttpRequest | null>(null)
  const collectionCardRef = useRef<HTMLDivElement>(null)

  type StepKey = 'optimize' | 'upload' | 'analyze' | 'extract' | 'enrich' | 'complete'
  const [steps, setSteps] = useState<Array<{ key: StepKey; label: string; status: 'pending' | 'active' | 'done'; icon: any; description: string }>>([
    { key: 'optimize', label: 'Optimizing', status: 'pending', icon: Layers, description: 'Enhancing image quality' },
    { key: 'upload', label: 'Uploading', status: 'pending', icon: Zap, description: 'Secure transfer to AI servers' },
    { key: 'analyze', label: 'Vision AI', status: 'pending', icon: Eye, description: 'Computer vision analysis' },
    { key: 'extract', label: 'Text OCR', status: 'pending', icon: Brain, description: 'Extracting readable text' },
    { key: 'enrich', label: 'Enriching', status: 'pending', icon: Cpu, description: 'Matching book metadata' },
    { key: 'complete', label: 'Complete', status: 'pending', icon: CheckCircle2, description: 'Finalizing results' }
  ])

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) window.clearInterval(retryTimerRef.current)
      if (selectedPreview) URL.revokeObjectURL(selectedPreview)
    }
  }, [selectedPreview])

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
    } catch (error) {
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

  const enrichBooks = async (scanResult: any) => {
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
        .filter((spine: any) => spine.text.trim())
        .map((spine: any) => {
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
              const parts = text.split(/,|\n|\|/).map((p: string) => p.trim()).filter((p: string) => p)
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
      const enrichedWithIds = (data.books || []).map((book: any, index: number) => ({
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

    } catch (error) {
      console.error('Enrichment failed:', error)
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

    } catch (error) {
      console.error('Failed to save books:', error)
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

    } catch (error) {
      console.error('Failed to generate recommendations:', error)
      toast.error('Failed to generate recommendations. Please try again.')
    } finally {
      setIsGeneratingRecommendations(false)
    }
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

    setTimeout(() => progressRegionRef.current?.focus(), 0)

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
      const transformedSpines = scanResult.books?.map((book: any) => ({
        bbox: book.bbox,
        text: book.original_text || `${book.title}${book.author ? ` by ${book.author}` : ''}`,
        candidates: book.isbn ? [book.isbn] : []
      })) || scanResult // Fallback to original scanResult if it's already in old format

      await saveScanResult({
        spines: transformedSpines,
        originalImage: imageDataUrl,
        modelUsed: scanResult.model_used
      })

      // Step 6: Complete
      setSteps(prev => prev.map(s => s.key === 'enrich' ? { ...s, status: 'done' } : s))
      setSteps(prev => prev.map(s => s.key === 'complete' ? { ...s, status: 'active' } : s))

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
    // @ts-ignore
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
    return new Promise<any>((resolve, reject) => {
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
              <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                Our advanced Vision Models instantly recognize book spines, extract metadata, and enrich your collection
                with <span className="text-primary font-semibold">High accuracy</span> in real-time.
              </p>
            )}
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
        <div className="max-w-3xl mx-auto">
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
                        onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click() }}
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
                      <div className="flex items-center justify-center gap-6 text-xs">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-600 font-medium">Groq Vision</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                          <span className="text-blue-600 font-medium">Google Vision</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-10">
                  {/* AI Processing Header */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-primary/30">
                      <Brain className="h-4 w-4 animate-pulse text-primary" />
                      <span className="text-sm font-semibold text-primary">AI Processing Active</span>
                    </div>
                  </div>

                  {/* Enhanced Preview with Detection Overlay */}
                  {selectedPreview && (
                    <div className="mx-auto max-w-lg relative">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl">
                        <img src={selectedPreview} alt="AI analyzing bookshelf" className="w-full max-h-80 object-contain bg-black/5 rounded-xl" />

                        {/* Overlay detection boxes */}
                        {detectedObjects.map((obj, i) => (
                          <div
                            key={i}
                            className="absolute border-2 border-green-400 bg-green-400/10 animate-pulse"
                            style={{
                              left: `${obj.x * 100}%`,
                              top: `${obj.y * 100}%`,
                              width: `${obj.w * 100}%`,
                              height: `${obj.h * 100}%`,
                            }}
                          >
                            <div className="absolute -top-6 left-0 bg-green-400 text-white px-2 py-1 rounded text-xs font-mono">
                              {Math.round(obj.confidence * 100)}%
                            </div>
                          </div>
                        ))}

                        {/* Scanning line effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent h-1 animate-pulse"></div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Processing Animation */}
                  <div className="relative">
                    <div className="w-40 h-40 mx-auto">
                      {/* Multiple rotating rings */}
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                      <div className="absolute inset-4 rounded-full border-4 border-blue-500/20 border-r-blue-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
                      <div className="absolute inset-8 rounded-full border-4 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDuration: '4s' }}></div>

                      {/* Central AI icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                          <Brain className="h-8 w-8 text-white animate-pulse" />
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

                  {/* Enhanced AI Processing Steps */}
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-gradient-to-r from-card/50 to-card/80 rounded-2xl p-6 backdrop-blur-sm border border-primary/20">
                      <h3 className="text-lg font-semibold text-center mb-6 text-foreground">Neural Network Pipeline</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {steps.map((step) => {
                          const Icon = step.icon
                          return (
                            <div
                              key={step.key}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl transition-all duration-500",
                                step.status === 'active' && "bg-gradient-to-r from-primary/20 to-blue-500/20 scale-105",
                                step.status === 'done' && "bg-gradient-to-r from-green-500/20 to-emerald-500/20",
                                step.status === 'pending' && "bg-muted/30"
                              )}
                            >
                              <div className="flex-shrink-0">
                                {step.status === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                {step.status === 'active' && <Icon className="h-5 w-5 text-primary animate-pulse" />}
                                {step.status === 'pending' && <Icon className="h-5 w-5 text-muted-foreground opacity-50" />}
                              </div>
                              <div className="flex-1 text-left">
                                <div className={cn(
                                  "font-medium text-sm",
                                  step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                                )}>
                                  {step.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {step.description}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Enhanced Progress Info */}
                  <div className="space-y-6" ref={progressRegionRef as any} tabIndex={-1} aria-live="polite">
                    <div className="space-y-3">
                      <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                        {uploadProgress?.message || 'Initializing AI systems...'}
                    </h3>

                      {uploadProgress && uploadProgress.stage !== 'complete' && (
                        <div className="max-w-lg mx-auto space-y-4">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="capitalize text-muted-foreground flex items-center gap-2">
                              <Cpu className="h-4 w-4 animate-pulse" />
                              {uploadProgress.stage} phase
                            </span>
                            <span className="text-primary font-mono">{uploadProgress.progress}%</span>
                        </div>
                          <div className="relative w-full bg-muted/30 rounded-full h-4 overflow-hidden backdrop-blur-sm" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress.progress}>
                          <div
                              className="h-full bg-gradient-to-r from-primary via-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                            style={{ width: `${uploadProgress.progress}%` }}
                            >
                              {/* Animated shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {retryIn !== null && (
                      <div className="flex items-center justify-center gap-2 text-amber-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-medium">Auto-retrying in {retryIn}s...</span>
                      </div>
                    )}

                    {uploadProgress?.stage === 'complete' && (
                      <div className="space-y-6">
                        <div className="relative">
                          <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl blur-xl animate-pulse"></div>
                          <Badge variant="success" className="gap-3 px-6 py-3 text-base font-semibold relative bg-gradient-to-r from-green-500 to-emerald-500 border-0">
                            <CheckCircle2 className="h-5 w-5" />
                            AI Analysis Complete!
                        </Badge>
                        </div>
                        <p className="text-muted-foreground text-lg">
                          Preparing your enhanced book collection...
                        </p>
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            size="lg"
                            className="gap-3 bg-gradient-to-r from-primary to-blue-600 hover:scale-105 transition-all duration-300 shadow-lg"
                            onClick={() => navigate('/results')}
                          >
                            <Eye className="h-5 w-5" />
                            View Results
                          </Button>
                          <Button
                            variant="ghost"
                            size="lg"
                            className="gap-3 hover:bg-primary/10 hover:scale-105 transition-all duration-300"
                            onClick={() => {
                              setSelectedPreview(null);
                              setUploadProgress(null);
                              setIsUploading(false);
                              setDetectedObjects([]);
                              setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })));
                            }}
                          >
                            <Sparkles className="h-5 w-5" />
                            Scan Another
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Cancel Button */}
                    {isUploading && uploadProgress?.stage !== 'complete' && (
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          className="gap-3 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
                          onClick={() => {
                            currentXHRRef.current?.abort();
                            setIsUploading(false);
                            setUploadProgress(null);
                            setDetectedObjects([]);
                            setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })));
                            toast.info('AI processing cancelled');
                          }}
                        >
                          <X className="h-4 w-4" />
                          Abort Processing
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Groq Toggle and Stats - Under Upload Card */}
        {showUploadCard && (
          <div className="max-w-3xl mx-auto mt-8 space-y-8">
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
            <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-2xl mx-auto">
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
          <details className="group rounded-2xl border border-primary/20 bg-gradient-to-br from-card/50 to-primary/5 backdrop-blur-sm hover:border-primary/40 transition-all duration-300">
            <summary className="cursor-pointer p-6 font-semibold text-lg text-foreground flex items-center gap-3 hover:text-primary transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              Optimization Tips for Maximum AI Accuracy
              <Sparkles className="h-5 w-5 text-primary opacity-70 ml-auto" />
            </summary>
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
          </details>
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
                No bookshelf ready? Test our neural networks with curated sample datasets.
                Each sample showcases different AI recognition capabilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              {[
                { name: 'Compact Shelf', desc: 'Dense collection test', difficulty: 'Medium', icon: Layers },
                { name: 'Home Library', desc: 'Mixed lighting scenario', difficulty: 'Easy', icon: Eye },
                { name: 'Book Stack', desc: 'Angle detection test', difficulty: 'Hard', icon: Brain }
              ].map((sample, index) => {
                const IconComp = sample.icon
                return (
                  <Card key={sample.name} className="group relative overflow-hidden border border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 hover:border-primary/40 hover:scale-105 transition-all duration-300 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="relative">
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IconComp className="h-8 w-8 text-primary" />
                          </div>
                          <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                            sample.difficulty === 'Easy' ? 'bg-green-500/20 text-green-600' :
                            sample.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-600' :
                            'bg-red-500/20 text-red-600'
                          }`}>
                            {sample.difficulty}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{sample.name}</h3>
                          <p className="text-sm text-muted-foreground">{sample.desc}</p>
                        </div>
                        <Button
                          className="w-full gap-2 bg-gradient-to-r from-primary/80 to-blue-600/80 hover:from-primary hover:to-blue-600 transition-all duration-300"
                          onClick={async () => {
                            const sampleFiles = ['/small_shelf.jpg', '/test_shelf.jpg', '/test_pixel.png']
                            try {
                              toast.info(`Loading AI test sample: ${sample.name}`)
                              const resp = await fetch(sampleFiles[index])
                              if (!resp.ok) throw new Error('Sample not available')
                              const blob = await resp.blob()
                              await handleFileSelect(new File([blob], `${sample.name.toLowerCase()}.jpg`, { type: blob.type }))
                            } catch (error) {
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
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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
