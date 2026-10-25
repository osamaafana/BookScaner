import { memo } from 'react'
import { Sparkles, CheckSquare, Square, BookmarkPlus, RotateCcw } from 'lucide-react'
import { Button } from './ui/Button'
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
      <div className="collection-card rounded-xl border border-border bg-card">
        <div className="sticky top-14 md:top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {enrichedBooks.length} {enrichedBooks.length === 1 ? 'book' : 'books'} found
            </h2>
            <p className="text-sm text-muted-foreground">
              Tap the ones you're curious about.
              {modelUsed && <span className="hidden sm:inline"> Read by {modelUsed}.</span>}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-10"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            aria-pressed={allSelected}
          >
            {allSelected ? <CheckSquare className="h-4 w-4" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
            {allSelected ? 'Clear selection' : someSelected ? `Select all (${selectedCount} chosen)` : 'Select all'}
          </Button>
        </div>

        <div ref={gridContainerRef} className="w-full p-3 md:p-4" style={{ minHeight: '400px' }}>
          <VirtualizedBookGrid
            books={enrichedBooks}
            onBookSelect={onToggleBookSelection}
            containerWidth={gridDimensions.width || 800}
            containerHeight={Math.min(600, Math.max(400, enrichedBooks.length * 0.8))}
          />
        </div>
      </div>

      {/* Actions stay in thumb reach on phones */}
      <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom))] md:bottom-4 z-30 mt-4 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button
            size="lg"
            className="col-span-2 sm:order-3"
            onClick={onGenerateRecommendations}
            disabled={selectedCount === 0}
            loading={isGeneratingRecommendations}
          >
            {!isGeneratingRecommendations && <Sparkles className="h-5 w-5" aria-hidden="true" />}
            {isGeneratingRecommendations ? 'Ranking your picks…' : selectedCount > 0 ? `Get recommendations (${selectedCount})` : 'Get recommendations'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="sm:order-2"
            onClick={onSaveSelectedBooks}
            disabled={selectedCount === 0}
            loading={isSaving}
          >
            {!isSaving && <BookmarkPlus className="h-5 w-5" aria-hidden="true" />}
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" size="lg" className="sm:order-1" onClick={onScanAnother}>
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            New scan
          </Button>
        </div>
        {selectedCount === 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground sm:text-right">Select at least one book to continue.</p>
        )}
      </div>
    </div>
  )
})

CollectionGrid.displayName = 'CollectionGrid'
