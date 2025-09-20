import { useState, useEffect } from 'react'
import { Search, MoreVertical, BookOpen, Clock, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'

type ReadingStatus = 'to-read' | 'reading' | 'finished'

interface ReadingListBook {
  id: string
  title: string
  author: string
  cover?: string
  status: ReadingStatus
  addedAt: Date
  startedAt?: Date
  finishedAt?: Date
  progress?: number
}

export function ReadingListPage() {
  const { readingList } = useStorage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus | 'all'>('all')
  const [books, setBooks] = useState<ReadingListBook[]>([])

  useEffect(() => {
    // Transform storage data to reading list format
    const transformedBooks: ReadingListBook[] = readingList.map(book => ({
      id: book.id,
      title: book.title || 'Unknown Title',
      author: book.author || 'Unknown Author',
      cover: book.cover,
      status: 'to-read', // Default status
      addedAt: new Date(book.addedAt || Date.now())
    }))
    setBooks(transformedBooks)
  }, [readingList])

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || book.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const statusCounts = {
    'to-read': books.filter(b => b.status === 'to-read').length,
    'reading': books.filter(b => b.status === 'reading').length,
    'finished': books.filter(b => b.status === 'finished').length
  }

  const getStatusIcon = (status: ReadingStatus) => {
    switch (status) {
      case 'to-read': return <BookOpen className="h-4 w-4" />
      case 'reading': return <Clock className="h-4 w-4" />
      case 'finished': return <CheckCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: ReadingStatus) => {
    switch (status) {
      case 'to-read': return 'default'
      case 'reading': return 'warning'
      case 'finished': return 'success'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-h2">Reading List</h1>
          <p className="text-muted-foreground">
            Manage your personal book collection
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Card key={status} className="text-center">
              <CardContent className="pt-4">
                <div className="flex items-center justify-center mb-2">
                  {getStatusIcon(status as ReadingStatus)}
                </div>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {status.replace('-', ' ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {(['all', 'to-read', 'reading', 'finished'] as const).map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedStatus(status)}
              className="capitalize"
            >
              {status === 'all' ? 'All' : status.replace('-', ' ')}
              {status !== 'all' && (
                <Badge variant="secondary" className="ml-1">
                  {statusCounts[status]}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-h5 mb-2">No books found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start building your reading list by scanning some books'
              }
            </p>
            {!searchQuery && selectedStatus === 'all' && (
              <Button>Start Scanning</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="group hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight mb-1 line-clamp-2">
                      {book.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {book.author}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusColor(book.status)}>
                    {getStatusIcon(book.status)}
                    <span className="ml-1 capitalize">
                      {book.status.replace('-', ' ')}
                    </span>
                  </Badge>

                  <div className="text-xs text-muted-foreground">
                    Added {book.addedAt.toLocaleDateString()}
                  </div>
                </div>

                {book.status === 'reading' && book.progress && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{book.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
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
  )
}
