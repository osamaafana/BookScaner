import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, MoreVertical, Brain, Eye, Zap } from 'lucide-react'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Dropdown } from './ui/Dropdown'
import { ThemeToggle } from './ThemeToggle'
import { useStorage } from '../contexts/StorageContext'
import { useToast } from '../contexts/ToastContext'

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
  const { books, preferences, updatePreferences } = useStorage()
  const toast = useToast()

  const config = pageConfig[location.pathname as keyof typeof pageConfig] || {
    title: 'BookScanner',
    subtitle: 'AI Powered',
    showBack: false,
    showSettings: true,
    showAIStatus: false
  }

  const aiModelOptions = [
    {
      value: 'google',
      label: 'Google Vision + NVIDIA',
      icon: Eye,
      description: 'Slower, less accurate'
    },
    {
      value: 'groq',
      label: 'Groq Vision',
      icon: Zap,
      description: 'Faster, more accurate'
    }
  ]

  const handleModelChange = async (value: string) => {
    try {
      const newGroqEnabled = value === 'groq'
      await updatePreferences({ groqEnabled: newGroqEnabled })
      toast.success(`AI Model switched to ${newGroqEnabled ? 'Groq Vision' : 'Google Vision + NVIDIA'}`)
    } catch {
      toast.error('Failed to update AI model preference')
    }
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
              <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                2 AI
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Vision Providers</div>
          </div>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
          <div className="text-center group">
            <div className="text-lg font-bold text-foreground group-hover:scale-110 transition-transform">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                30d
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Smart Cache</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Model Selection */}
          {config.showAIStatus && (
            <div className="hidden md:flex items-center gap-2">
              <Dropdown
                options={aiModelOptions}
                value={preferences.groqEnabled ? 'groq' : 'google'}
                onValueChange={handleModelChange}
                displayLabel="Model"
                className="min-w-[100px]"
              />
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
