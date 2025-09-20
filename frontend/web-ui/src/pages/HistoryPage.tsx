import { useState, useEffect } from 'react'
import { Calendar, Search, RotateCcw, Trash2, Eye } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'
import { cn, groupBy } from '../lib/utils'

interface HistoryItem {
  id: string
  type: 'scan' | 'book_added' | 'recommendation'
  title: string
  description: string
  timestamp: Date
  data?: any
  booksCount?: number
}

export function HistoryPage() {
  const { scanHistory, readingList } = useStorage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])

  useEffect(() => {
    // Transform storage data to history items
    const items: HistoryItem[] = [
      ...scanHistory.map(scan => ({
        id: `scan-${scan.id}`,
        type: 'scan' as const,
        title: 'Book Scan',
        description: `Scanned ${scan.spines?.length || 0} book spines`,
        timestamp: new Date(scan.timestamp),
        data: scan,
        booksCount: scan.spines?.length || 0
      })),
      ...readingList.map(book => ({
        id: `book-${book.id}`,
        type: 'book_added' as const,
        title: 'Book Added',
        description: `Added "${book.title}" to reading list`,
        timestamp: new Date(book.addedAt || Date.now()),
        data: book
      }))
    ]

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    setHistoryItems(items)
  }, [scanHistory, readingList])

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (selectedPeriod === 'all') return true

    const now = new Date()
    const itemDate = item.timestamp

    switch (selectedPeriod) {
      case 'today':
        return itemDate.toDateString() === now.toDateString()
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return itemDate >= weekAgo
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return itemDate >= monthAgo
      default:
        return true
    }
  })

  // Group items by date
  const groupedItems = groupBy(filteredItems, (item) => {
    const date = item.timestamp.toDateString()
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

    if (date === today) return 'Today'
    if (date === yesterday) return 'Yesterday'
    return item.timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  })

  const getItemIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'scan': return <Eye className="h-4 w-4" />
      case 'book_added': return <RotateCcw className="h-4 w-4" />
      case 'recommendation': return <RotateCcw className="h-4 w-4" />
    }
  }

  const getItemColor = (type: HistoryItem['type']) => {
    switch (type) {
      case 'scan': return 'default'
      case 'book_added': return 'success'
      case 'recommendation': return 'warning'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-h2">History</h1>
          <p className="text-muted-foreground">
            Your scanning and reading activity
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {historyItems.filter(i => i.type === 'scan').length}
              </div>
              <div className="text-sm text-muted-foreground">Total Scans</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {historyItems.reduce((acc, item) =>
                  acc + (item.booksCount || 0), 0
                )}
              </div>
              <div className="text-sm text-muted-foreground">Books Found</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {historyItems.filter(i => i.type === 'book_added').length}
              </div>
              <div className="text-sm text-muted-foreground">Books Added</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {historyItems.filter(i =>
                  i.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {(['all', 'today', 'week', 'month'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className="capitalize"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* History Timeline */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-h5 mb-2">No history found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedPeriod !== 'all'
                ? 'Try adjusting your search or time period'
                : 'Start scanning books to build your history'
              }
            </p>
            {!searchQuery && selectedPeriod === 'all' && (
              <Button>Start Scanning</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-h6 font-semibold">{date}</h3>
                <div className="flex-1 h-px bg-border" />
                <Badge variant="outline">{items.length} items</Badge>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <Card key={item.id} className="group hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                          'bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors'
                        )}>
                          {getItemIcon(item.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-sm">{item.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={getItemColor(item.type)} className="text-xs">
                                {item.type.replace('_', ' ')}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-muted-foreground">
                              {item.timestamp.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>

                            {item.booksCount && (
                              <div className="text-xs text-muted-foreground">
                                {item.booksCount} books
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
