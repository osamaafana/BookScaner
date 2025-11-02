import React, { memo, useState, useRef, useEffect } from 'react'
import { Brain, BookOpen, Globe, X } from 'lucide-react'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'
import { api } from '../api/client'

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (genres: string[], languages: string[]) => void
  onSuccess?: () => void
}

export const PreferencesModal = memo<PreferencesModalProps>(({
  isOpen,
  onClose,
  onSubmit,
  onSuccess
}) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [dragStartY, setDragStartY] = useState<number>(0)
  const [dragCurrentY, setDragCurrentY] = useState<number>(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Expanded genres and languages for comprehensive preferences
  const availableGenres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction', 'Fantasy',
    'Thriller', 'Horror', 'Biography', 'History', 'Self-Help', 'Business',
    'Technology', 'Health', 'Travel', 'Cooking', 'Art', 'Music',
    'Philosophy', 'Religion', 'Poetry', 'Drama', 'Adventure', 'Comedy'
  ]

  const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
  ]

  // Handle genre selection
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    )
  }

  // Handle language selection
  const toggleLanguage = (languageCode: string) => {
    setSelectedLanguages(prev =>
      prev.includes(languageCode)
        ? prev.filter(l => l !== languageCode)
        : [...prev, languageCode]
    )
  }

  // Handle preferences submission
  const handleSubmit = async () => {
    if (selectedGenres.length === 0 || selectedLanguages.length === 0) {
      setError('Please select at least one genre and one language')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Call the optional onSubmit prop if provided
      if (typeof onSubmit === 'function') {
        await onSubmit(selectedGenres, selectedLanguages)
      } else {
        // Fallback: directly update preferences via API
        await api.updatePreferences({
          genres: selectedGenres,
          languages: selectedLanguages
        })
      }

      // Call success callback if provided
      if (typeof onSuccess === 'function') {
        onSuccess()
      }

      // Close the modal
      onClose()
    } catch (err) {
      console.error('Failed to save preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to save preferences. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Touch handlers for swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY)
    setDragCurrentY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    // Only handle drag if it's a downward swipe from the top
    const touch = e.touches[0]
    const deltaY = touch.clientY - dragStartY

    // If it's a downward drag from the top area, prevent scrolling
    if (deltaY > 0 && touch.clientY < 100) {
      e.preventDefault()
    }

    setDragCurrentY(touch.clientY)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return

    const dragDistance = dragCurrentY - dragStartY
    const threshold = 100 // Minimum drag distance to close

    if (dragDistance > threshold) {
      onClose()
    }

    setIsDragging(false)
    setDragStartY(0)
    setDragCurrentY(0)
  }

  // Load existing preferences when modal opens
  const loadExistingPreferences = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.getPreferences()

      // Handle different response structures
      let preferences: any = response

      // If response has a 'preferences' property, use that
      if (response && typeof response === 'object' && 'preferences' in response) {
        preferences = (response as { preferences: any }).preferences
      } else if (response && typeof response === 'object' && ('genres' in response || 'languages' in response)) {
        // If response is the preferences object directly
        preferences = response
      }

      // Set the loaded preferences with robust validation
      if (preferences && typeof preferences === 'object') {
        // Handle genres
        if (preferences.genres && Array.isArray(preferences.genres)) {
          const validGenres = preferences.genres.filter((genre: any) =>
            typeof genre === 'string' && genre.trim().length > 0
          )
          setSelectedGenres(validGenres)
        }

        // Handle languages
        if (preferences.languages && Array.isArray(preferences.languages)) {
          const validLanguages = preferences.languages.filter((lang: any) =>
            typeof lang === 'string' && lang.trim().length > 0
          )
          setSelectedLanguages(validLanguages)
        }
      }
    } catch {
      // Don't show error for failed preference loading - just start with empty state
      // This allows new users to set preferences even if the API call fails
    } finally {
      setIsLoading(false)
    }
  }


  // Prevent body scroll when modal is open and reset state when closed
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Focus the modal for accessibility
      modalRef.current?.focus()
      // Load existing preferences
      loadExistingPreferences()
    } else {
      document.body.style.overflow = 'unset'
      // Reset selections and error state when modal closes
      setSelectedGenres([])
      setSelectedLanguages([])
      setError(null)
      setIsSubmitting(false)
      setIsLoading(false)
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const dragOffset = isDragging ? Math.max(0, dragCurrentY - dragStartY) : 0

  return (
    <div
  className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm overscroll-contain"
  onClick={handleBackdropClick}
  style={{
    // lift content above iOS Safari toolbars / notches
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  }}
    >
      <div
  ref={modalRef}
  className="w-full max-w-md mx-2 sm:mx-4 bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl transform transition-transform duration-300 ease-out"
  style={{
    transform: `translateY(${dragOffset}px)`,
    // use small-viewport height + safe-area so it never sits under the bar
    maxHeight: 'calc(100svh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
    WebkitOverflowScrolling: 'touch',
  }}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  tabIndex={-1}
  role="dialog"
  aria-modal="true"
  aria-labelledby="preferences-title"
>
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-8 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 pb-3 sm:pb-4 relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-0 right-2 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-card/90 to-card/70 hover:from-primary/20 hover:to-blue-500/20 border-2 border-border/30 hover:border-primary/50 flex items-center justify-center transition-all duration-300 hover:scale-110 group shadow-lg hover:shadow-xl backdrop-blur-sm"
            aria-label="Close preferences modal"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          </button>

          <div className="text-center space-y-2 sm:space-y-3">
            <div className="relative mx-auto w-12 h-12 sm:w-16 sm:h-16">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border border-primary/30">
                <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </div>
            <h2 id="preferences-title" className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {isLoading ? 'Loading Preferences...' : 'Setup Preferences'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground px-2">
              {isLoading ? 'Loading your saved preferences...' :
               (selectedGenres.length > 0 || selectedLanguages.length > 0) ?
               'Your saved preferences are highlighted below' :
               'Choose your preferences for better recommendations'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6 max-h-[65vh] overflow-y-auto">
          {isLoading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-3 sm:space-y-4">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
              <p className="text-xs sm:text-sm text-muted-foreground text-center px-4">
                Loading your saved preferences...
              </p>
            </div>
          ) : (
            <>
              {/* Genres Selection */}
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  Genres
                  {selectedGenres.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-full">
                      {selectedGenres.length}
                    </span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {availableGenres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={cn(
                        "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs font-medium transition-all duration-200 relative touch-manipulation",
                        selectedGenres.includes(genre)
                          ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20"
                          : "bg-card/50 border-border hover:bg-card hover:border-primary/50 active:bg-primary/10"
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages Selection */}
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  Languages
                  {selectedLanguages.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-full">
                      {selectedLanguages.length}
                    </span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {availableLanguages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => toggleLanguage(language.code)}
                      className={cn(
                        "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs font-medium transition-all duration-200 flex items-center gap-1 relative touch-manipulation",
                        selectedLanguages.includes(language.code)
                          ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20"
                          : "bg-card/50 border-border hover:bg-card hover:border-primary/50 active:bg-primary/10"
                      )}
                    >
                      <span className="text-sm">{language.flag}</span>
                      <span className="hidden sm:inline">{language.name}</span>
                      <span className="sm:hidden">{language.code.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 border-t border-border/50">
          <div className="space-y-2 sm:space-y-3">
            {/* Error Message */}
            {error && (
              <div className="p-2 sm:p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs sm:text-sm text-destructive text-center">{error}</p>
              </div>
            )}

            <Button
              size="lg"
              className="w-full gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              onClick={handleSubmit}
              disabled={isLoading || selectedGenres.length === 0 || selectedLanguages.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">Save</span>
                </>
              ) : isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Loading...</span>
                  <span className="sm:hidden">Load</span>
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">Continue</span>
                  <span className="sm:hidden">Done</span>
                </>
              )}
            </Button>

            {selectedGenres.length === 0 || selectedLanguages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center px-2">
                Select at least one genre and one language to continue
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
})

PreferencesModal.displayName = 'PreferencesModal'
