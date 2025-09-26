import { Link, useLocation } from 'react-router-dom'
import { Camera, Heart, History, List, Brain, Sparkles, Zap, Cpu } from 'lucide-react'
import { cn } from '../lib/utils'
import { useStorage } from '../contexts/StorageContext'

export function Navigation() {
  const location = useLocation()
  const { books, preferences } = useStorage()

  const navItems = [
    {
      path: '/',
      icon: Camera,
      label: 'AI Scan',
      aiIcon: Brain,
      description: 'Neural Vision',
      badge: books.length > 0 ? books.length.toString() : undefined
    },
    {
      path: '/recommendations',
      icon: Heart,
      label: 'Discover',
      aiIcon: Sparkles,
      description: 'LLaMA AI',
      badge: preferences.genres.length > 0 ? preferences.genres.length.toString() : undefined
    },
    {
      path: '/reading-list',
      icon: List,
      label: 'Library',
      aiIcon: Cpu,
      description: 'Collection',
      badge: books.length > 0 ? books.length.toString() : undefined
    },
    {
      path: '/history',
      icon: History,
      label: 'History',
      aiIcon: Zap,
      description: 'Processing',
      badge: undefined
    }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-1/4 w-1 h-1 bg-purple-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-3 right-1/3 w-0.5 h-0.5 bg-blue-400/30 rounded-full animate-ping"></div>
        <div className="absolute bottom-2 left-1/2 w-0.5 h-0.5 bg-primary/40 rounded-full animate-bounce"></div>
      </div>

      <div className="bg-gradient-to-r from-card/95 via-card/90 to-primary/5 backdrop-blur-xl border-t border-primary/20 px-6 py-3 shadow-2xl relative safe-area-inset-bottom">
        {/* Thumb-friendly spacing - spread items across full width */}
        <div className="grid grid-cols-5 gap-1 w-full">
          {navItems.map(({ path, icon: Icon, label, aiIcon: AIIcon, description, badge }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex flex-col items-center justify-center px-3 py-3 rounded-2xl transition-all duration-300 group relative touch-manipulation',
                  'hover:scale-105 active:scale-95 min-h-[60px] min-w-[60px]',
                  isActive
                    ? 'text-primary bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/30 shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                )}
              >
                <div className="relative mb-1">
                  {/* Main Icon - Larger for thumb accessibility */}
                  <Icon className={cn(
                    'w-6 h-6 transition-all duration-300',
                    isActive && 'scale-110'
                  )} />

                  {/* AI Icon Overlay - More prominent */}
                  <AIIcon className={cn(
                    'absolute -top-1 -right-1 w-3.5 h-3.5 transition-all duration-300',
                    isActive
                      ? 'text-primary animate-pulse'
                      : 'text-muted-foreground/60 group-hover:text-primary/70'
                  )} />

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  )}

                  {/* Badge - Larger and more prominent */}
                  {badge && (
                    <div className={cn(
                      'absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-300',
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-muted-foreground/20 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                    )}>
                      {badge}
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <span className={cn(
                    'text-sm font-medium transition-all duration-300 block leading-tight',
                    isActive ? 'opacity-100 font-semibold' : 'opacity-75'
                  )}>
                    {label}
                  </span>
                  <span className={cn(
                    'text-[11px] transition-all duration-300 block mt-0.5 leading-tight',
                    isActive
                      ? 'text-primary/80 font-medium'
                      : 'text-muted-foreground/60 group-hover:text-muted-foreground/80'
                  )}>
                    {description}
                  </span>
                </div>

                {/* Touch-friendly overlay effects */}
                <div className={cn(
                  'absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none',
                  'group-active:bg-gradient-to-br group-active:from-primary/10 group-active:to-blue-500/10',
                  'group-hover:bg-gradient-to-br group-hover:from-primary/5 group-hover:to-blue-500/5',
                  isActive && 'bg-gradient-to-br from-primary/10 to-blue-500/10'
                )} />

                {/* Touch ripple effect */}
                <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-active:opacity-100 transition-opacity duration-150 pointer-events-none" />
              </Link>
            )
          })}
        </div>

        {/* AI Status Bar - More subtle */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-[11px] text-muted-foreground/50">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          <span className="font-medium">AI Ready</span>
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </div>
    </nav>
  )
}
