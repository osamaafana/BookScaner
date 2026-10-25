import { Link, useLocation } from 'react-router-dom'
import { navItems } from '../lib/nav'
import { cn } from '../lib/utils'


export function Navigation() {
  const location = useLocation()

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 safe-area-inset-bottom"
    >
      <ul className="grid grid-cols-5">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <li key={path}>
              <Link
                to={path}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors touch-manipulation',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
