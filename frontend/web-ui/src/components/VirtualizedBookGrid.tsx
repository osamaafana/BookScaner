import React, { memo, useMemo, useState, useEffect } from 'react'
import { CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { CheckCircle2, Plus, Sparkles, BookOpen } from 'lucide-react'
import { cn } from '../lib/utils'

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

interface VirtualizedBookGridProps {
  books: EnrichedBook[]
  onBookSelect: (bookId: string) => void
  containerWidth: number
  containerHeight: number
}

// Individual book item component
const BookItem = memo(({
  book,
  onBookSelect
}: {
  book: EnrichedBook
  onBookSelect: (bookId: string) => void
}) => {
  return (
    <button
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:scale-105 h-full w-full text-left",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg",
        book.selected
          ? "border-green-500 bg-gradient-to-br from-green-500/20 to-blue-500/20 shadow-lg shadow-green-500/25"
          : "border-border/50 hover:border-primary/50 bg-gradient-to-br from-card/80 to-muted/20"
      )}
      onClick={() => onBookSelect(book.id)}
      aria-pressed={book.selected}
      aria-label={`${book.selected ? 'Deselect' : 'Select'} ${book.title}${book.author ? ` by ${book.author}` : ''}`}
    >
      <CardContent className="p-2 space-y-2 h-full flex flex-col">
        {/* Book Cover */}
        <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-muted/30 shadow-md flex-shrink-0">
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
        <div className="space-y-1 flex-1 flex flex-col">
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
    </button>
  )
})

BookItem.displayName = 'BookItem'

export const VirtualizedBookGrid: React.FC<VirtualizedBookGridProps> = ({
  books,
  onBookSelect,
  containerWidth,
  containerHeight
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })
  const [scrollTop, setScrollTop] = useState(0)

  // Calculate responsive columns based on container width
  const getColumnsCount = (width: number) => {
    if (width < 640) return 2      // sm: 2 columns
    if (width < 1024) return 3     // lg: 3 columns
    if (width < 1280) return 4     // xl: 4 columns
    return 5                       // 2xl+: 5 columns
  }

  const columnsCount = useMemo(() => getColumnsCount(containerWidth), [containerWidth])
  const rowsCount = Math.ceil(books.length / columnsCount)
  const itemHeight = 320 // Fixed height for consistent grid
  const totalHeight = rowsCount * itemHeight

  // Calculate visible range based on scroll position
  useEffect(() => {
    const itemsPerRow = columnsCount
    const visibleRows = Math.ceil(containerHeight / itemHeight) + 2 // Buffer rows
    const startRow = Math.floor(scrollTop / itemHeight)
    const endRow = Math.min(startRow + visibleRows, rowsCount)

    const start = startRow * itemsPerRow
    const end = Math.min(endRow * itemsPerRow, books.length)

    setVisibleRange({ start, end })
  }, [scrollTop, containerHeight, itemHeight, columnsCount, rowsCount, books.length])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No books detected</p>
      </div>
    )
  }

  // For small lists, render all items without virtualization
  if (books.length <= 20) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {books.map((book) => (
          <BookItem key={book.id} book={book} onBookSelect={onBookSelect} />
        ))}
      </div>
    )
  }

  // Virtualized rendering for large lists
  const visibleBooks = books.slice(visibleRange.start, visibleRange.end)
  const startRow = Math.floor(visibleRange.start / columnsCount)

  return (
    <div
      className="w-full overflow-auto"
      style={{ height: Math.min(containerHeight, totalHeight) }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startRow * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {visibleBooks.map((book) => (
              <BookItem key={book.id} book={book} onBookSelect={onBookSelect} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VirtualizedBookGrid
