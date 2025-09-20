import React from 'react'
import { useLocation } from 'react-router-dom'
import { Navigation } from './Navigation'
import { TopBar } from './TopBar'
import { cn } from '../lib/utils'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()

  // Pages that should hide navigation
  const hideNavigation = ['/onboarding'].includes(location.pathname)

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <main className={cn(
        'flex-1',
        !hideNavigation && 'pb-20 md:pb-0' // Add bottom padding for enhanced mobile nav
      )}>
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {!hideNavigation && <Navigation />}
    </div>
  )
}
