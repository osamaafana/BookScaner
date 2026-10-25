import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreVertical, Sun, Moon, Settings, BookOpen, SlidersHorizontal } from 'lucide-react'
import { navItems } from '../lib/nav'
import { Button } from './ui/Button'
import { useStorage } from '../contexts/StorageContext'
import { useTheme } from '../contexts/ThemeContext'

const pageConfig = {
  '/': {
    title: 'Book Scanner',
    subtitle: 'Scan a shelf',
    showBack: false,
    showSettings: true,
    showAIStatus: true
  },
  '/recommendations': {
    title: 'Book Scanner',
    subtitle: 'Picks for you',
    showBack: false,
    showSettings: true,
    showAIStatus: true
  },
  '/reading-list': {
    title: 'Book Scanner',
    subtitle: 'Your library',
    showBack: false,
    showSettings: true,
    showAIStatus: false
  },
  '/history': {
    title: 'Book Scanner',
    subtitle: 'Past scans',
    showBack: false,
    showSettings: true,
    showAIStatus: false
  },
  '/settings': {
    title: 'Book Scanner',
    subtitle: 'Settings',
    showBack: false,
    showSettings: true,
    showAIStatus: false
  },
}

export function TopBar({ onPreferencesClick }: { onPreferencesClick?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { books, scanHistory } = useStorage()
  const { theme, setTheme } = useTheme()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  const config = pageConfig[location.pathname as keyof typeof pageConfig] || {
    title: 'BookScanner',
    subtitle: '',
    showBack: false,
    showSettings: true,
    showAIStatus: false
  }


  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 safe-area-inset-top">
      <div className="container flex h-14 md:h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {config.showBack && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hidden md:flex">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Go back</span>
            </Button>
          )}

          <Link to="/" className="flex min-w-0 items-center gap-3 rounded-lg" aria-label="BookScanner home">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight text-foreground">BookScanner</span>
              <span className="truncate text-xs text-muted-foreground">{config.subtitle}</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {/* Main navigation - desktop */}
          <nav aria-label="Main" className="hidden md:flex items-center gap-1 mr-2">
            {navItems.slice(0, 4).map(({ path, label }) => {
              const active = location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <span className="hidden lg:inline text-xs text-muted-foreground tabular-nums mr-2">
            {books.length} {books.length === 1 ? 'book' : 'books'} · {scanHistory.length} {scanHistory.length === 1 ? 'scan' : 'scans'}
          </span>

          <Button variant="ghost" onClick={onPreferencesClick} className="relative h-11 px-3 gap-2" aria-label="Reading preferences">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline text-sm font-medium">Preferences</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hidden md:flex"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
            <span className="sr-only">{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
          </Button>

          <div className="relative" ref={moreMenuRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-haspopup="menu"
              aria-expanded={showMoreMenu}
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">More options</span>
            </Button>

            {showMoreMenu && (
              <div role="menu" className="absolute top-full right-0 mt-2 w-52 rounded-xl border border-border bg-popover py-1 shadow-lg" style={{ zIndex: 'var(--z-dropdown)' }}>
                <button
                  role="menuitem"
                  onClick={() => {
                    toggleTheme()
                    setShowMoreMenu(false)
                  }}
                  className="md:hidden flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                {config.showSettings && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      navigate('/settings')
                      setShowMoreMenu(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Settings
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
