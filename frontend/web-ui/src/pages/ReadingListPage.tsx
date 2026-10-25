import { useState, useEffect } from 'react'
import { BookOpen, Search, ScanLine } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useStorage } from '../contexts/StorageContext'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import type { BookStatus } from '../api/types'

interface ReadingListBook {
  id: string
  title: string
  author?: string
  cover_url?: string
  isbn?: string
  publisher?: string
  year?: number
  subjects?: string[]
  status: BookStatus
  addedAt: Date
  startedAt?: Date
  finishedAt?: Date
  progress?: number
  fingerprint: string
}

export function ReadingListPage() {
  const { readingList } = useStorage()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<BookStatus | 'all'>('all')
  const [books, setBooks] = useState<ReadingListBook[]>([])
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Transform storage data to reading list format
    const transformedBooks: ReadingListBook[] = readingList.map(book => ({
      id: book.id,
      title: book.title || 'Unknown Title',
      author: book.author,
      cover_url: book.cover_url || book.cover,
      isbn: book.isbn,
      publisher: undefined, // Not available in storage context
      year: undefined, // Not available in storage context
      subjects: undefined, // Not available in storage context
      status: 'to_read', // Default status
      addedAt: new Date(book.addedAt || Date.now()),
      fingerprint: book.fingerprint
    }))
    setBooks(transformedBooks)
  }, [readingList])

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = selectedStatus === 'all' || book.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const statusCounts = {
    'to_read': books.filter(b => b.status === 'to_read').length,
    'reading': books.filter(b => b.status === 'reading').length,
    'finished': books.filter(b => b.status === 'finished').length
  }

  const statusLabel = { all: 'All', to_read: 'To read', reading: 'Reading', finished: 'Finished' } as const

  const handleStatusChange = async (bookId: string, newStatus: BookStatus) => {
    setUpdatingStatus(prev => new Set(prev).add(bookId))

    try {
      // Find the book to get its fingerprint
      const book = books.find(b => b.id === bookId)
      if (!book) {
        throw new Error('Book not found')
      }

      // For now, just update the local state since we don't have database IDs
      // TODO: Implement proper backend integration when books are saved to database
      setBooks(prev => prev.map(book =>
        book.id === bookId ? { ...book, status: newStatus } : book
      ))

      toast.success(`Book status updated to ${newStatus.replace('_', ' ')}`)
    } catch (error) {
      console.error('Failed to update book status:', error)
      toast.error('Failed to update book status. Please try again.')
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev)
        newSet.delete(bookId)
        return newSet
      })
    }
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 md:mb-8 space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Library</h1>
          <p className="text-sm md:text-base text-muted-foreground">Books you saved, and where you are with each one.</p>
        </header>

        <div className="mb-5 flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search your library"
              placeholder="Search by title or author"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10"
            />
          </div>

          <div role="tablist" aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {(['all', 'to_read', 'reading', 'finished'] as const).map((status) => {
              const active = selectedStatus === status
              const count = status === 'all' ? books.length : statusCounts[status as BookStatus]
              return (
                <button
                  key={status}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedStatus(status)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  }`}
                >
                  {statusLabel[status]}
                  <span className={`tabular-nums text-xs ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-4">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {searchQuery || selectedStatus !== 'all' ? 'Nothing matches' : 'Your library is empty'}
              </h2>
              <p className="text-sm text-muted-foreground max-w-[42ch] mx-auto">
                {searchQuery || selectedStatus !== 'all'
                  ? 'Try another search or switch back to All.'
                  : 'Scan a shelf and save the books you want to remember. They show up here.'}
              </p>
            </div>
            {!searchQuery && selectedStatus === 'all' && (
              <Button size="lg" onClick={() => navigate('/')}>
                <ScanLine className="h-5 w-5" aria-hidden="true" />
                Scan a shelf
              </Button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {filteredBooks.map((book) => (
              <li key={book.id} className="flex flex-col">
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-muted shadow-sm">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder-book.svg'
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-3 text-center">
                      <span className="book-title text-sm text-muted-foreground line-clamp-4">{book.title}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-1 flex-col gap-0.5">
                  <h2 className="book-title text-sm leading-snug text-foreground line-clamp-2">{book.title}</h2>
                  {book.author && <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>}
                  {book.year && <p className="text-xs text-muted-foreground">{book.year}</p>}
                </div>

                <label className="mt-2 block">
                  <span className="sr-only">Reading status for {book.title}</span>
                  <select
                    value={book.status}
                    disabled={updatingStatus.has(book.id)}
                    onChange={(e) => handleStatusChange(book.id, e.target.value as BookStatus)}
                    className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground disabled:opacity-60"
                  >
                    <option value="to_read">To read</option>
                    <option value="reading">Reading</option>
                    <option value="finished">Finished</option>
                  </select>
                </label>

                {book.status === 'reading' && book.progress ? (
                  <div className="mt-2 h-1 w-full rounded-full bg-secondary" role="progressbar" aria-valuenow={book.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Reading progress">
                    <div className="h-1 rounded-full bg-primary" style={{ width: `${book.progress}%` }} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
