import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, ArrowRight, Brain, Eye, Cpu, Zap, Sparkles, BookOpen, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'
import { SpineCrop } from '../components/SpineCrop'
import { api } from '../api/client'
import { cn } from '../lib/utils'
import { useToast } from '../contexts/ToastContext'

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

export function ResultsPage() {
  const [selectedSpines, setSelectedSpines] = useState<string[]>([])
  const [enrichedBooks, setEnrichedBooks] = useState<EnrichedBook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const { latestScanResult, addBook } = useStorage()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (!latestScanResult) {
      navigate('/')
      return
    }

    // Pre-select all spines with text
    const spinesWithText = latestScanResult.spines
      .map((_, index) => index.toString())
      .filter(index => latestScanResult.spines[parseInt(index)].text.trim())

    setSelectedSpines(spinesWithText)
  }, [latestScanResult, navigate])

  const toggleSpineSelection = (index: string) => {
    setSelectedSpines(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const enrichSelectedBooks = async () => {
    if (!latestScanResult || selectedSpines.length === 0) return

    setIsEnriching(true)

    try {
      // Prepare books for enrichment
      const booksToEnrich = selectedSpines
        .map(index => latestScanResult.spines[parseInt(index)])
        .filter(spine => spine.text.trim())
        .map(spine => {
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
              const parts = text.split(/,|\n|\|/).map(p => p.trim()).filter(p => p)
              if (parts.length > 1) {
                title = parts[0]
                author = parts[1]
              }
            }
          }

          return {
            title: title || text,
            author: author,
            isbn: spine.candidates.find(c => c.match(/^\d{10}(\d{3})?$/)) || undefined
          }
        })

      // Debug: Log what we're sending to the backend
      console.log('Books to enrich:', booksToEnrich)

      // Call enrichment API via client
      const data = await api.enrichBooks(booksToEnrich)

      // Debug: Log what we received from the backend
      console.log('Enriched books received:', data.books)
      // Map to EnrichedBook format with IDs
      const enrichedWithIds = (data.books || []).map((book, index) => ({
        ...book,
        id: `enriched-${Date.now()}-${index}`,
        selected: false
      }))
      setEnrichedBooks(enrichedWithIds)

    } catch (error) {
      console.error('Enrichment failed:', error)
      toast.error('Failed to get book details. Please try again.')
    } finally {
      setIsEnriching(false)
    }
  }

  const saveSelectedBooks = async () => {
    setIsLoading(true)

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

      // Navigate to recommendations
      navigate('/recommendations')

    } catch (error) {
      console.error('Failed to save books:', error)
      toast.error('Failed to save books. Please try again.')
    } finally {
      setIsLoading(false)
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

  if (!latestScanResult) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto border border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-sm">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">No AI Analysis Found</h3>
              <p className="text-muted-foreground">Please scan a bookshelf first to see results</p>
              <Button onClick={() => navigate('/')} className="gap-2">
                <Zap className="h-4 w-4" />
                Start AI Scan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (enrichedBooks.length === 0) {
    return (
      <div className="min-h-screen" aria-busy={isEnriching}>
        <div className="container mx-auto px-4 py-8">
          {/* Futuristic AI Header */}
          <div className="text-center space-y-8 mb-16 relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-20 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
              <div className="absolute top-32 right-1/3 w-1 h-1 bg-blue-400/40 rounded-full animate-ping"></div>
            </div>

            <div className="space-y-6 relative">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 text-primary text-sm font-semibold border border-primary/30 backdrop-blur-sm">
                <Eye className="h-4 w-4 animate-pulse" />
                AI Vision Analysis Complete
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-foreground leading-[0.9] tracking-tight">
                <span className="block">Neural Network</span>
                <span className="block bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                  Detection Results
                </span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Our AI has identified <span className="text-primary font-semibold">{latestScanResult.spines.length} book spine{latestScanResult.spines.length !== 1 ? 's' : ''}</span> in your image.
                Select which ones to process for metadata enrichment.
              </p>

              {latestScanResult.modelUsed && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-sm border border-border/50">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span>Powered by {latestScanResult.modelUsed === 'groq' ? 'Groq Vision' :
                                  latestScanResult.modelUsed === 'gcv' ? 'Google Vision + NVIDIA NIM' :
                                  latestScanResult.modelUsed === 'cached' ? 'Cached Results' :
                                  'AI Model'}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-12 mt-8">
              <div className="text-center group">
                <div className="relative">
                  <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                    {latestScanResult.spines.filter(s => s.text.trim()).length}
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-sm text-muted-foreground">Text Detected</div>
              </div>
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">{selectedSpines.length}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>
            </div>
          </div>

          {/* AI Detection Grid */}
          <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-2">
                    AI Detection Grid
                  </h2>
                  <p className="text-muted-foreground">Click spines to select for metadata enrichment</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {latestScanResult.spines.map((spine, index) => (
                    <Card
                      key={index}
                      className={cn(
                        "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105",
                        selectedSpines.includes(index.toString())
                          ? "border-primary bg-gradient-to-br from-primary/20 to-blue-500/20 shadow-lg shadow-primary/25"
                          : "border-border/50 hover:border-primary/50 bg-gradient-to-br from-card/80 to-muted/20"
                      )}
                      onClick={() => toggleSpineSelection(index.toString())}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Spine Image/Placeholder */}
                        <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-muted/30">
                          {spine.bbox && latestScanResult.originalImage ? (
                            <SpineCrop
                              imageUrl={latestScanResult.originalImage}
                              bbox={spine.bbox}
                              alt={`Book spine ${index + 1}: ${spine.text || 'No text detected'}`}
                              className="w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/30 text-muted-foreground">
                              <BookOpen className="h-8 w-8" />
                            </div>
                          )}

                          {/* Selection Indicator */}
                          {selectedSpines.includes(index.toString()) && (
                            <div className="absolute top-2 right-2">
                              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}

                          {/* AI Confidence Badge */}
                          {spine.text.trim() && (
                            <Badge
                              variant="secondary"
                              className="absolute bottom-2 left-2 text-xs bg-black/60 text-white border-0"
                            >
                              <Brain className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>

                        {/* Spine Text */}
                        <div className="space-y-1">
                          <div className="text-xs font-mono text-muted-foreground">Spine {index + 1}</div>
                          <div className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem]">
                            {spine.text.trim() || (
                              <span className="text-muted-foreground italic">No text detected</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 max-w-2xl mx-auto">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-3 border-2 border-primary/40 hover:border-primary hover:bg-primary/10"
              onClick={() => navigate('/')}
            >
              <Zap className="h-5 w-5" />
              Scan Another
            </Button>
            <Button
              size="lg"
              className="flex-1 gap-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl disabled:opacity-50"
              onClick={enrichSelectedBooks}
              disabled={selectedSpines.length === 0 || isEnriching}
            >
              {isEnriching ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  AI Processing...
                </>
              ) : (
                <>
                  <Cpu className="h-5 w-5" />
                  Enrich with AI ({selectedSpines.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" aria-busy={isLoading}>
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced AI Header */}
        <div className="text-center space-y-8 mb-16 relative">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/4 w-2 h-2 bg-green-400/30 rounded-full animate-pulse"></div>
            <div className="absolute top-32 right-1/3 w-1 h-1 bg-blue-400/40 rounded-full animate-ping"></div>
          </div>

          <div className="space-y-6 relative">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 text-green-600 text-sm font-semibold border border-green-500/30 backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4" />
              AI Metadata Enrichment Complete
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-foreground leading-[0.9] tracking-tight">
              <span className="block">Enhanced</span>
              <span className="block bg-gradient-to-r from-green-500 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                Book Collection
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Our AI has enriched <span className="text-primary font-semibold">{enrichedBooks.length} book{enrichedBooks.length !== 1 ? 's' : ''}</span> with
              comprehensive metadata. Select which ones to add to your digital library.
            </p>
          </div>

          {/* Enhanced Stats */}
          <div className="flex items-center justify-center gap-12 mt-8">
            <div className="text-center group">
              <div className="relative">
                <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  {enrichedBooks.length}
                </div>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div className="text-sm text-muted-foreground">Books Found</div>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
            <div className="text-center group">
              <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                {enrichedBooks.filter(b => b.selected).length}
              </div>
              <div className="text-sm text-muted-foreground">Selected</div>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
            <div className="text-center group">
              <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                {enrichedBooks.filter(b => b.cover_url).length}
              </div>
              <div className="text-sm text-muted-foreground">With Covers</div>
            </div>
          </div>
        </div>

        {/* Enhanced Book Grid */}
        <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-2">
                  AI-Enhanced Library Collection
                </h2>
                <p className="text-muted-foreground">Click books to select for your digital library</p>

                {/* Processing Insights */}
                <div className="flex items-center justify-center gap-6 text-xs">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 font-medium">Metadata Cached 180d</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                    <Brain className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-600 font-medium">Multi-Source Enriched</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {enrichedBooks.map((book) => (
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
                    <CardContent className="p-6 space-y-4">
                      {/* Book Cover */}
                      <div className="aspect-[3/4] relative rounded-xl overflow-hidden bg-muted/30 shadow-lg">
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
                        <div className="absolute top-3 right-3">
                          {book.selected ? (
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                              <Check className="h-5 w-5 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 border-2 border-white/80 rounded-full flex items-center justify-center backdrop-blur-sm bg-black/20">
                              <Plus className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* AI Enhancement Badge */}
                        <Badge
                          variant="secondary"
                          className="absolute bottom-3 left-3 text-xs bg-black/70 text-white border-0 backdrop-blur-sm"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Enhanced
                        </Badge>
                      </div>

                      {/* Book Info */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-foreground line-clamp-2 min-h-[3.5rem] leading-tight">
                          {book.title}
                        </h3>
                        {book.author && (
                          <p className="text-sm text-muted-foreground font-medium">
                            by {book.author}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          {book.isbn && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <BookOpen className="h-3 w-3" />
                              ISBN: {book.isbn}
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
                          <div className="flex flex-wrap gap-1 mt-2">
                            {book.subjects.slice(0, 2).map((subject, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs px-2 py-1">
                                {subject}
                              </Badge>
                            ))}
                            {book.subjects.length > 2 && (
                              <Badge variant="secondary" className="text-xs px-2 py-1">
                                +{book.subjects.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 max-w-2xl mx-auto">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 gap-3 border-2 border-primary/40 hover:border-primary hover:bg-primary/10"
            onClick={() => setEnrichedBooks([])}
          >
            <ArrowRight className="h-5 w-5 rotate-180" />
            Back to Selection
          </Button>
          <Button
            size="lg"
            className="flex-1 gap-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-500/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl disabled:opacity-50"
            onClick={saveSelectedBooks}
            disabled={!enrichedBooks.some(book => book.selected) || isLoading}
          >
            {isLoading ? (
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
        </div>
      </div>
    </div>
  )
}
