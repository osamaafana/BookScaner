import React, { memo, useMemo, useState, useEffect, useRef } from 'react'
import { CardContent } from './ui/Card'
import { BookOpen, CheckCircle } from 'lucide-react'
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

// Individual book item component with swipe support
const BookItem = memo(({
  book,
  onBookSelect
}: {
  book: EnrichedBook
  onBookSelect: (bookId: string) => void
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const itemRef = useRef<HTMLButtonElement>(null)

  const SWIPE_THRESHOLD = 50 // Minimum swipe distance to trigger action
  const MAX_SWIPE_OFFSET = 100 // Maximum swipe distance for visual feedback

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current

    // Only allow horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Prevent vertical scrolling when swiping horizontally
      e.preventDefault()

      // Limit the swipe offset for visual feedback
      const limitedOffset = Math.max(-MAX_SWIPE_OFFSET, Math.min(MAX_SWIPE_OFFSET, deltaX))
      setSwipeOffset(limitedOffset)
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return

    // Check if swipe was significant enough to trigger selection toggle
    if (Math.abs(swipeOffset) > SWIPE_THRESHOLD) {
      onBookSelect(book.id)
    }

    // Reset swipe offset
    setSwipeOffset(0)
    setIsDragging(false)
  }

  const handleClick = () => {
    // Only trigger click if it wasn't a swipe gesture
    if (Math.abs(swipeOffset) <= SWIPE_THRESHOLD) {
      onBookSelect(book.id)
    }
  }

  const getSwipeIndicator = () => {
    // Visual indicators removed as requested
    return null
  }

  return (
    <button
      ref={itemRef}
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:scale-105 h-full w-full text-left touch-manipulation",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg",
        "transform-gpu will-change-transform",
        book.selected
          ? "border-green-500 bg-gradient-to-br from-green-500/20 to-blue-500/20 shadow-lg shadow-green-500/25"
          : "border-border/50 hover:border-primary/50 bg-gradient-to-br from-card/80 to-muted/20"
      )}
      style={{
        transform: `translateX(${swipeOffset}px)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      aria-pressed={book.selected}
      aria-label={`${book.selected ? 'Deselect' : 'Select'} ${book.title}${book.author ? ` by ${book.author}` : ''}. Swipe to quickly toggle selection.`}
    >
      <CardContent className="p-2 space-y-2 h-full flex flex-col">
        {/* Swipe Indicator */}
        {getSwipeIndicator()}

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

          {/* Selection Checkmark */}
          {book.selected && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
              <CheckCircle className="h-4 w-4" />
            </div>
          )}
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
