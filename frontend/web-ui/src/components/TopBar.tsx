import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, MoreVertical, Brain, Eye } from 'lucide-react'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { ThemeToggle } from './ThemeToggle'
import { useStorage } from '../contexts/StorageContext'

const pageConfig = {
  '/': {
    title: 'Book Scanner',
    subtitle: 'Build Your Library With AI',
    showBack: false,
    showSettings: true,
    showAIStatus: true
  },
  '/results': {
    title: 'Book Scanner',
    subtitle: 'AI Analysis Results',
    showBack: true,
    showSettings: false,
    showAIStatus: false
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

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { books } = useStorage()

  const config = pageConfig[location.pathname as keyof typeof pageConfig] || {
    title: 'BookScanner',
    subtitle: 'AI Powered',
    showBack: false,
    showSettings: true,
    showAIStatus: false
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-primary/20 bg-gradient-to-r from-card/95 via-card/90 to-primary/5 backdrop-blur-xl">
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
              className="h-9 w-9 hover:bg-primary/10 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Go back</span>
            </Button>
          )}

          <div className="flex items-center gap-4">
            {/* Enhanced AI Logo */}
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-primary flex items-center justify-center shadow-lg border border-primary/30">
                <Brain className="h-5 w-5 text-white animate-pulse" />
              </div>
              {/* Floating particles */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
            </div>

            <div className="flex flex-col">
              <h1
                className="text-lg font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent tracking-tight cursor-pointer hover:from-primary hover:to-blue-500 transition-all duration-300"
                onClick={() => navigate('/')}
              >
                {config.title}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {config.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Status Indicators */}
          {config.showAIStatus && (
            <div className="hidden md:flex items-center gap-2">


              {location.pathname === '/' && (
                <Badge
                  variant="outline"
                  className="gap-1 text-xs border-primary/40"
                >
                  <Eye className="h-3 w-3" />
                  {books.length} Books
                </Badge>
              )}


            </div>
          )}


          <ThemeToggle />

          {config.showSettings && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="h-9 w-9 hover:bg-primary/10 transition-all duration-300"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          )}

          {/* More options menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 hover:bg-primary/10 transition-all duration-300"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
