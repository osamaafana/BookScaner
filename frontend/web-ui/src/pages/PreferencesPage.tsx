import { useState, useEffect } from 'react'
import { Save, RotateCcw, Palette, Book, Shield } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useTheme } from '../contexts/ThemeContext'
import { useStorage } from '../contexts/StorageContext'
import { useToast } from '../contexts/ToastContext'

interface Preferences {
  // Reading preferences
  favoriteGenres: string[]
  favoriteAuthors: string[]
  languages: string[]

  // App preferences
  theme: 'light' | 'dark'
  language: 'en' | 'ar'

  // Privacy preferences
  dataCollection: boolean
  analytics: boolean

  // Scanning preferences
  autoEnrich: boolean
  cacheResults: boolean
  groqEnabled: boolean
}

const AVAILABLE_GENRES = [
  'Fiction', 'Non-fiction', 'Mystery', 'Romance', 'Science Fiction', 'Fantasy',
  'Biography', 'History', 'Self-help', 'Business', 'Technology', 'Health',
  'Travel', 'Cooking', 'Art', 'Philosophy', 'Psychology', 'Education'
]

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' }
]

export function PreferencesPage() {
  const { theme, setTheme } = useTheme()
  const { preferences, updatePreferences } = useStorage()
  const toast = useToast()

  const [localPrefs, setLocalPrefs] = useState<Preferences>({
    favoriteGenres: [],
    favoriteAuthors: [],
    languages: ['en'],
    theme: theme,
    language: 'en',
    dataCollection: true,
    analytics: true,
    autoEnrich: true,
    cacheResults: true,
    groqEnabled: true
  })

  const [newAuthor, setNewAuthor] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        ...localPrefs,
        ...preferences,
        theme
      })
    }
  }, [preferences, theme])

  const handleGenreToggle = (genre: string) => {
    const newGenres = localPrefs.favoriteGenres.includes(genre)
      ? localPrefs.favoriteGenres.filter(g => g !== genre)
      : [...localPrefs.favoriteGenres, genre]

    setLocalPrefs({ ...localPrefs, favoriteGenres: newGenres })
    setHasChanges(true)
  }

  const handleAddAuthor = () => {
    if (newAuthor.trim() && !localPrefs.favoriteAuthors.includes(newAuthor.trim())) {
      setLocalPrefs({
        ...localPrefs,
        favoriteAuthors: [...localPrefs.favoriteAuthors, newAuthor.trim()]
      })
      setNewAuthor('')
      setHasChanges(true)
    }
  }

  const handleRemoveAuthor = (author: string) => {
    setLocalPrefs({
      ...localPrefs,
      favoriteAuthors: localPrefs.favoriteAuthors.filter(a => a !== author)
    })
    setHasChanges(true)
  }

  const handleLanguageToggle = (langCode: string) => {
    const newLanguages = localPrefs.languages.includes(langCode)
      ? localPrefs.languages.filter(l => l !== langCode)
      : [...localPrefs.languages, langCode]

    setLocalPrefs({ ...localPrefs, languages: newLanguages })
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      // Update theme if changed
      if (localPrefs.theme !== theme) {
        setTheme(localPrefs.theme)
      }

      // Save preferences to storage
      await updatePreferences(localPrefs)

      setHasChanges(false)
      toast.success('Preferences saved successfully!')
    } catch {
      toast.error('Failed to save preferences')
    }
  }

  const handleReset = () => {
    if (preferences) {
      setLocalPrefs({
        ...localPrefs,
        ...preferences,
        theme
      })
    }
    setHasChanges(false)
    toast.info('Changes discarded')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-h2">Preferences</h1>
          <p className="text-muted-foreground">
            Customize your BookScanner experience
          </p>
        </div>

        {/* Save Actions */}
        {hasChanges && (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                  <span className="text-sm font-medium">You have unsaved changes</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reading Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            <CardTitle>Reading Preferences</CardTitle>
          </div>
          <CardDescription>
            Help us recommend books you'll love
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Favorite Genres */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Favorite Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GENRES.map((genre) => (
                <Button
                  key={genre}
                  variant={localPrefs.favoriteGenres.includes(genre) ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleGenreToggle(genre)}
                  className="text-xs"
                >
                  {genre}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {localPrefs.favoriteGenres.length} genres
            </p>
          </div>

          {/* Favorite Authors */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Favorite Authors
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Add an author..."
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAuthor()}
                className="flex-1"
              />
              <Button onClick={handleAddAuthor} disabled={!newAuthor.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {localPrefs.favoriteAuthors.map((author) => (
                <Badge
                  key={author}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveAuthor(author)}
                >
                  {author} ×
                </Badge>
              ))}
            </div>
            {localPrefs.favoriteAuthors.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No favorite authors added yet
              </p>
            )}
          </div>

          {/* Reading Languages */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Reading Languages
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <Button
                  key={lang.code}
                  variant={localPrefs.languages.includes(lang.code) ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageToggle(lang.code)}
                  className="justify-start text-left"
                >
                  <span className="truncate">
                    {lang.native}
                  </span>
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {localPrefs.languages.length} languages
            </p>
          </div>
        </CardContent>
      </Card>

      {/* App Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>App Preferences</CardTitle>
          </div>
          <CardDescription>
            Customize the app appearance and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Theme
            </label>
            <div className="flex gap-2">
              {(['light', 'dark'] as const).map((themeOption) => (
                <Button
                  key={themeOption}
                  variant={localPrefs.theme === themeOption ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setLocalPrefs({ ...localPrefs, theme: themeOption })
                    setHasChanges(true)
                  }}
                  className="capitalize"
                >
                  {themeOption}
                </Button>
              ))}
            </div>
          </div>

          {/* App Language */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              App Language
            </label>
            <div className="flex gap-2">
              <Button
                variant={localPrefs.language === 'en' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setLocalPrefs({ ...localPrefs, language: 'en' })
                  setHasChanges(true)
                }}
              >
                English
              </Button>
              <Button
                variant={localPrefs.language === 'ar' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setLocalPrefs({ ...localPrefs, language: 'ar' })
                  setHasChanges(true)
                }}
              >
                العربية
              </Button>
            </div>
          </div>

          {/* Scanning Options */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Scanning Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrefs.autoEnrich}
                  onChange={(e) => {
                    setLocalPrefs({ ...localPrefs, autoEnrich: e.target.checked })
                    setHasChanges(true)
                  }}
                  className="w-4 h-4 rounded border-border"
                />
                <div>
                  <div className="text-sm font-medium">Auto-enrich books</div>
                  <div className="text-xs text-muted-foreground">
                    Automatically fetch book metadata after scanning
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrefs.cacheResults}
                  onChange={(e) => {
                    setLocalPrefs({ ...localPrefs, cacheResults: e.target.checked })
                    setHasChanges(true)
                  }}
                  className="w-4 h-4 rounded border-border"
                />
                <div>
                  <div className="text-sm font-medium">Cache scan results</div>
                  <div className="text-xs text-muted-foreground">
                    Store scan results locally for faster access
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrefs.groqEnabled}
                  onChange={(e) => {
                    setLocalPrefs({ ...localPrefs, groqEnabled: e.target.checked })
                    setHasChanges(true)
                  }}
                  className="w-4 h-4 rounded border-border"
                />
                <div>
                  <div className="text-sm font-medium">Enable Groq Vision</div>
                  <div className="text-xs text-muted-foreground">
                    Use Groq for faster but less accurate book detection (falls back to Google Vision if disabled)
                  </div>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Privacy</CardTitle>
          </div>
          <CardDescription>
            Control how your data is used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localPrefs.dataCollection}
              onChange={(e) => {
                setLocalPrefs({ ...localPrefs, dataCollection: e.target.checked })
                setHasChanges(true)
              }}
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <div className="text-sm font-medium">Data collection</div>
              <div className="text-xs text-muted-foreground">
                Allow anonymous usage data collection to improve the app
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localPrefs.analytics}
              onChange={(e) => {
                setLocalPrefs({ ...localPrefs, analytics: e.target.checked })
                setHasChanges(true)
              }}
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <div className="text-sm font-medium">Analytics</div>
              <div className="text-xs text-muted-foreground">
                Help us understand how you use BookScanner
              </div>
            </div>
          </label>
        </CardContent>
      </Card>
    </div>
  )
}
