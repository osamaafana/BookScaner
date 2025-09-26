import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreVertical, Brain, Sun, Moon, Settings } from 'lucide-react'
import { Button } from './ui/Button'
import { useStorage } from '../contexts/StorageContext'
import { useTheme } from '../contexts/ThemeContext'

const pageConfig = {
  '/': {
    title: 'Book Scanner',
    subtitle: 'Build Your Library With AI',
    showBack: false,
    showSettings: true,
    showAIStatus: true
  },
  '/recommendations': {
    title: 'Book Scanner',
    subtitle: 'AI Recommendations',
    showBack: true,
    showSettings: true,
    showAIStatus: true
  },
  '/reading-list': {
    title: 'Book Scanner',
    subtitle: 'Your Collection',
    showBack: true,
    showSettings: true,
    showAIStatus: false
  },
  '/history': {
    title: 'Book Scanner',
    subtitle: 'Scan History',
    showBack: false,
    showSettings: true,
    showAIStatus: false
  },
  '/settings': {
    title: 'Book Scanner',
    subtitle: 'System Settings',
    showBack: true,
    showSettings: true,
    showAIStatus: false
  },
  '/preferences': {
    title: 'Book Scanner',
    subtitle: 'Personalization',
    showBack: true,
    showSettings: false,
    showAIStatus: false
  }
}

export function TopBar({ onPreferencesClick }: { onPreferencesClick?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { books, preferences, scanHistory } = useStorage()
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
    subtitle: 'AI Powered',
    showBack: false,
    showSettings: true,
    showAIStatus: false
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-gradient-to-r from-card/95 via-card/90 to-primary/5 backdrop-blur-xl shadow-sm">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-1/4 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse"></div>
        <div className="absolute top-3 right-1/3 w-0.5 h-0.5 bg-blue-400/40 rounded-full animate-ping"></div>
      </div>

      <div className="container flex h-16 items-center justify-between relative">
        <div className="flex items-center gap-4">
          {config.showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-11 w-11 hover:bg-primary/10 transition-all duration-300 touch-manipulation"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
          )}

          <div className="flex items-center gap-4">
            {/* Enhanced AI Logo - Mobile Optimized */}
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-primary flex items-center justify-center shadow-lg border border-primary/30">
                <Brain className="h-6 w-6 text-white animate-pulse" />
              </div>
              {/* Floating particles */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <h1
                className="text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent tracking-tight cursor-pointer hover:from-primary hover:to-blue-500 transition-all duration-300 touch-manipulation"
                onClick={() => navigate('/')}
              >
                {config.title}
              </h1>
              <p className="text-sm text-muted-foreground font-medium truncate">
                {config.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section - Center */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="text-center group">
            <div className="relative">
              <div className="text-lg font-bold text-foreground group-hover:scale-110 transition-transform">
                {books.length}
              </div>
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div className="text-xs text-muted-foreground">Books in Library</div>
          </div>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
          <div className="text-center group">
            <div className="text-lg font-bold text-foreground group-hover:scale-110 transition-transform">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                {scanHistory.length}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Total Scans</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant={location.pathname === '/' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
              className="h-9 px-3 text-sm"
            >
              Home
            </Button>
            <Button
              variant={location.pathname === '/recommendations' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/recommendations')}
              className="h-9 px-3 text-sm"
            >
              Discover
            </Button>
            <Button
              variant={location.pathname === '/reading-list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/reading-list')}
              className="h-9 px-3 text-sm"
            >
              Library
            </Button>
            <Button
              variant={location.pathname === '/history' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/history')}
              className="h-9 px-3 text-sm"
            >
              History
            </Button>
          </div>

          {/* Preferences & Theme */}
          <div className="flex items-center gap-2 border-l border-border/30 pl-2">
            <Button
              variant="ghost"
              onClick={onPreferencesClick}
              className="h-11 px-3 hover:bg-primary/10 transition-all duration-300 relative touch-manipulation gap-2"
            >
              <Brain className="h-5 w-5" />
              <span className="font-medium text-sm hidden sm:inline-block">Preferences</span>
              {(preferences.genres.length > 0 || preferences.languages.length > 0) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              )}
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-11 w-11 hover:bg-primary/10 transition-all duration-300 touch-manipulation"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </Button>
          </div>

          {/* More options menu - Mobile First */}
          <div className="relative" ref={moreMenuRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="h-11 w-11 hover:bg-primary/10 transition-all duration-300 touch-manipulation"
            >
              <MoreVertical className="h-5 w-5" />
              <span className="sr-only">More options</span>
            </Button>

            {/* Dropdown Menu */}
            {showMoreMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                {/* Settings */}
                {config.showSettings && (
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setShowMoreMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-primary/10 transition-colors duration-200"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
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
