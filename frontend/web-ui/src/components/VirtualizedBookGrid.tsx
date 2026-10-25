import React, { memo, useMemo, useState, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
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
        'group relative h-full w-full rounded-lg border-2 p-1.5 text-left transition-colors touch-manipulation transform-gpu will-change-transform',
        book.selected ? 'border-primary bg-accent' : 'border-transparent hover:bg-secondary'
      )}
      style={{
        transform: `translateX(${swipeOffset}px)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      aria-pressed={book.selected}
      aria-label={`${book.title}${book.author ? ` by ${book.author}` : ''}`}
    >
      {getSwipeIndicator()}

      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted shadow-sm">
        <img
          src={book.cover_url || '/placeholder-book.svg'}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/placeholder-book.svg'
          }}
        />
        <span
          className={cn(
            'absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
            book.selected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/90 bg-black/25 text-transparent'
          )}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>

      <div className="space-y-0.5 px-0.5 pt-2">
        <h3 className="book-title text-sm leading-snug text-foreground line-clamp-2">{book.title}</h3>
        {book.author && <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>}
        {(book.year || book.publisher) && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {[book.year, book.publisher].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
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
        <p className="text-muted-foreground">No spines could be read in this photo. Try again closer, straight on, with more light.</p>
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
