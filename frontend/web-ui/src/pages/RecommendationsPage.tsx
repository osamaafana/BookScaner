import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Plus, BookOpen, Sparkles, Star, ScanLine } from 'lucide-react'
import { Button, buttonVariants } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'
import { useToast } from '../contexts/ToastContext'
import { useRecommendationsData } from '../contexts/RecommendationsContext'

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
  const [, setDebugResponse] = useState<unknown>(null)
  const ranRef = useRef(false) // guard StrictMode double invoke

  const { books, addBook, preferences } = useStorage()
  const toast = useToast()
  const { data: recommendationsData, hasData, bookScores, isCached, cacheHitCount } = useRecommendationsData()

  const getScoreColor = (score?: number) => {
    if (score == null) return 'text-muted-foreground'
    if (score >= 8) return 'text-success'
    if (score >= 6) return 'text-foreground'
    if (score >= 4) return 'text-warning'
    return 'text-destructive'
  }

  const getMatchQualityColor = (quality?: string) => {
    switch (quality) {
      case 'perfect': return 'bg-success/10 text-success border-success/30'
      case 'good': return 'bg-accent text-accent-foreground border-transparent'
      case 'fair': return 'bg-warning/10 text-warning border-warning/30'
      case 'poor': return 'bg-destructive/10 text-destructive border-destructive/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (hasData && recommendationsData) {
        setDebugResponse(recommendationsData)

        const mapped: Recommendation[] = Array.isArray(bookScores)
          ? bookScores.map((s) => ({
              title: s.title,
              author: s.author,
              short_reason: s.recommendation,
              cover_url: s.cover_url,
              isbn: undefined, // Not available in book_scores
              publisher: undefined, // Not available in book_scores
              year: undefined, // Not available in book_scores
              score: s.score,
              match_quality: s.match_quality,
              is_perfect_match: s.is_perfect_match,
              reasoning: s.reasoning
            }))
          : []

        setRecommendations(mapped)
        if (mapped.length > 0) {
          const cacheMessage = isCached ? ` (${cacheHitCount} cached)` : ''
          toast.success(`Loaded ${mapped.length} recommendations${cacheMessage}`)
        }
      } else {
        // Nothing generated yet is an empty state, not an error
        setRecommendations([])
      }
    } catch {
      setError('Failed to load recommendations')
    } finally {
      setIsLoading(false)
    }
  }, [toast, hasData, recommendationsData, bookScores, isCached, cacheHitCount])

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
        isbn: rec.isbn,
        cover_url: rec.cover_url,
        fingerprint: rec.isbn || `${rec.title.toLowerCase()}|${rec.author?.toLowerCase() || ''}`
      })
      setRecommendations(prev => prev.filter(r => r !== rec))
      toast.success(`Added "${rec.title}" to your library!`)
      try {
        (navigator as unknown as { vibrate?: (pattern: number[]) => void }).vibrate?.([50, 100, 50])
      } catch {
        // Vibration not supported
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in your library')) {
        toast.info(`"${rec.title}" is already in your library`)
        setRecommendations(prev => prev.filter(r => r !== rec))
      } else {
        toast.error('Failed to add book to library')
      }
    } finally {
      setIsAddingBook(null)
    }
  }

  const hasNoData = !isLoading && !error && recommendations.length === 0

  return (
    <div className="mx-auto w-full max-w-3xl" aria-busy={isLoading}>
      <header className="mb-6 md:mb-8 space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Picks for you</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Books from your last scan, ranked against your taste
          {preferences.genres.length > 0 && <> ({preferences.genres.slice(0, 3).join(', ')}{preferences.genres.length > 3 ? '…' : ''})</>}.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <p className="font-medium text-foreground">Couldn't load your picks</p>
            <p className="text-sm text-muted-foreground">{error}. Check your connection and try again.</p>
          </div>
          <Button variant="outline" onClick={loadRecommendations} className="shrink-0">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      )}

      {isLoading && recommendations.length === 0 ? (
        <ul className="space-y-3" aria-label="Loading picks">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <div className="h-24 w-16 shrink-0 rounded-md bg-muted animate-pulse" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {recommendations.length > 0 && (
            <ol className="space-y-3">
              {recommendations.map((rec, index) => {
                const bookKey = `${rec.title}-${rec.author}`
                const isAdding = isAddingBook === bookKey
                return (
                  <li key={index} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                    <div className="h-28 w-[72px] shrink-0 overflow-hidden rounded-md bg-muted shadow-sm">
                      {rec.cover_url ? (
                        <img src={rec.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="book-title text-lg leading-snug text-foreground">{rec.title}</h2>
                          {rec.author && <p className="text-sm text-muted-foreground">{rec.author}</p>}
                        </div>
                        {rec.score != null && (
                          <div className="shrink-0 text-right">
                            <span className={`text-lg font-semibold tabular-nums ${getScoreColor(rec.score)}`}>{rec.score.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">/10</span>
                          </div>
                        )}
                      </div>

                      {(rec.is_perfect_match || rec.match_quality) && (
                        <Badge variant="outline" className={getMatchQualityColor(rec.is_perfect_match ? 'perfect' : rec.match_quality)}>
                          {rec.is_perfect_match && <Star className="h-3 w-3 mr-1 fill-current" aria-hidden="true" />}
                          {rec.is_perfect_match ? 'Perfect match' : `${rec.match_quality} match`}
                        </Badge>
                      )}

                      {rec.short_reason && (
                        <p className="text-sm leading-relaxed text-foreground/85 max-w-[65ch]">{rec.short_reason}</p>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => addRecommendationToLibrary(rec)}
                        loading={isAdding}
                      >
                        {!isAdding && <Plus className="h-4 w-4" aria-hidden="true" />}
                        {isAdding ? 'Adding…' : 'Add to library'}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          {hasNoData && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-4">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">No picks yet</h2>
                <p className="text-sm text-muted-foreground max-w-[44ch] mx-auto">
                  Scan a shelf, choose the books you're curious about, then tap "Get recommendations". Your ranked picks show up here.
                </p>
              </div>
              <Link to="/" className={buttonVariants({ size: 'lg' })}>
                <ScanLine className="h-5 w-5" aria-hidden="true" />
                Scan a shelf
              </Link>
            </div>
          )}

          {books.length > 0 && recommendations.length > 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              Picks get better as your library grows. You can change your genres any time in Preferences.
            </p>
          )}
        </>
      )}
    </div>
  )
}
