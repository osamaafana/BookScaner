import { useState, useEffect } from 'react'
import { Calendar, Search, RotateCcw, Trash2, Eye } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'
import { cn, groupBy } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

interface HistoryItem {
  id: string
  type: 'scan' | 'book_added' | 'recommendation'
  title: string
  description: string
  timestamp: Date
  data?: unknown
  booksCount?: number
}

export function HistoryPage() {
  const { scanHistory, readingList } = useStorage()
  const navigate = useNavigate()
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
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return itemDate >= weekAgo
      }
      case 'month': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return itemDate >= monthAgo
      }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-8">
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
                History
                <div className="absolute -bottom-0.5 sm:-bottom-1 md:-bottom-2 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 rounded-full"></div>
              </span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
              Track your book discovery journey
            </p>
          </div>
        </div>

        <div className="space-y-6">

        {/* Stats - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <Card className="text-center border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-2 sm:pt-3 md:pt-4 pb-2 sm:pb-3">
              <div className="text-lg sm:text-xl md:text-2xl font-bold leading-none">
                {historyItems.filter(i => i.type === 'scan').length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-1">Total Scans</div>
            </CardContent>
          </Card>

          <Card className="text-center border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-2 sm:pt-3 md:pt-4 pb-2 sm:pb-3">
              <div className="text-lg sm:text-xl md:text-2xl font-bold leading-none">
                {historyItems.reduce((acc, item) =>
                  acc + (item.booksCount || 0), 0
                )}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-1">Books Found</div>
            </CardContent>
          </Card>

          <Card className="text-center border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-2 sm:pt-3 md:pt-4 pb-2 sm:pb-3">
              <div className="text-lg sm:text-xl md:text-2xl font-bold leading-none">
                {historyItems.filter(i => i.type === 'book_added').length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-1">Books Added</div>
            </CardContent>
          </Card>

          <Card className="text-center border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-2 sm:pt-3 md:pt-4 pb-2 sm:pb-3">
              <div className="text-lg sm:text-xl md:text-2xl font-bold leading-none">
                {historyItems.filter(i =>
                  i.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-1">This Week</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Search Input */}
        <div className="w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 focus:ring-2 focus:ring-primary/20 transition-all duration-200 h-10 sm:h-11"
            />
          </div>
        </div>

        {/* Filter Buttons - Mobile Optimized */}
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1">
          {(['all', 'today', 'week', 'month'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className="capitalize transition-all duration-200 hover:scale-105 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* History Timeline - Mobile Optimized */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card className="text-center py-8 sm:py-12">
          <CardContent className="px-4 sm:px-6">
            <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-h5 mb-2">
              {searchQuery || selectedPeriod !== 'all' ? 'No history found' : 'Your history is empty'}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 px-2">
              {searchQuery || selectedPeriod !== 'all'
                ? 'Try adjusting your search terms or time period'
                : 'Start scanning books to build your discovery history'
              }
            </p>
            {!searchQuery && selectedPeriod === 'all' && (
              <Button
                onClick={() => navigate('/')}
                className="text-sm sm:text-base"
              >
                Start Scanning
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(groupedItems).map(([date, items]) => (
            <div key={date} className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <h3 className="text-sm sm:text-h6 font-semibold">{date}</h3>
                <div className="flex-1 h-px bg-border" />
                <Badge variant="outline" className="text-xs">{items.length} items</Badge>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {items.map((item) => (
                  <Card key={item.id} className="group hover:shadow-md transition-all duration-200 border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className={cn(
                          'flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center',
                          'bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors'
                        )}>
                          <div className="h-3 w-3 sm:h-4 sm:w-4">
                            {getItemIcon(item.type)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 sm:gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-xs sm:text-sm leading-tight">{item.title}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                                {item.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              <Badge variant={getItemColor(item.type)} className="text-xs px-1.5 py-0.5">
                                {item.type.replace('_', ' ')}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 sm:h-6 sm:w-6"
                              >
                                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-1.5 sm:mt-2">
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
    </div>
  )
}
