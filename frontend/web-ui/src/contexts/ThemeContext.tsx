import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read the saved choice synchronously so the first paint already uses it;
  // with no saved choice, follow the device setting
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('bookscanner-theme')
      if (stored === 'dark' || stored === 'light') return stored
    } catch {
      // storage unavailable (private mode)
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(theme)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    // Since we only have 'dark' and 'light', the theme is the resolved theme
    root.classList.add(theme)
    setResolvedTheme(theme)

    try {
      localStorage.setItem('bookscanner-theme', theme)
    } catch {
      // storage unavailable (private mode)
    }
  }, [theme])


  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function useRTL(): boolean {
  const [isRTL, setIsRTL] = useState(false)

  useEffect(() => {
    const dir = document.documentElement.getAttribute('dir')
    setIsRTL(dir === 'rtl')

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'dir') {
          const newDir = document.documentElement.getAttribute('dir')
          setIsRTL(newDir === 'rtl')
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    })

    return () => observer.disconnect()
  }, [])

  return isRTL
}
