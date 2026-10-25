import { useState, useEffect } from 'react'
import { Search, ScanLine, History as HistoryIcon, BookmarkPlus, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useStorage } from '../contexts/StorageContext'
import { groupBy } from '../lib/utils'
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
      case 'scan': return <ScanLine className="h-4 w-4" />
      case 'book_added': return <BookmarkPlus className="h-4 w-4" />
      case 'recommendation': return <Sparkles className="h-4 w-4" />
    }
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 md:mb-8 space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">History</h1>
          <p className="text-sm md:text-base text-muted-foreground">Every shelf you scanned and every book you added.</p>
        </header>

        <p className="-mt-3 mb-5 text-sm text-muted-foreground tabular-nums">
          {historyItems.filter(i => i.type === 'scan').length} scans · {historyItems.reduce((acc, item) => acc + (item.booksCount || 0), 0)} books found · {historyItems.filter(i => i.type === 'book_added').length} saved
        </p>

        <div className="mb-5 flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search history"
              placeholder="Search history"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10"
            />
          </div>

          <div role="tablist" aria-label="Time period" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {(['all', 'today', 'week', 'month'] as const).map((period) => {
              const active = selectedPeriod === period
              return (
                <button
                  key={period}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedPeriod(period)}
                  className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  }`}
                >
                  {{ all: 'All', today: 'Today', week: 'This week', month: 'This month' }[period]}
                </button>
              )
            })}
          </div>
        </div>

        {Object.keys(groupedItems).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-4">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <HistoryIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {searchQuery || selectedPeriod !== 'all' ? 'Nothing in this period' : 'No scans yet'}
              </h2>
              <p className="text-sm text-muted-foreground max-w-[42ch] mx-auto">
                {searchQuery || selectedPeriod !== 'all'
                  ? 'Try another search or switch back to All.'
                  : 'Each shelf you scan and each book you save is listed here, newest first.'}
              </p>
            </div>
            {!searchQuery && selectedPeriod === 'all' && (
              <Button size="lg" onClick={() => navigate('/')}>
                <ScanLine className="h-5 w-5" aria-hidden="true" />
                Scan a shelf
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([date, items]) => (
              <section key={date} aria-label={date}>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{date}</h2>
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 p-3 sm:p-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground" aria-hidden="true">
                        <span className="h-4 w-4">{getItemIcon(item.type)}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                          <time className="shrink-0 text-xs text-muted-foreground tabular-nums" dateTime={item.timestamp.toISOString()}>
                            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
