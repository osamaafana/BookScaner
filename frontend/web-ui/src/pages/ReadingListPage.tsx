import { useState, useEffect } from 'react'
import { Search, BookOpen, Clock, CheckCircle, Calendar, Building, Hash, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
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

  const getStatusIcon = (status: BookStatus) => {
    switch (status) {
      case 'to_read': return <BookOpen className="h-4 w-4" />
      case 'reading': return <Clock className="h-4 w-4" />
      case 'finished': return <CheckCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: BookStatus) => {
    switch (status) {
      case 'to_read': return 'default'
      case 'reading': return 'warning'
      case 'finished': return 'success'
    }
  }

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-8">
        {/* Enhanced Header - Mobile Optimized */}
        <div className="text-center space-y-3 sm:space-y-4 md:space-y-8 mb-6 sm:mb-8 md:mb-16 relative">
          {/* Animated background elements - Hidden on very small screens */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
            <div className="absolute top-10 md:top-20 left-1/4 w-1 md:w-2 h-1 md:h-2 bg-purple-400/30 rounded-full animate-pulse"></div>
            <div className="absolute top-16 md:top-32 right-1/3 w-0.5 md:w-1 h-0.5 md:h-1 bg-blue-400/40 rounded-full animate-ping"></div>
          </div>

          <div className="space-y-2 sm:space-y-3 md:space-y-6 relative">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-foreground leading-[0.9] tracking-tight">
              <span className="block relative">
                Reading List
                <div className="absolute -bottom-0.5 sm:-bottom-1 md:-bottom-2 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 rounded-full"></div>
              </span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
              Manage your personal book collection
            </p>
          </div>
        </div>

        {/* Stats - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Card key={status} className="text-center border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="pt-2 sm:pt-3 md:pt-4 pb-2 sm:pb-3">
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <div className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5">
                    {getStatusIcon(status as BookStatus)}
                  </div>
                </div>
                <div className="text-base sm:text-lg md:text-2xl font-bold leading-none">{count}</div>
                <div className="text-xs sm:text-xs md:text-sm text-muted-foreground capitalize leading-tight mt-1">
                  {status.replace('_', ' ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters - Mobile Optimized */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          {/* Search Input */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 focus:ring-2 focus:ring-primary/20 transition-all duration-200 h-10 sm:h-11"
              />
            </div>
          </div>

          {/* Filter Buttons - Mobile Optimized */}
          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1">
            {(['all', 'to_read', 'reading', 'finished'] as const).map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
                className="capitalize transition-all duration-200 hover:scale-105 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4"
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
                {status !== 'all' && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5">
                    {statusCounts[status as BookStatus]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

      {/* Books Grid - Mobile Optimized */}
      {filteredBooks.length === 0 ? (
        <Card className="text-center py-8 sm:py-12">
          <CardContent className="px-4 sm:px-6">
            <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-h5 mb-2">
              {searchQuery || selectedStatus !== 'all' ? 'No books match your search' : 'Your reading list is empty'}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 px-2">
              {searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your search terms or clearing the filters'
                : 'Scan your bookshelf to start building your personal library'
              }
            </p>
            {!searchQuery && selectedStatus === 'all' && (
              <Button
                onClick={() => navigate('/')}
                className="gap-2 bg-gradient-to-r from-primary via-blue-500 to-purple-600 hover:from-primary/90 hover:via-blue-500/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm sm:text-base"
              >
                <Sparkles className="h-4 w-4" />
                Start Scanning Books
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm cursor-pointer">
              <CardHeader className="pb-1 sm:pb-3 px-2 sm:px-4 pt-2 sm:pt-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xs sm:text-sm md:text-base leading-tight mb-1 line-clamp-2">
                    {book.title}
                  </CardTitle>
                  {book.author && (
                    <p className="text-xs sm:text-xs md:text-sm text-muted-foreground line-clamp-1">
                      by {book.author}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-1.5 sm:space-y-3 px-2 sm:px-4 pb-2 sm:pb-4">
                {/* Book Cover - Mobile Optimized */}
                <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 via-blue-100 to-primary/10 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-primary/10">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder-book.svg'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                {/* Book Details - Mobile Optimized */}
                <div className="space-y-1 sm:space-y-2">
                  {(book.publisher || book.year) && (
                    <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                      {book.publisher && (
                        <>
                          <Building className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="truncate text-xs">{book.publisher}</span>
                        </>
                      )}
                      {book.publisher && book.year && <span className="text-xs">•</span>}
                      {book.year && (
                        <>
                          <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="text-xs">{book.year}</span>
                        </>
                      )}
                    </div>
                  )}

                  {book.isbn && (
                    <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                      <Hash className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span className="font-mono text-xs truncate">{book.isbn}</span>
                    </div>
                  )}

                  {book.subjects && book.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      {book.subjects.slice(0, 1).map((subject, index) => (
                        <Badge key={index} variant="secondary" className="text-xs px-1 py-0.5">
                          {subject}
                        </Badge>
                      ))}
                      {book.subjects.length > 1 && (
                        <Badge variant="secondary" className="text-xs px-1 py-0.5">
                          +{book.subjects.length - 1}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Status and Date - Mobile Optimized */}
                <div className="flex items-start justify-between gap-1 sm:gap-2">
                  <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 flex-1">
                    <Badge
                      variant={getStatusColor(book.status)}
                      className="text-xs cursor-pointer hover:opacity-80 transition-all duration-200 hover:scale-105 w-fit touch-manipulation"
                      onClick={() => {
                        const statuses: BookStatus[] = ['to_read', 'reading', 'finished']
                        const currentIndex = statuses.indexOf(book.status)
                        const nextIndex = (currentIndex + 1) % statuses.length
                        handleStatusChange(book.id, statuses[nextIndex])
                      }}
                    >
                      {updatingStatus.has(book.id) ? (
                        <div className="animate-spin rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border-b-2 border-current"></div>
                      ) : (
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3">
                          {getStatusIcon(book.status)}
                        </div>
                      )}
                      <span className="ml-1 capitalize text-xs">
                        {book.status.replace('_', ' ')}
                      </span>
                    </Badge>
                    <span className="text-xs text-muted-foreground/70 leading-tight hidden sm:block">
                      Tap to cycle
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                    <div className="leading-tight text-xs">Added</div>
                    <div className="font-medium leading-tight text-xs">{book.addedAt.toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Progress Bar - Mobile Optimized */}
                {book.status === 'reading' && book.progress && (
                  <div className="mt-2 sm:mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{book.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-primary h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
