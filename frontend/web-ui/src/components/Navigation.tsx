import { Link, useLocation } from 'react-router-dom'
import { Camera, BookOpen, Heart, History, List, Brain, Eye, Sparkles, Zap, Cpu } from 'lucide-react'
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
      path: '/results',
      icon: BookOpen,
      label: 'Results',
      aiIcon: Eye,
      description: 'Detection',
      badge: undefined
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

      <div className="bg-gradient-to-r from-card/95 via-card/90 to-primary/5 backdrop-blur-xl border-t border-primary/20 px-4 py-4 shadow-2xl relative">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map(({ path, icon: Icon, label, aiIcon: AIIcon, description, badge }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex flex-col items-center px-2 py-2 rounded-2xl transition-all duration-300 group relative',
                  'hover:scale-105 active:scale-95',
                  isActive
                    ? 'text-primary bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                )}
              >
                <div className="relative mb-1">
                  {/* Main Icon */}
                  <Icon className={cn(
                    'w-5 h-5 transition-all duration-300',
                    isActive && 'scale-110'
                  )} />

                  {/* AI Icon Overlay */}
                  <AIIcon className={cn(
                    'absolute -top-1 -right-1 w-3 h-3 transition-all duration-300',
                    isActive
                      ? 'text-primary animate-pulse'
                      : 'text-muted-foreground/60 group-hover:text-primary/70'
                  )} />

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" />
                  )}

                  {/* Badge */}
                  {badge && (
                    <div className={cn(
                      'absolute -top-2 -right-2 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-300',
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-muted-foreground/20 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                    )}>
                      {badge}
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <span className={cn(
                    'text-xs font-medium transition-all duration-300 block',
                    isActive ? 'opacity-100 font-semibold' : 'opacity-75'
                  )}>
                    {label}
                  </span>
                  <span className={cn(
                    'text-[10px] transition-all duration-300 block mt-0.5',
                    isActive
                      ? 'text-primary/80 font-medium'
                      : 'text-muted-foreground/60 group-hover:text-muted-foreground/80'
                  )}>
                    {description}
                  </span>
                </div>

                {/* Hover Effect */}
                <div className={cn(
                  'absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none',
                  'group-hover:bg-gradient-to-br group-hover:from-primary/5 group-hover:to-blue-500/5',
                  isActive && 'bg-gradient-to-br from-primary/10 to-blue-500/10'
                )} />
              </Link>
            )
          })}
        </div>

        {/* AI Status Bar */}
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
          <span>AI Systems Online</span>
          <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </div>
    </nav>
  )
}
