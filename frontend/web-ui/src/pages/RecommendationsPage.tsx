import { useState, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw, Plus, BookOpen, Brain, Sparkles, Cpu, Eye,
  CheckCircle2, Loader2, Star, TrendingUp
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'
import { useToast } from '../contexts/ToastContext'

interface Recommendation {
  title: string
  author?: string
  short_reason?: string
  cover_url?: string
  isbn?: string
  publisher?: string
  year?: number
  score?: number
  match_quality?: string
  is_perfect_match?: boolean
  reasoning?: string
}

export function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingBook, setIsAddingBook] = useState<string | null>(null)
  const [debugResponse, setDebugResponse] = useState<unknown>(null)
  const ranRef = useRef(false) // guard StrictMode double invoke

  const { books, addBook, preferences } = useStorage()
  const toast = useToast()

  const getScoreColor = (score?: number) => {
    if (score == null) return 'text-muted-foreground'
    if (score >= 8) return 'text-green-500'
    if (score >= 6) return 'text-yellow-500'
    if (score >= 4) return 'text-orange-500'
    return 'text-red-500'
  }

  const getMatchQualityColor = (quality?: string) => {
    switch (quality) {
      case 'perfect': return 'bg-green-500/20 text-green-600 border-green-500/30'
      case 'good': return 'bg-blue-500/20 text-blue-600 border-blue-500/30'
      case 'fair': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
      case 'poor': return 'bg-red-500/20 text-red-600 border-red-500/30'
      default: return 'bg-muted/20 text-muted-foreground border-border'
    }
  }

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await new Promise(r => setTimeout(r, 300))
      const raw = localStorage.getItem('generatedRecommendations')
      if (raw) {
        const data = JSON.parse(raw)
        setDebugResponse(data)

        const mapped: Recommendation[] = Array.isArray(data.book_scores)
          ? data.book_scores.map((s: Record<string, unknown>) => ({
              title: String(s.title || ''),
              author: s.author ? String(s.author) : undefined,
              short_reason: s.recommendation ? String(s.recommendation) : undefined,
              cover_url: s.cover_url ? String(s.cover_url) : undefined,
              isbn: s.isbn ? String(s.isbn) : undefined,
              publisher: s.publisher ? String(s.publisher) : undefined,
              year: typeof s.year === 'number' ? s.year : undefined,
              score: typeof s.score === 'number' ? s.score : Number(s.score ?? 0),
              match_quality: s.match_quality ? String(s.match_quality) : undefined,
              is_perfect_match: !!s.is_perfect_match,
              reasoning: s.reasoning ? String(s.reasoning) : undefined
            }))
          : []

        setRecommendations(mapped)
        if (mapped.length > 0) toast.success(`Loaded ${mapped.length} recommendations`)
      } else {
        setRecommendations([])
        setError('No recommendations data available')
      }
    } catch {
      setError('Failed to load recommendations')
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    loadRecommendations()
  }, [loadRecommendations])

  const addRecommendationToLibrary = async (rec: Recommendation) => {
    const bookKey = `${rec.title}-${rec.author}`
    setIsAddingBook(bookKey)
    try {
      await addBook({
        title: rec.title,
        author: rec.author,
        fingerprint: `${rec.title.toLowerCase()}|${rec.author?.toLowerCase() || ''}`
      })
      setRecommendations(prev => prev.filter(r => r !== rec))
      toast.success(`Added "${rec.title}" to your library!`)
      try { (navigator as unknown as { vibrate?: (pattern: number[]) => void }).vibrate?.([50, 100, 50]) } catch {}
    } catch {
      toast.error('Failed to add book to library')
    } finally {
      setIsAddingBook(null)
    }
  }

  return (
    <div className="min-h-screen" aria-busy={isLoading}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-8 mb-16 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/4 w-2 h-2 bg-purple-400/30 rounded-full animate-pulse" />
            <div className="absolute top-32 right-1/3 w-1 h-1 bg-blue-400/40 rounded-full animate-ping" />
          </div>
          <div className="space-y-6 relative">
            <h1 className="text-4xl md:text-6xl font-black text-foreground leading-[0.9] tracking-tight">
              <span className="block">Discover Your</span>
              <span className="block bg-gradient-to-r from-purple-500 via-blue-400 to-primary bg-clip-text text-transparent animate-gradient">
                Next Great Read
              </span>
            </h1>
          </div>
          <div className="flex items-center justify-center gap-12 mt-8">
            <div className="text-center group">
              <div className="relative">
                <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  {books.length}
                </div>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div className="text-sm text-muted-foreground">Library Books</div>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent" />
            <div className="text-center group">
              <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                {preferences.genres.length}
              </div>
              <div className="text-sm text-muted-foreground">Preferred Genres</div>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent" />
            <div className="text-center group">
              <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">AI</span>
              </div>
              <div className="text-sm text-muted-foreground">Powered</div>
            </div>
          </div>
        </div>


        {/* Error */}
        {error && (
          <Card className="max-w-2xl mx-auto mb-8 border-red-500/20 bg-gradient-to-r from-red-500/10 to-red-600/10">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <Brain className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  {error.includes('No recommendations') ? 'No Recommendations Yet' : 'AI Engine Unavailable'}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">{error}</p>
              </div>
              <div className="flex gap-3 justify-center">
                {error.includes('No recommendations') ? (
                  <Button
                    onClick={() => (window.location.href = '/')}
                    className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Plus className="h-4 w-4" />
                    Scan Books
                  </Button>
                ) : (
                  <Button variant="outline" onClick={loadRecommendations} className="border-red-500/40">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Connection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && recommendations.length === 0 ? (
          <Card className="max-w-4xl mx-auto border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-12 text-center space-y-8">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-blue-500/20 border-r-blue-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
                <div className="absolute inset-4 rounded-full border-4 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="h-10 w-10 text-primary animate-pulse" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-foreground mb-2">AI Analyzing Your Selected Books</h3>
                <p className="text-muted-foreground text-lg">Generating personalized recommendations…</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-foreground">Analyzing Content</div>
                    <div className="text-xs text-muted-foreground">Reading book details</div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-blue-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-foreground">Scoring Books</div>
                    <div className="text-xs text-muted-foreground">AI compatibility analysis</div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-primary/10 border border-purple-500/20">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-foreground">Generating Insights</div>
                    <div className="text-xs text-muted-foreground">Personalized recommendations</div>
                  </div>
                </div>
              </div>
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Processing...</span>
                  <span>AI Engine Active</span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary via-blue-500 to-purple-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-6xl mx-auto">
            {(recommendations.length > 0 || (!isLoading && !error)) && (
              <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="text-center space-y-2 mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                      AI Recommendations
                    </h2>
                    <p className="text-muted-foreground">Personalized selections based on your unique reading profile</p>
                  </div>

                  <div className="space-y-6">
                    {recommendations.map((rec, index) => {
                      const bookKey = `${rec.title}-${rec.author}`
                      const isAdding = isAddingBook === bookKey
                      return (
                        <Card
                          key={index}
                          className="group relative overflow-hidden border border-border/50 hover:border-primary/50 bg-gradient-to-r from-card/80 to-muted/20 hover:shadow-lg transition-all duration-300"
                        >
                          <CardContent className="p-6">
                            <div className="flex gap-6">
                              <div className="flex-shrink-0">
                                <div className="w-24 h-32 relative rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 via-blue-100 to-primary/10 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-primary/10">
                                  {rec.cover_url ? (
                                    <img
                                      src={rec.cover_url}
                                      alt={rec.title}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="space-y-2">
                                  <h3 className="font-bold text-xl text-foreground leading-tight">{rec.title}</h3>
                                  {rec.author && (
                                    <p className="text-muted-foreground font-medium">by {rec.author}</p>
                                  )}
                                  {(rec.publisher || rec.year) && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      {rec.publisher && <span className="truncate">{rec.publisher}</span>}
                                      {rec.publisher && rec.year && <span>•</span>}
                                      {rec.year && <span>{rec.year}</span>}
                                    </div>
                                  )}
                                </div>

                                {rec.short_reason && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Brain className="h-4 w-4" />
                                      <span className="font-medium">AI Analysis</span>
                                    </div>
                                    <p className="text-foreground/80 leading-relaxed">{rec.short_reason}</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex-shrink-0 flex flex-col items-end justify-between space-y-4">
                                <div className="text-right space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Brain className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium text-muted-foreground">AI Score</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className={`text-2xl font-bold ${getScoreColor(rec.score)}`}>
                                      {rec.score != null ? rec.score.toFixed(1) : 'N/A'}/10
                                    </div>
                                    {rec.match_quality && (
                                      <Badge variant="outline" className={`text-xs ${getMatchQualityColor(rec.match_quality)}`}>
                                        {rec.match_quality}
                                      </Badge>
                                    )}
                                    {rec.is_perfect_match && (
                                      <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
                                        <Star className="h-3 w-3 mr-1 fill-current" />
                                        Perfect Match
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                                  onClick={() => addRecommendationToLibrary(rec)}
                                  disabled={isAdding}
                                >
                                  {isAdding ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4" />
                                      Add to Library
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {!isLoading && recommendations.length === 0 && !error && (
              <Card className="max-w-2xl mx-auto mt-8 border border-primary/20 bg-gradient-to-br from-card/80 to-primary/5">
                <CardContent className="p-12 text-center space-y-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {books.length === 0 ? 'Build Your Library First' : 'Training AI Model'}
                    </h3>
                    <p className="text-muted-foreground">
                      {books.length === 0
                        ? 'Scan some books to build your digital library and unlock personalized AI recommendations.'
                        : 'Add more books to help AI learn your preferences and generate better recommendations.'}
                    </p>
                  </div>
                  <Button size="lg" className="gap-3" onClick={() => (window.location.href = '/')}>
                    <Plus className="h-5 w-5" />
                    {books.length === 0 ? 'Start AI Book Scan' : 'Scan More Books'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {books.length > 0 && recommendations.length > 0 && (
              <Card className="mt-8 border border-primary/20 bg-gradient-to-r from-card/50 to-primary/5 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Cpu className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Enhance AI Recommendations</h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>Add more books to expand training data</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>Update genre preferences in Settings</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>AI improves from your reading patterns</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
