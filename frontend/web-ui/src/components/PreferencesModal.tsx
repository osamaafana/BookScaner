import { useState } from 'react'
import { Brain, Eye, Sparkles, Info, Settings } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { useToast } from '../contexts/ToastContext'
import { cn } from '../lib/utils'

const AVAILABLE_GENRES = [
  'Science Fiction', 'Fantasy', 'Mystery', 'Romance', 'Thriller',
  'Historical Fiction', 'Literary Fiction', 'Young Adult', 'Horror',
  'Biography', 'History', 'Philosophy', 'Psychology', 'Science',
  'Technology', 'Business', 'Self Help', 'Health', 'Travel',
  'Art', 'Cooking', 'Poetry', 'Drama', 'Comedy'
]

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' }
]

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  preferences: any
  updatePreferences: (prefs: any) => Promise<void>
}

export function PreferencesModal({ isOpen, onClose, preferences, updatePreferences }: PreferencesModalProps) {
  const [localPreferences, setLocalPreferences] = useState(preferences)
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToast()

  const toggleGenre = (genre: string) => {
    setLocalPreferences((prev: any) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g: string) => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  const toggleLanguage = (langCode: string) => {
    setLocalPreferences((prev: any) => ({
      ...prev,
      languages: prev.languages.includes(langCode)
        ? prev.languages.filter((l: string) => l !== langCode)
        : [...prev.languages, langCode]
    }))
  }

  const savePreferences = async () => {
    setIsSaving(true)
    try {
      await updatePreferences(localPreferences)
      toast.success('Preferences saved')
      onClose()
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300">
      {/* Bottom Sheet - Mobile First Design */}
      <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-full duration-300">
        <Card className="rounded-t-3xl border-0 border-t border-primary/20 bg-gradient-to-br from-card/95 via-card/90 to-primary/5 backdrop-blur-xl shadow-2xl">
          {/* Handle Bar */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-12 h-1.5 bg-primary/30 rounded-full" />
          </div>

          <CardContent className="p-6 pb-8 max-h-[calc(85vh-3rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    AI Preferences
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Customize your reading experience
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-full hover:bg-primary/10"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-6">
              {/* Genre Preferences */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-semibold">Genre Preferences</h3>

                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_GENRES.map(genre => {
                    const active = localPreferences.genres.includes(genre)
                    return (
                      <Button
                        key={genre}
                        variant={active ? "primary" : "outline"}
                        onClick={() => toggleGenre(genre)}
                        className={cn(
                          "relative transition-all duration-300 group h-12 px-4 text-sm font-medium",
                          active
                            ? "bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-500/90 hover:to-blue-600/90 text-white border-0 shadow-md"
                            : "hover:bg-primary/10 hover:border-primary/50"
                        )}
                      >
                        {active && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        )}
                        <span className="truncate">{genre}</span>
                      </Button>
                    )
                  })}
                </div>

              </div>

              {/* Language Preferences */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">Language Preferences</h3>

                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {AVAILABLE_LANGUAGES.map(lang => {
                    const active = localPreferences.languages.includes(lang.code)
                    return (
                      <Button
                        key={lang.code}
                        variant={active ? "primary" : "outline"}
                        onClick={() => toggleLanguage(lang.code)}
                        className={cn(
                          "relative transition-all duration-300 group h-12 px-3 text-sm font-medium",
                          active
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-500/90 hover:to-purple-600/90 text-white border-0 shadow-md"
                            : "hover:bg-primary/10 hover:border-primary/50"
                        )}
                      >
                        {active && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        )}
                        <span className="truncate">{lang.name}</span>
                      </Button>
                    )
                  })}
                </div>

              </div>

              {/* Save Button - Mobile Optimized */}
              <div className="flex justify-center pt-6 pb-4">
                <Button
                  onClick={savePreferences}
                  disabled={isSaving}
                  className="gap-3 h-12 px-8 text-base font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl transition-all duration-300 w-full max-w-xs"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Settings className="h-5 w-5" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
