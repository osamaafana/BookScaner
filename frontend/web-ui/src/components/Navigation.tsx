import { Link, useLocation } from 'react-router-dom'
import { Home, Heart, History, Book, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

export function Navigation() {
  const location = useLocation()

  const navItems = [
    {
      path: '/',
      icon: Home
    },
    {
      path: '/recommendations',
      icon: Heart
    },
    {
      path: '/reading-list',
      icon: Book
    },
    {
      path: '/history',
      icon: History
    },
    {
      path: '/settings',
      icon: Settings
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
          {navItems.map(({ path, icon: Icon }) => {
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
                <div className="relative">
                  {/* Main Icon - Larger for thumb accessibility */}
                  <Icon className={cn(
                    'w-6 h-6 transition-all duration-300',
                    isActive && 'scale-110'
                  )} />

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  )}
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

      </div>
    </nav>
  )
}
