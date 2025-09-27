import { memo } from 'react'
import { Brain, Zap, CheckCircle2, Loader2, Sparkles, CheckSquare, Square } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { VirtualizedBookGrid } from './VirtualizedBookGrid'
import { useContainerDimensions } from '../hooks/useContainerDimensions'

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

interface CollectionGridProps {
  enrichedBooks: EnrichedBook[]
  modelUsed: string
  isSaving: boolean
  isGeneratingRecommendations: boolean
  onToggleBookSelection: (bookId: string) => void
  onSaveSelectedBooks: () => void
  onGenerateRecommendations: () => void
  onScanAnother: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

export const CollectionGrid = memo<CollectionGridProps>(({
  enrichedBooks,
  modelUsed,
  isSaving,
  isGeneratingRecommendations,
  onToggleBookSelection,
  onSaveSelectedBooks,
  onGenerateRecommendations,
  onScanAnother,
  onSelectAll,
  onDeselectAll
}) => {
  const [gridContainerRef, gridDimensions] = useContainerDimensions<HTMLDivElement>()

  if (enrichedBooks.length === 0) return null

  const selectedCount = enrichedBooks.filter(book => book.selected).length
  const allSelected = selectedCount === enrichedBooks.length
  const someSelected = selectedCount > 0 && selectedCount < enrichedBooks.length

  return (
    <div className="w-full mx-auto">
      <Card className="collection-card border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm relative">
        {/* Select All Button - Top Left Corner */}
        <div className="absolute top-4 left-4 z-40">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-primary/40 hover:border-primary hover:bg-primary/10 bg-card/80 backdrop-blur-sm shadow-lg"
            onClick={allSelected ? onDeselectAll : onSelectAll}
          >
            {allSelected ? (
              <>
                <CheckSquare className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Deselect All</span>
              </>
            ) : someSelected ? (
              <>
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Select All</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Select All</span>
              </>
            )}
          </Button>
        </div>

        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Sticky Header */}
            <div className="sticky top-16 z-30 bg-gradient-to-r from-card/95 via-card/90 to-primary/5 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-primary/10 mb-4">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  Detected Books Collection
                </h2>
                <p className="text-sm text-muted-foreground">Click or swipe books to select for your library</p>

                {/* Processing Insights */}
                <div className="flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                    <Brain className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-600 font-medium">{modelUsed || 'AI Model'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Virtualized Book Grid */}
            <div
              ref={gridContainerRef}
              className="w-full"
              style={{ minHeight: '400px' }}
            >
              <VirtualizedBookGrid
                books={enrichedBooks}
                onBookSelect={onToggleBookSelection}
                containerWidth={gridDimensions.width || 800} // Fallback width
                containerHeight={Math.min(600, Math.max(400, enrichedBooks.length * 0.8))} // Dynamic height based on book count
              />
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
          onClick={onScanAnother}
        >
          <Zap className="h-5 w-5" />
          Scan Another
        </Button>
        <Button
          size="lg"
          className="flex-1 gap-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-500/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl disabled:opacity-50"
          onClick={onSaveSelectedBooks}
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
              Save to Library
              {enrichedBooks.filter(book => book.selected).length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                  {enrichedBooks.filter(book => book.selected).length}
                </Badge>
              )}
            </>
          )}
        </Button>
        <Button
          size="lg"
          className="flex-1 gap-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-500/90 hover:to-pink-600/90 shadow-lg hover:shadow-xl disabled:opacity-50"
          onClick={onGenerateRecommendations}
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
  )
})

CollectionGrid.displayName = 'CollectionGrid'
